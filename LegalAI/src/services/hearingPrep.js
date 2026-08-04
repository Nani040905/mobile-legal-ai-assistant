/*
 * hearingPrep.js — Hearing preparation brief generator service.
 *
 * PURPOSE: Synthesizes case facts, arguments, and witness statements to generate a comprehensive
 * hearing brief including key facts, dates, strengths, weaknesses, likely judge/court questions,
 * opponent arguments, and documents to carry using the local LLM.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

const parseBriefViaRegex = (rawText) => {
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

  const confidenceMatch = rawText.match(/"confidence"\s*:\s*(\d+)/i);

  return {
    keyFacts: parseList('keyFacts', rawText),
    importantDates: parseList('importantDates', rawText),
    strongestArguments: parseList('strongestArguments', rawText),
    weakestPoints: parseList('weakestPoints', rawText),
    questionsOpponentMayAsk: parseList('questionsOpponentMayAsk', rawText),
    questionsCourtMayAsk: parseList('questionsCourtMayAsk', rawText),
    likelyJudgeQuestions: parseList('likelyJudgeQuestions', rawText),
    documentsToCarry: parseList('documentsToCarry', rawText),
    confidence: confidenceMatch ? Math.min(95, Math.max(30, parseInt(confidenceMatch[1], 10))) : 75
  };
};

export const prepareHearingBrief = async (caseId, perspective, onProgress) => {
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

  // If no docs, we can build a basic brief using metadata only
  const docSummaries = linkedDocs.map(d => `- Document "${d.name}": ${d.summary || 'No summary available.'}`).join('\n');
  const metadataText = `Case Title: ${caseObj.title}
Client: ${caseObj.clientName}
Court: ${caseObj.court}
Type: ${caseObj.caseType}
Status: ${caseObj.status}
Hearing Date: ${caseObj.nextHearingDate || 'Not set'}
Linked Documents:
${docSummaries}`;

  onProgress?.('Extracting document contents for hearing brief...', 1, 3);

  // Take the first chunk of up to 4 documents to synthesize detailed brief
  let docContentSnippets = '';
  let count = 0;
  for (const doc of linkedDocs) {
    if (doc.chunks && doc.chunks.length > 0 && count < 4) {
      count++;
      docContentSnippets += `\n--- CONTENT FROM "${doc.name}":\n${doc.chunks[0].substring(0, 1000)}\n`;
    }
  }

  onProgress?.('Generating hearing brief via local LLM...', 2, 3);

  const prompt = `You are a litigation strategy specialist. Prepare a detailed, comprehensive hearing preparation brief for the client perspective "${perspective}".
Analyze the case metadata and document snippets:

CASE METADATA:
${metadataText}

DOCUMENT CONTENT SAMPLES:
${docContentSnippets}

Respond ONLY in this exact JSON format with no additional text or explanations:
{
  "keyFacts": ["Fact 1", "Fact 2"],
  "importantDates": ["Date 1: event", "Date 2: event"],
  "strongestArguments": ["Argument 1", "Argument 2"],
  "weakestPoints": ["Vulnerability 1", "Vulnerability 2"],
  "questionsOpponentMayAsk": ["Opponent question 1", "Opponent question 2"],
  "questionsCourtMayAsk": ["Court/Judge question 1", "Court/Judge question 2"],
  "likelyJudgeQuestions": ["Specific judge question 1", "Specific judge question 2"],
  "documentsToCarry": ["Document name 1", "Document name 2"],
  "confidence": 85
}

Keep all lists relevant, professional, and limited to 3-5 high-quality items. If information is missing, infer logically based on standard Indian court procedures.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a litigation strategy analyst. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 800,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    onProgress?.('Finalizing brief structure...', 3, 3);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
        return {
          keyFacts: parsed.keyFacts || [],
          importantDates: parsed.importantDates || [],
          strongestArguments: parsed.strongestArguments || [],
          weakestPoints: parsed.weakestPoints || [],
          questionsOpponentMayAsk: parsed.questionsOpponentMayAsk || [],
          questionsCourtMayAsk: parsed.questionsCourtMayAsk || parsed.likelyJudgeQuestions || [],
          likelyJudgeQuestions: parsed.likelyJudgeQuestions || parsed.questionsCourtMayAsk || [],
          documentsToCarry: parsed.documentsToCarry || [],
          confidence: parsed.confidence ? Math.min(95, Math.max(30, parsed.confidence)) : 75
        };
      }
    } catch (parseErr) {
      console.warn('[HearingPrep] JSON parse failed. Falling back to regex.', parseErr);
    }
    return parseBriefViaRegex(text);
  } catch (err) {
    console.error('[HearingPrep] Generation failed:', err);
    if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
      await modelManager.handleCrash(err);
    }
    throw err;
  }
};
