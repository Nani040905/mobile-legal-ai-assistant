/*
 * opponentPredictor.js — Opponent Argument Prediction Service.
 *
 * PURPOSE: Analyzes case data and document snippets from the perspective of the opponent
 * to predict what arguments they will likely raise, counterarguments to raise in response,
 * and vulnerabilities in our case strategy using the local LLM.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

const parsePredictionViaRegex = (rawText) => {
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
    likelyArguments: parseList('likelyArguments', rawText),
    counterarguments: parseList('counterarguments', rawText),
    vulnerabilities: parseList('vulnerabilities', rawText),
    confidence: confidenceMatch ? Math.min(95, Math.max(30, parseInt(confidenceMatch[1], 10))) : 75
  };
};

export const predictOpponentArguments = async (caseId, perspective, onProgress) => {
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

  onProgress?.('Extracting case facts for opponent argument prediction...', 1, 3);

  let docContentSnippets = '';
  let count = 0;
  for (const doc of linkedDocs) {
    if (doc.chunks && doc.chunks.length > 0 && count < 4) {
      count++;
      docContentSnippets += `\n--- CONTENT FROM "${doc.name}":\n${doc.chunks[0].substring(0, 1000)}\n`;
    }
  }

  onProgress?.('Predicting opponent arguments via LLM...', 2, 3);

  const prompt = `You are a litigation strategist. Analyze this case and predict the opponent's strategy, arguments, and legal points.
Current perspective: "${perspective}" (you represent the client, so predict what the OPPONENT will say and how to counter it).

CASE DETAILS:
${metadataText}

DOCUMENT SAMPLE TEXTS:
${docContentSnippets}

Respond ONLY in this exact JSON format with no additional text or markdown formatting:
{
  "likelyArguments": ["Opponent argument 1", "Opponent argument 2"],
  "counterarguments": ["Your counterargument 1", "Your counterargument 2"],
  "vulnerabilities": ["Vulnerability/weak spot in our defense 1", "Vulnerability 2"],
  "confidence": 80
}

Keep arguments specific, legal, and tailored to the case. Do not predict outcomes (win/loss), focus only on arguments and strategy.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a litigation strategist. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    onProgress?.('Processing prediction...', 3, 3);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
        return {
          likelyArguments: parsed.likelyArguments || [],
          counterarguments: parsed.counterarguments || [],
          vulnerabilities: parsed.vulnerabilities || [],
          confidence: parsed.confidence ? Math.min(95, Math.max(30, parsed.confidence)) : 75
        };
      }
    } catch (parseErr) {
      console.warn('[OpponentPredictor] JSON parse failed. Falling back to regex.', parseErr);
    }
    return parsePredictionViaRegex(text);
  } catch (err) {
    console.error('[OpponentPredictor] Prediction failed:', err);
    if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
      await modelManager.handleCrash(err);
    }
    throw err;
  }
};
