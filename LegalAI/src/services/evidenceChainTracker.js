/*
 * evidenceChainTracker.js — Evidence chain analysis and mapping service.
 *
 * PURPOSE: Analyzes document chunks in a case to identify key factual assertions,
 * maps them to supporting evidence, lists missing evidence required to prove them,
 * and rates the strength of each assertion (STRONG, WEAK, MISSING).
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

// Regex fallback in case the LLM doesn't output clean JSON
const parseEvidenceChainViaRegex = (rawText) => {
  const items = [];
  const objectRegex = /\{[^{}]+\}/g;
  const matches = rawText.match(objectRegex);

  if (matches) {
    for (const objStr of matches) {
      const factMatch = objStr.match(/"fact"\s*:\s*"([^"]+)"/i);
      const supportMatch = objStr.match(/"supportingEvidence"\s*:\s*"([^"]+)"/i);
      const missingMatch = objStr.match(/"missingEvidence"\s*:\s*"([^"]+)"/i);
      const statusMatch = objStr.match(/"status"\s*:\s*"([^"]+)"/i);

      if (factMatch) {
        items.push({
          fact: factMatch[1].trim(),
          supportingEvidence: supportMatch ? supportMatch[1].trim() : 'No supporting evidence found.',
          missingEvidence: missingMatch ? missingMatch[1].trim() : 'No missing evidence identified.',
          status: (statusMatch && ['STRONG', 'WEAK', 'MISSING'].includes(statusMatch[1].toUpperCase()))
            ? statusMatch[1].toUpperCase()
            : 'WEAK'
        });
      }
    }
  }
  return items;
};

/**
 * Extracts facts and evidence details from a document's chunks.
 */
const extractEvidenceChainFromDoc = async (context, chunks, docName, onChunkProgress) => {
  const docItems = [];
  const chunksToProcess = chunks.slice(0, 5); // Limit to 5 chunks to keep execution fast
  let chunkIndex = 0;

  for (const chunk of chunksToProcess) {
    chunkIndex++;
    onChunkProgress?.(chunkIndex, chunksToProcess.length);

    const prompt = `You are a legal analyst. Analyze the following document section (chunk ${chunkIndex}) from "${docName}".
Extract key legal facts or factual assertions made. For each fact:
1. Identify any supporting evidence within the document (witness statements, memos, recovery lists, reports).
2. Identify what crucial evidence is missing or needed to substantiate this fact (e.g. CCTV, forensics, recovery weapon, independent witness).
3. Classify its evidentiary strength:
   - STRONG: Fully backed by clear documentary or physical evidence.
   - WEAK: Backed only by verbal statements/hearsay or contradicts other facts.
   - MISSING: Asserted but has no supporting evidence whatsoever.

Document Section:
"""
${chunk.substring(0, 1500)}
"""

Respond ONLY in this exact JSON format with no extra text:
{
  "items": [
    {
      "fact": "Factual assertion/claim",
      "supportingEvidence": "Summary of supporting evidence found in document",
      "missingEvidence": "What evidence is missing or needed to support this",
      "status": "STRONG"
    }
  ]
}

If no clear legal facts are found, return {"items": []}.`;

    try {
      await context.clearCache();
      const result = await context.completion({
        messages: [
          { role: 'system', content: 'You are a legal evidence analyst. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        n_predict: 512,
        stop: STOP_WORDS,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 20
      });

      const text = result.text.trim();
      let extracted = [];

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
          if (parsed.items && Array.isArray(parsed.items)) {
            extracted = parsed.items;
          } else if (parsed.fact && parsed.status) {
            extracted = [parsed];
          }
        } else {
          extracted = parseEvidenceChainViaRegex(text);
        }
      } catch (parseErr) {
        console.warn(`[EvidenceChain] JSON parse failed for ${docName} chunk ${chunkIndex}. Falling back to regex.`, parseErr);
        extracted = parseEvidenceChainViaRegex(text);
      }

      for (const item of extracted) {
        if (item.fact && item.status) {
          docItems.push({
            fact: item.fact.trim(),
            supportingEvidence: item.supportingEvidence ? item.supportingEvidence.trim() : 'No supporting evidence found.',
            missingEvidence: item.missingEvidence ? item.missingEvidence.trim() : 'No missing evidence identified.',
            status: item.status.toUpperCase().trim(),
            docSource: docName
          });
        }
      }
    } catch (err) {
      console.error(`[EvidenceChain] Extraction failed for chunk ${chunkIndex} in ${docName}:`, err);
      if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
        await modelManager.handleCrash(err);
      }
    }
  }

  return docItems;
};

/**
 * Builds the complete evidence chain report for the case.
 */
export const buildEvidenceChain = async (caseId, onProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const caseObj = useCaseStore.getState().getCaseById(caseId);
  if (!caseObj) {
    throw new Error('Case folder not found.');
  }

  const documentIds = caseObj.documents || [];
  if (documentIds.length === 0) {
    return { items: [], confidence: 50 };
  }

  const allDocuments = useDocumentStore.getState().documents;
  const linkedDocs = allDocuments.filter(d => documentIds.includes(d.id));

  if (linkedDocs.length === 0) {
    return { items: [], confidence: 50 };
  }

  const allItems = [];
  let processedDocs = 0;

  for (const doc of linkedDocs) {
    processedDocs++;
    if (!doc.chunks || doc.chunks.length === 0) continue;

    const docItems = await extractEvidenceChainFromDoc(
      context,
      doc.chunks,
      doc.name,
      (currentChunk, totalChunks) => {
        onProgress?.(
          `Mapping evidence from "${doc.name}" (chunk ${currentChunk}/${totalChunks})...`,
          processedDocs,
          linkedDocs.length
        );
      }
    );

    allItems.push(...docItems);
  }

  // Compute confidence score based on strong facts ratio
  let confidence = 50;
  if (allItems.length > 0) {
    const strongCount = allItems.filter(item => item.status === 'STRONG').length;
    confidence = Math.round((strongCount / allItems.length) * 100);
    // Bind between 30 and 95
    confidence = Math.max(30, Math.min(95, confidence));
  }

  return {
    items: allItems,
    confidence
  };
};
