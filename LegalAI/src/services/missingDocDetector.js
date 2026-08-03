/*
 * missingDocDetector.js — Missing Document Detector Service.
 *
 * PURPOSE: Analyzes a case's linked documents, classifies them into legal types
 * using a fast name-based check and LLM content classification, and compares them
 * against static case-type required checklists to find what is missing.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

const REQUIRED_CHECKLISTS = {
  criminal: ['FIR', 'Charge Sheet', 'Bail Order', 'Witness Statements', 'FSL Report'],
  civil: ['Plaint', 'Written Statement', 'Replication', 'Documents List'],
  consumer: ['Complaint', 'Reply', 'Bills/Receipts', 'Warranty Card'],
  default: ['Legal Notice', 'Reply', 'Case Notes', 'Supporting Documents']
};

/**
 * Normalizes text for easy matching.
 */
const normalizeText = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Attempts to match a document to a checklist type based on name.
 */
const matchTypeByName = (name) => {
  const normName = normalizeText(name);
  if (normName.includes('fir') || normName.includes('firstinformationreport')) return 'FIR';
  if (normName.includes('chargesheet') || normName.includes('charge')) return 'Charge Sheet';
  if (normName.includes('bail') || normName.includes('bailorder')) return 'Bail Order';
  if (normName.includes('witnessstatement') || normName.includes('witness') || normName.includes('statement')) return 'Witness Statements';
  if (normName.includes('fsl') || normName.includes('forensic') || normName.includes('labreport')) return 'FSL Report';
  if (normName.includes('plaint')) return 'Plaint';
  if (normName.includes('writtenstatement') || normName.includes('ws')) return 'Written Statement';
  if (normName.includes('replication')) return 'Replication';
  if (normName.includes('documentslist') || normName.includes('listofdocs')) return 'Documents List';
  if (normName.includes('complaint')) return 'Complaint';
  if (normName.includes('reply')) return 'Reply';
  if (normName.includes('bill') || normName.includes('receipt') || normName.includes('invoice')) return 'Bills/Receipts';
  if (normName.includes('warranty') || normName.includes('guarantee')) return 'Warranty Card';
  if (normName.includes('notice') || normName.includes('legalnotice')) return 'Legal Notice';
  if (normName.includes('casenote') || normName.includes('notes')) return 'Case Notes';
  return null;
};

/**
 * Uses LLM to classify document type based on its text snippet.
 */
const classifyDocWithLLM = async (context, docName, docText) => {
  const prompt = `You are a legal assistant. Analyze the first few lines of a document to classify its legal document type.
Allowed types: FIR, Charge Sheet, Bail Order, Witness Statements, FSL Report, Plaint, Written Statement, Replication, Documents List, Complaint, Reply, Bills/Receipts, Warranty Card, Legal Notice, Case Notes, Supporting Documents.

Document Name: "${docName}"
Document text sample:
"""
${docText.substring(0, 1000)}
"""

Respond ONLY in this exact JSON format with no extra text:
{
  "classifiedType": "Type from the allowed list"
}

If you are unsure or it does not match any type closely, return {"classifiedType": "Supporting Documents"}.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal document classifier. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 128,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
      if (parsed.classifiedType) {
        return parsed.classifiedType;
      }
    }
  } catch (err) {
    console.warn(`[MissingDocDetector] LLM classification failed for ${docName}:`, err);
  }
  return 'Supporting Documents';
};

/**
 * Scans the linked case files and returns the missing/present documents report.
 */
export const detectMissingDocuments = async (caseId, onProgress) => {
  const caseObj = useCaseStore.getState().getCaseById(caseId);
  if (!caseObj) {
    throw new Error('Case folder not found.');
  }

  const caseType = caseObj.caseType || 'unknown';
  const expectedChecklist = REQUIRED_CHECKLISTS[caseType] || REQUIRED_CHECKLISTS.default;

  const documentIds = caseObj.documents || [];
  const allDocs = useDocumentStore.getState().documents;
  const linkedDocs = allDocs.filter(d => documentIds.includes(d.id));

  // Initialize checklist items as missing
  const reportChecklist = expectedChecklist.map(type => ({
    type,
    required: true,
    present: false,
    matchedDocId: null,
    matchedDocName: null
  }));

  if (linkedDocs.length === 0) {
    return {
      checklist: reportChecklist,
      summary: `0 of ${expectedChecklist.length} required documents present`
    };
  }

  const context = modelManager.getContext();
  let docIndex = 0;

  for (const doc of linkedDocs) {
    docIndex++;
    onProgress?.(
      `Analyzing "${doc.name}" (${docIndex}/${linkedDocs.length})...`,
      docIndex,
      linkedDocs.length
    );

    // 1. Try fast name match
    let matchedType = matchTypeByName(doc.name);

    // 2. If name doesn't match and we have LLM + text, use LLM content classification
    if (!matchedType && context && doc.extractedText) {
      matchedType = await classifyDocWithLLM(context, doc.name, doc.extractedText);
    }

    if (matchedType) {
      // Find matching required item in checklist
      const item = reportChecklist.find(c => c.type === matchedType && !c.present);
      if (item) {
        item.present = true;
        item.matchedDocId = doc.id;
        item.matchedDocName = doc.name;
      } else {
        // If not in standard checklist or already filled, append it as custom present doc
        reportChecklist.push({
          type: matchedType,
          required: false,
          present: true,
          matchedDocId: doc.id,
          matchedDocName: doc.name
        });
      }
    } else {
      // Unclassified present document
      reportChecklist.push({
        type: 'Supporting Documents',
        required: false,
        present: true,
        matchedDocId: doc.id,
        matchedDocName: doc.name
      });
    }
  }

  const requiredItems = reportChecklist.filter(item => item.required);
  const presentRequired = requiredItems.filter(item => item.present).length;
  const summary = `${presentRequired} of ${requiredItems.length} required documents present`;

  return {
    checklist: reportChecklist,
    summary
  };
};
