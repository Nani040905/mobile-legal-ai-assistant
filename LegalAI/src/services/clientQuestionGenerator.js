/*
 * clientQuestionGenerator.js — Client Question Generator Service.
 *
 * PURPOSE: Analyzes case files, facts, and checklists to draft clarifying questions
 * to ask the client, pinpoint critical missing evidence the client must fetch,
 * and define urgent items to act upon using the local LLM.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

const parseQuestionsViaRegex = (rawText) => {
  const parseList = (sectionName, text) => {
    const sectionRegex = new RegExp(`"${sectionName}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const match = text.match(sectionRegex);
    if (match) {
      const itemsText = match[1];
      const itemRegex = /"([^"]+)"/g;
      const items = [];
      let m;
      while ((m = itemRegex.exec(itemsText)) !== null) {
        items.push(m[1].trim());
      }
      return items;
    }
    return [];
  };

  return {
    questions: parseList('questions', rawText),
    evidenceNeeded: parseList('evidenceNeeded', rawText),
    urgentItems: parseList('urgentItems', rawText)
  };
};

export const generateClientQuestions = async (caseId, onProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const caseObj = useCaseStore.getState().getCaseById(caseId);
  if (!caseObj) {
    throw new Error('Case not found.');
  }

  const documentIds = caseObj.documents || [];
  const allDocs = useDocumentStore.getState().documents;
  const linkedDocs = allDocs.filter(d => documentIds.includes(d.id));

  const docSummaries = linkedDocs.map(d => `- Document "${d.name}": ${d.summary || 'No summary available.'}`).join('\n');
  const metadataText = `Case Title: ${caseObj.title}
Client: ${caseObj.clientName}
Court: ${caseObj.court}
Type: ${caseObj.caseType}
Status: ${caseObj.status}
Linked Documents:
${docSummaries}`;

  onProgress?.('Extracting case files to draft questions...', 1, 3);

  let docContentSnippets = '';
  let count = 0;
  for (const doc of linkedDocs) {
    if (doc.chunks && doc.chunks.length > 0 && count < 4) {
      count++;
      docContentSnippets += `\n--- CONTENT FROM "${doc.name}":\n${doc.chunks[0].substring(0, 1000)}\n`;
    }
  }

  onProgress?.('Drafting client questions via local LLM...', 2, 3);

  const prompt = `You are a legal advisor preparing for a client interview. Analyze the case folder details and identify factual gaps, ambiguities, missing records, or inconsistencies.
Generate a list of questions to ask the client, key evidence/memos/receipts needed, and urgent task items.

CASE DETAILS:
${metadataText}

DOCUMENT TEXT SNIPPETS:
${docContentSnippets}

Respond ONLY in this exact JSON format with no additional text:
{
  "questions": ["Question 1 about fact gap", "Question 2 about date discrepancy"],
  "evidenceNeeded": ["Missing doc/receipt to request from client 1", "Certificate needed 2"],
  "urgentItems": ["Urgent task 1", "Urgent task 2"]
}

Limit the lists to 3-5 action-focused, specific items. Make sure questions directly relate to finding missing case facts.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a client interview builder. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    onProgress?.('Processing client interview brief...', 3, 3);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
        return {
          questions: parsed.questions || [],
          evidenceNeeded: parsed.evidenceNeeded || [],
          urgentItems: parsed.urgentItems || []
        };
      }
    } catch (parseErr) {
      console.warn('[ClientQuestions] JSON parse failed. Falling back to regex.', parseErr);
    }
    return parseQuestionsViaRegex(text);
  } catch (err) {
    console.error('[ClientQuestions] Generation failed:', err);
    if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
      await modelManager.handleCrash(err);
    }
    throw err;
  }
};
