/*
 * draftGenerator.js — Legal Draft Template Generator Service.
 *
 * PURPOSE: Customizes and writes formal legal drafts (notices, petitions, complaints)
 * based on case facts, client details, and templates using the local LLM.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

export const DRAFT_TEMPLATES = {
  legal_notice: 'Legal Notice (Dues Recovery/Breach)',
  consumer_complaint: 'Consumer Complaint',
  reply_notice: 'Reply Notice',
  rti_application: 'RTI Application (Section 6(1))',
  affidavit: 'General Affidavit',
  bail_petition: 'Bail Petition (Section 437/439 CrPC)',
  written_statement: 'Written Statement (Civil Suit Reply)'
};

export const generateLegalDraft = async (caseId, templateType, customInputs = {}, onProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  let caseObj = null;
  if (caseId) {
    caseObj = useCaseStore.getState().getCaseById(caseId);
  }

  onProgress?.('Preparing draft metadata...', 1, 3);

  const clientName = customInputs.clientName || caseObj?.clientName || '[Client Name]';
  const opponentName = customInputs.opponentName || caseObj?.opponentName || '[Opponent Name]';
  const courtName = customInputs.court || caseObj?.court || '[Court/Jurisdiction]';
  const caseNumber = customInputs.caseNumber || caseObj?.caseNumber || '[Case Number]';
  
  let caseFacts = customInputs.facts || '';
  if (!caseFacts && caseObj) {
    const documentIds = caseObj.documents || [];
    const allDocs = useDocumentStore.getState().documents;
    const linkedDocs = allDocs.filter(d => documentIds.includes(d.id));
    caseFacts = linkedDocs.map(d => d.summary || '').join(' ').substring(0, 1500);
  }
  if (!caseFacts) {
    caseFacts = '[Enter key dispute facts here]';
  }

  const templateName = DRAFT_TEMPLATES[templateType] || 'Legal Notice';
  onProgress?.('Structuring template draft...', 2, 3);

  const prompt = `You are a senior advocate in India. Draft a formal, structured legal document of type "${templateName}" based on the details below.

DETAILS:
- Client / Sender: ${clientName}
- Opponent / Recipient: ${opponentName}
- Court / Forum: ${courtName}
- Case Reference Number: ${caseNumber}
- Key Facts / Subject Matter: ${caseFacts}

INSTRUCTIONS:
1. Write a complete, professional, and formal legal draft.
2. Use standard Indian legal styling: uppercase headings, numbered paragraphs, formal legal phrasing, and clear requests/prayers.
3. Include standard preambles, jurisdiction clauses, and signature blocks.
4. Output ONLY the drafted document text with no conversational preamble or postscript.

Draft text:`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are an expert advocate. Write formal legal drafts.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 800,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    onProgress?.('Finalizing draft compilation...', 3, 3);
    return result.text.trim();
  } catch (err) {
    console.error('[DraftGenerator] Draft generation failed:', err);
    if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
      await modelManager.handleCrash(err);
    }
    throw err;
  }
};
