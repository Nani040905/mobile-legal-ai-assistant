/*
 * contradictionDetector.js — Whole-case cross-document contradiction scanner.
 *
 * PURPOSE: Extracts factual claims from all documents in a case, then compares
 * them cross-document to identify inconsistencies (e.g. conflicting dates,
 * names, locations, or descriptions) using the on-device LLM.
 */

import modelManager from './modelManager';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

const parseContradictionsViaRegex = (rawText) => {
  const contradictions = [];
  const objectRegex = /\{[^{}]+\}/g;
  const matches = rawText.match(objectRegex);
  if (matches) {
    for (const objStr of matches) {
      const topicMatch = objStr.match(/"topic"\s*:\s*"([^"]+)"/i);
      const stmtAMatch = objStr.match(/"statementA"\s*:\s*"([^"]+)"/i);
      const docAMatch = objStr.match(/"docSourceA"\s*:\s*"([^"]+)"/i);
      const stmtBMatch = objStr.match(/"statementB"\s*:\s*"([^"]+)"/i);
      const docBMatch = objStr.match(/"docSourceB"\s*:\s*"([^"]+)"/i);
      const sevMatch = objStr.match(/"severity"\s*:\s*"([^"]+)"/i);

      if (topicMatch && stmtAMatch && stmtBMatch) {
        contradictions.push({
          topic: topicMatch[1].trim(),
          statementA: stmtAMatch[1].trim(),
          docSourceA: docAMatch ? docAMatch[1].trim() : 'Unknown Doc A',
          statementB: stmtBMatch[1].trim(),
          docSourceB: docBMatch ? docBMatch[1].trim() : 'Unknown Doc B',
          severity: (sevMatch && ['HIGH', 'MEDIUM', 'LOW'].includes(sevMatch[1].toUpperCase())) 
            ? sevMatch[1].toUpperCase() 
            : 'MEDIUM'
        });
      }
    }
  }
  return contradictions;
};

const extractFactsFromChunk = async (context, chunk, docName) => {
  const prompt = `You are a legal assistant. Analyze the following document section from "${docName}".
Extract key factual statements, assertions, claims, dates, times, names, or event descriptions.
For each fact, write it as a single concise bullet point.

Document Section:
"""
${chunk.substring(0, 1500)}
"""

List up to 4 key facts. Do not write introductory text. Example format:
- Factual Claim: Accused was at the crime scene at 9:00 PM.
- Factual Claim: FIR was registered by Officer Sharma.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal assistant. Extract factual assertions.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 256,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 5);
  } catch (e) {
    console.warn(`[ContradictionDetector] Fact extraction failed for chunk in ${docName}:`, e);
    return [];
  }
};

export const detectContradictions = async (documents, onProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const allFactualClaims = [];
  const totalDocs = documents.length;

  if (totalDocs < 2) {
    throw new Error('Please link at least two documents to compare for contradictions.');
  }

  // 1. Extract facts from each document chunk
  let docCount = 0;
  for (const doc of documents) {
    docCount++;
    if (!doc.chunks || doc.chunks.length === 0) continue;
    
    // Scan up to first 4 chunks of each document to keep it fast and prevent context blowout
    const chunksToProcess = doc.chunks.slice(0, 4);
    let chunkIndex = 0;
    for (const chunk of chunksToProcess) {
      chunkIndex++;
      onProgress?.(
        `Extracting facts from "${doc.name}" (chunk ${chunkIndex}/${chunksToProcess.length})...`,
        docCount,
        totalDocs
      );

      const facts = await extractFactsFromChunk(context, chunk, doc.name);
      for (const fact of facts) {
        allFactualClaims.push({
          docName: doc.name,
          factText: fact
        });
      }
    }
  }

  if (allFactualClaims.length === 0) {
    return { contradictions: [], confidence: 50 };
  }

  // 2. Format factual claims list for comparison
  const claimsListFormatted = allFactualClaims
    .map((item, index) => `${index + 1}. [Source: ${item.docName}] ${item.factText}`)
    .join('\n');

  onProgress?.('Comparing facts cross-document to detect contradictions...', totalDocs, totalDocs);

  const comparePrompt = `You are a senior legal auditor. Analyze the following list of factual claims extracted from different documents in the same case. 
Identify any contradictions, direct conflicts, discrepancies, or inconsistent statements (e.g. conflicting dates, times, locations, witness accounts, name spellings, or amounts).

Factual Claims List:
"""
${claimsListFormatted.substring(0, 3000)}
"""

For each contradiction found, determine if it is:
- HIGH severity: Critical contradictions (e.g. contradictory alibis, conflicting cause of death, contrasting witness statements on core events).
- MEDIUM severity: Moderate discrepancies (e.g. different times of same event by a few hours, spelling of names, minor location variance).
- LOW severity: Minor variations that are likely clerical.

Respond ONLY in this exact JSON format with no extra text:
{
  "contradictions": [
    {
      "topic": "Brief description of the conflict topic",
      "statementA": "Factual statement A from the list",
      "docSourceA": "Source Document name of statement A",
      "statementB": "Factual statement B from the list",
      "docSourceB": "Source Document name of statement B",
      "severity": "HIGH"
    }
  ]
}

If no contradictions or inconsistencies are found, return {"contradictions": []}.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal auditor. Respond ONLY with valid JSON. No markdown, no explanations.' },
        { role: 'user', content: comparePrompt }
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    let contradictions = [];
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
        if (parsed.contradictions && Array.isArray(parsed.contradictions)) {
          contradictions = parsed.contradictions;
        }
      } else {
        contradictions = parseContradictionsViaRegex(text);
      }
    } catch (parseErr) {
      console.warn('[ContradictionDetector] JSON parsing failed. Using regex fallback.', parseErr);
      contradictions = parseContradictionsViaRegex(text);
    }

    // Clean up results
    const cleanContradictions = contradictions.filter(
      c => c.topic && c.statementA && c.statementB
    );

    // Compute confidence
    let confidence = 60;
    if (cleanContradictions.length > 0) {
      confidence += 15;
    }
    if (totalDocs >= 3) {
      confidence += 10;
    }
    confidence = Math.min(95, confidence);

    return {
      contradictions: cleanContradictions,
      confidence
    };
  } catch (e) {
    console.error('[ContradictionDetector] Comparison run failed:', e);
    if (!(e instanceof SyntaxError) && !e.message?.includes('JSON')) {
      await modelManager.handleCrash(e);
    }
    throw e;
  }
};
