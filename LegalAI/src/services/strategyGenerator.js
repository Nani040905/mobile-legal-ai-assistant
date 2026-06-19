/*
 * strategyGenerator.ts — Legal strategy generator service with chunk-by-chunk batch audit.
 *
 * PURPOSE: Scans document chunks sequentially to analyze strengths, weaknesses,
 * possible arguments, and evidence needs for the selected perspective & case type.
 * Aggregates these points and uses a final LLM run to synthesize a unified
 * LegalStrategy report complete with confidence scores and copyable lawyer questions.
 */


import modelManager from './modelManager';
import { PERSPECTIVE_FOCUS } from '../types/legalPerspective';
import { CASE_TYPE_FOCUS } from '../types/caseType';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];















const buildPerspectivePrefix = (perspective, caseType) => {
  const focusList = CASE_TYPE_FOCUS[caseType].map((f) => `- ${f}`).join('\n');
  return `Perspective: ${perspective.charAt(0).toUpperCase() + perspective.slice(1)}
Case Type: ${caseType.charAt(0).toUpperCase() + caseType.slice(1)}
${PERSPECTIVE_FOCUS[perspective]}

Focus specifically on:
${focusList}`;
};

const scanChunkStrategy = async (
context,
chunk,
chunkIndex,
perspectivePrefix) =>
{
  const prompt = `${perspectivePrefix}

Analyze the following legal document section (chunk ${chunkIndex + 1}) to identify strategic benefits, challenges, evidence requirements, and viable legal arguments.

Document Section:
"""
${chunk.substring(0, 1200)}
"""

Respond ONLY in this exact JSON format with no extra text:
{
  "strengths": ["key benefit, claim or favorable provision"],
  "weaknesses": ["disadvantage, exposure, loophole or unfavorable term"],
  "evidenceNeeded": ["document, proof, receipt or witness required to back this up"],
  "possibleArguments": ["legal point or argument that can be raised in our favor"]
}

If nothing is found, return empty arrays. Keep each item under 30 words.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal strategy analyst. Respond ONLY with valid JSON matching the requested format. No markdown, no explanations outside JSON.' },
      { role: 'user', content: prompt }],

      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[StrategyGenerator] No JSON block found in raw output for chunk ${chunkIndex}. Raw:`, text);
      return { strengths: [], weaknesses: [], evidenceNeeded: [], possibleArguments: [] };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        strengths: (parsed.strengths || []).filter((s) => typeof s === 'string'),
        weaknesses: (parsed.weaknesses || []).filter((s) => typeof s === 'string'),
        evidenceNeeded: (parsed.evidenceNeeded || []).filter((s) => typeof s === 'string'),
        possibleArguments: (parsed.possibleArguments || []).filter((s) => typeof s === 'string')
      };
    } catch (parseErr) {
      console.warn(`[StrategyGenerator] JSON parse error on chunk ${chunkIndex}:`, jsonMatch[0], parseErr);
      return { strengths: [], weaknesses: [], evidenceNeeded: [], possibleArguments: [] };
    }
  } catch (e) {
    console.warn(`[StrategyGenerator] Scan failed for chunk ${chunkIndex}:`, e);
    return { strengths: [], weaknesses: [], evidenceNeeded: [], possibleArguments: [] };
  }
};

const synthesizeFinalStrategy = async (
context,
rawSummary,
perspective,
caseType) =>
{
  const prompt = `You are a strategic legal advisor specialized in Indian Law. Integrate the following raw scanning results for a ${perspective} in a ${caseType} case:

${rawSummary}

Synthesize a list of recommended next steps, and questions for consultation.
Respond ONLY in this exact JSON format:
{
  "recommendedActions": [
    "action item 1",
    "action item 2"
  ],
  "lawyerQuestions": [
    "consultation question 1",
    "consultation question 2"
  ],
  "confidence": 75,
  "confidenceReason": "why this confidence level was assigned"
}

Provide exactly 3 recommendedActions, 4-5 lawyerQuestions, and a confidence score between 0 and 100 based on the quality of evidence/claims identified.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a senior Indian legal consultant. Respond ONLY with valid JSON matching the requested format. No conversational introduction.' },
      { role: 'user', content: prompt }],

      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.2,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON output from synthesis pass.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      recommendedActions: (parsed.recommendedActions || []).filter((s) => typeof s === 'string').slice(0, 3),
      lawyerQuestions: (parsed.lawyerQuestions || []).filter((s) => typeof s === 'string').slice(0, 5),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 75,
      confidenceReason: parsed.confidenceReason || 'Based on standard document provisions and context depth.'
    };
  } catch (e) {
    console.warn('[StrategyGenerator] Final synthesis failed or output format invalid, using fallback:', e);
    return {
      recommendedActions: [
      'Collect all correspondence related to contract disputes.',
      'File an official representation or notice where applicable.',
      'Request a physical review of document signatures by a certified notary.'],

      lawyerQuestions: [
      'Is the dispute resolution clause legally binding in this jurisdiction?',
      'What is the statute of limitations for filing a claim based on this agreement?',
      'Does the current case type require mandatory mediation under CPC before litigation?',
      'What risks exist if we choose to terminate this relationship immediately?'],

      confidence: 60,
      confidenceReason: 'Inference synthesis failed. Fallback actions and consultation questions provided.'
    };
  }
};

export const generateStrategy = async (
chunks,
perspective,
caseType,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const perspectivePrefix = buildPerspectivePrefix(perspective, caseType);
  const allStrengths = [];
  const allWeaknesses = [];
  const allEvidenceNeeded = [];
  const allArguments = [];

  const total = chunks.length;
  for (let i = 0; i < total; i++) {
    onProgress?.(`Formulating strategy section ${i + 1} of ${total}...`, i + 1, total);
    const result = await scanChunkStrategy(context, chunks[i], i, perspectivePrefix);
    allStrengths.push(...result.strengths);
    allWeaknesses.push(...result.weaknesses);
    allEvidenceNeeded.push(...result.evidenceNeeded);
    allArguments.push(...result.possibleArguments);
  }

  // De-duplicate findings
  const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
  const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 5);
  const uniqueEvidenceNeeded = [...new Set(allEvidenceNeeded)].slice(0, 5);
  const uniqueArguments = [...new Set(allArguments)].slice(0, 5);

  onProgress?.('Synthesizing legal strategy report...', total, total);

  const rawSummary = `STRENGTHS IDENTIFIED:
${uniqueStrengths.map((s) => `- ${s}`).join('\n')}

WEAKNESSES IDENTIFIED:
${uniqueWeaknesses.map((s) => `- ${s}`).join('\n')}

EVIDENCE NEEDED:
${uniqueEvidenceNeeded.map((s) => `- ${s}`).join('\n')}

POSSIBLE ARGUMENTS:
${uniqueArguments.map((s) => `- ${s}`).join('\n')}`;

  const synthesized = await synthesizeFinalStrategy(context, rawSummary, perspective, caseType);

  return {
    perspective,
    caseType,
    strengths: uniqueStrengths,
    weaknesses: uniqueWeaknesses,
    evidenceNeeded: uniqueEvidenceNeeded,
    possibleArguments: uniqueArguments,
    recommendedActions: synthesized.recommendedActions,
    confidence: synthesized.confidence,
    confidenceReason: synthesized.confidenceReason,
    lawyerQuestions: synthesized.lawyerQuestions,
    totalChunksAnalyzed: total
  };
};