
import modelManager from './modelManager';
import { PERSPECTIVE_FOCUS } from '../types/legalPerspective';
import { CASE_TYPE_FOCUS } from '../types/caseType';



const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];


















let activeCache = null;

const buildPerspectivePrefix = (perspective, caseType) => {
  const focusList = CASE_TYPE_FOCUS[caseType].map((f) => `- ${f}`).join('\n');
  return `Perspective: ${perspective.charAt(0).toUpperCase() + perspective.slice(1)}
Case Type: ${caseType.charAt(0).toUpperCase() + caseType.slice(1)}
${PERSPECTIVE_FOCUS[perspective]}

Focus specifically on:
${focusList}`;
};

const extractUnifiedDataViaRegex = (
rawText,
chunkIndex) =>
{
  const highRisk = [];
  const mediumRisk = [];
  const missingClauses = [];
  const strongEvidence = [];
  const weakEvidence = [];
  const missingEvidence = [];

  const extractObjects = (sectionKey) => {
    const list = [];
    const sectionRegex = new RegExp(`"${sectionKey}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
    const sectionMatch = rawText.match(sectionRegex);
    if (sectionMatch) {
      const arrayContent = sectionMatch[1];
      const objectRegex = /\{[^{}]+\}/g;
      const objects = arrayContent.match(objectRegex);
      if (objects) {
        for (const objStr of objects) {
          const clauseMatch = objStr.match(/"clause"\s*:\s*"([^"]+)"/i);
          const itemMatch = objStr.match(/"item"\s*:\s*"([^"]+)"/i);
          const expMatch = objStr.match(/"explanation"\s*:\s*"([^"]+)"/i);
          const refMatch = objStr.match(/"reference"\s*:\s*"([^"]+)"/i);

          if (clauseMatch && expMatch) {
            list.push({
              clause: clauseMatch[1].trim(),
              explanation: expMatch[1].trim()
            });
          } else if (itemMatch) {
            list.push({
              item: itemMatch[1].trim(),
              reference: refMatch ? refMatch[1].trim() : ''
            });
          }
        }
      }
    }
    return list;
  };

  const highList = extractObjects('highRisk');
  for (const item of highList) {
    highRisk.push({
      chunkIndex,
      level: 'high',
      clause: item.clause,
      explanation: item.explanation
    });
  }

  const medList = extractObjects('mediumRisk');
  for (const item of medList) {
    mediumRisk.push({
      chunkIndex,
      level: 'medium',
      clause: item.clause,
      explanation: item.explanation
    });
  }

  const strongList = extractObjects('strongEvidence') || extractObjects('strong');
  for (const item of strongList) {
    strongEvidence.push({
      chunkIndex,
      item: item.item,
      reference: item.reference
    });
  }

  const weakList = extractObjects('weakEvidence') || extractObjects('weak');
  for (const item of weakList) {
    weakEvidence.push({
      chunkIndex,
      item: item.item,
      reference: item.reference
    });
  }

  const extractStrings = (sectionKey) => {
    const list = [];
    const sectionRegex = new RegExp(`"${sectionKey}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
    const sectionMatch = rawText.match(sectionRegex);
    if (sectionMatch) {
      const arrayContent = sectionMatch[1];
      const stringRegex = /"([^"]+)"/g;
      let match;
      while ((match = stringRegex.exec(arrayContent)) !== null) {
        list.push(match[1].trim());
      }
    }
    return list;
  };

  missingClauses.push(...extractStrings('missingClauses'));
  missingClauses.push(...extractStrings('missing'));
  missingEvidence.push(...extractStrings('missingEvidence'));

  return {
    highRisk,
    mediumRisk,
    missingClauses,
    strongEvidence,
    weakEvidence,
    missingEvidence
  };
};

const analyzeChunkUnified = async (
context,
chunk,
chunkIndex,
perspectivePrefix) =>
{
  const prompt = `${perspectivePrefix}

Analyze the following legal document section (chunk ${chunkIndex + 1}) to identify risks, missing clauses, and quality of evidence.

Document Section:
"""
${chunk.substring(0, 1200)}
"""

CRITICAL RULES:
1. Identify high/medium risks (clause quote + explanation).
2. Identify strong evidence (signed documents, receipts, certificates) and weak evidence (verbal references, unsigned/undated copies).
3. Identify missing critical clauses or missing evidence.

Respond ONLY in this exact JSON format with no extra text:
{
  "highRisk": [{"clause": "quote/desc", "explanation": "explanation"}],
  "mediumRisk": [{"clause": "quote/desc", "explanation": "explanation"}],
  "missingClauses": ["provision name"],
  "strongEvidence": [{"item": "evidence desc", "reference": "clause ref"}],
  "weakEvidence": [{"item": "evidence desc", "reference": "clause ref"}],
  "missingEvidence": ["evidence type absent"]
}

If nothing is found, return empty arrays. Keep descriptions and explanations under 50 words.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal document auditor. Respond ONLY with valid JSON. No markdown, no conversational text.' },
      { role: 'user', content: prompt }],

      n_predict: 384,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[UnifiedAnalyzer] No JSON found for chunk ${chunkIndex}. Attempting regex on raw output.`);
      return extractUnifiedDataViaRegex(text, chunkIndex);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      const highRisk = (parsed.highRisk || []).map((item) => ({
        chunkIndex,
        level: 'high',
        clause: item.clause || '',
        explanation: item.explanation || ''
      }));

      const mediumRisk = (parsed.mediumRisk || []).map((item) => ({
        chunkIndex,
        level: 'medium',
        clause: item.clause || '',
        explanation: item.explanation || ''
      }));

      const missingClauses = (parsed.missingClauses || parsed.missing || []).filter((s) => typeof s === 'string');

      const strongEvidence = (parsed.strongEvidence || parsed.strong || []).map((item) => ({
        chunkIndex,
        item: item.item || '',
        reference: item.reference || ''
      }));

      const weakEvidence = (parsed.weakEvidence || parsed.weak || []).map((item) => ({
        chunkIndex,
        item: item.item || '',
        reference: item.reference || ''
      }));

      const missingEvidence = (parsed.missingEvidence || []).filter((s) => typeof s === 'string');

      return {
        highRisk,
        mediumRisk,
        missingClauses,
        strongEvidence,
        weakEvidence,
        missingEvidence
      };
    } catch (parseErr) {
      console.warn(`[UnifiedAnalyzer] JSON parse error on chunk ${chunkIndex}. Fallback to regex. Error:`, parseErr.message);
      return extractUnifiedDataViaRegex(jsonMatch[0], chunkIndex);
    }
  } catch (e) {
    console.error(`[UnifiedAnalyzer] Completion failed for chunk ${chunkIndex}:`, e);
    // Let the manager handle crash recovery if it's a native execution crash
    if (!(e instanceof SyntaxError) && !e.message?.includes('JSON')) {
      await modelManager.handleCrash(e);
    }
    return {
      highRisk: [],
      mediumRisk: [],
      missingClauses: [],
      strongEvidence: [],
      weakEvidence: [],
      missingEvidence: []
    };
  }
};






const groupChunks = (chunks, maxChars = 6000) => {
  const grouped = [];
  let currentText = '';
  let startIndex = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (currentText.length + chunk.length + 2 > maxChars) {
      if (currentText) {
        grouped.push({ text: currentText, startIndex });
      }
      currentText = chunk;
      startIndex = i;
    } else {
      currentText = currentText ? `${currentText}\n\n${chunk}` : chunk;
    }
  }

  if (currentText) {
    grouped.push({ text: currentText, startIndex });
  }

  return grouped;
};

export const runUnifiedAnalysis = async (
chunks,
perspective,
caseType,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  // Check if active cache matches current run
  const firstChunk = chunks.length > 0 ? chunks[0] : '';
  if (
  activeCache &&
  activeCache.firstChunk === firstChunk &&
  activeCache.chunksLength === chunks.length &&
  activeCache.perspective === perspective &&
  activeCache.caseType === caseType)
  {
    console.log('[UnifiedAnalyzer] Cache hit! Reusing previous analysis results.');
    return activeCache.results;
  }

  console.log('[UnifiedAnalyzer] Cache miss. Grouping chunks to speed up inference...');
  const grouped = groupChunks(chunks, 6000);
  const perspectivePrefix = buildPerspectivePrefix(perspective, caseType);
  const results = [];
  const total = grouped.length;

  for (let i = 0; i < total; i++) {
    onProgress?.(`Auditing document section ${i + 1} of ${total}...`, i + 1, total);
    const chunkResult = await analyzeChunkUnified(context, grouped[i].text, grouped[i].startIndex, perspectivePrefix);
    results.push(chunkResult);
  }

  // Populate cache
  activeCache = {
    firstChunk,
    chunksLength: chunks.length,
    perspective,
    caseType,
    results
  };

  return results;
};