/*
 * perspectiveComparison.ts — Service for comparing two perspectives side-by-side.
 *
 * PURPOSE: Performs a single-pass comparative analysis of a legal document
 * from two distinct legal perspectives (e.g. Plaintiff vs Defendant) for a
 * selected CaseType, returning a ComparisonMatrix.
 */


import modelManager from './modelManager';
import { PERSPECTIVE_FOCUS } from '../types/legalPerspective';
import { CASE_TYPE_FOCUS } from '../types/caseType';
import { buildBudgetedContext } from './contextBudget';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];
















export const comparePerspectives = async (
chunks,
perspectiveA,
perspectiveB,
caseType,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  onProgress?.('Preparing comparison context...');

  // Build system instruction including both perspective focus points
  const systemPrompt = `You are a legal analyst comparing a ${caseType} case from two angles:
Perspective A: ${perspectiveA} (${PERSPECTIVE_FOCUS[perspectiveA]})
Perspective B: ${perspectiveB} (${PERSPECTIVE_FOCUS[perspectiveB]})

Guidelines for Case Type ${caseType}:
${CASE_TYPE_FOCUS[caseType].map((f) => `- ${f}`).join('\n')}`;

  // Budget and package the most relevant document chunks
  const budgeted = buildBudgetedContext(systemPrompt, chunks, '', 2048, 512);

  const prompt = `Analyze the following legal document context from two opposing perspectives:
Perspective A: ${perspectiveA.toUpperCase()}
Perspective B: ${perspectiveB.toUpperCase()}

Document Context:
"""
${budgeted.contextText || 'No text content available.'}
"""

Formulate a side-by-side comparison matrix. Respond ONLY in this exact JSON format:
{
  "perspectiveA": {
    "strongestClaim": "brief strongest claim or defense for Perspective A",
    "keyEvidence": "primary document section or proof for Perspective A",
    "legalRisk": "HIGH",
    "confidence": 75
  },
  "perspectiveB": {
    "strongestClaim": "brief strongest claim or defense for Perspective B",
    "keyEvidence": "primary document section or proof for Perspective B",
    "legalRisk": "MEDIUM",
    "confidence": 60
  },
  "sharedLawyerQuestions": [
    "Question addressing conflict between perspectives",
    "Question regarding evidence gap"
  ]
}

Notes:
- "legalRisk" values MUST be: "LOW", "MEDIUM", or "HIGH".
- "confidence" values MUST be numbers between 0 and 100.
- Return exactly 3 questions in "sharedLawyerQuestions".
- Do not wrap in markdown blocks, do not explain your answers outside JSON.`;

  onProgress?.('Formulating comparative analysis...');

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal comparison tool. Respond ONLY with valid JSON.' },
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
      throw new Error('No JSON output from model.');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      caseType,
      perspectiveA: {
        perspective: perspectiveA,
        strongestClaim: parsed.perspectiveA?.strongestClaim || 'No clear claim identified.',
        keyEvidence: parsed.perspectiveA?.keyEvidence || 'No direct evidence cited.',
        legalRisk: parsed.perspectiveA?.legalRisk === 'LOW' || parsed.perspectiveA?.legalRisk === 'MEDIUM' || parsed.perspectiveA?.legalRisk === 'HIGH' ?
        parsed.perspectiveA.legalRisk :
        'MEDIUM',
        confidence: typeof parsed.perspectiveA?.confidence === 'number' ? parsed.perspectiveA.confidence : 70
      },
      perspectiveB: {
        perspective: perspectiveB,
        strongestClaim: parsed.perspectiveB?.strongestClaim || 'No clear defense identified.',
        keyEvidence: parsed.perspectiveB?.keyEvidence || 'No direct evidence cited.',
        legalRisk: parsed.perspectiveB?.legalRisk === 'LOW' || parsed.perspectiveB?.legalRisk === 'MEDIUM' || parsed.perspectiveB?.legalRisk === 'HIGH' ?
        parsed.perspectiveB.legalRisk :
        'MEDIUM',
        confidence: typeof parsed.perspectiveB?.confidence === 'number' ? parsed.perspectiveB.confidence : 70
      },
      sharedLawyerQuestions: (parsed.sharedLawyerQuestions || []).filter((s) => typeof s === 'string').slice(0, 3)
    };

  } catch (e) {
    console.warn('[PerspectiveComparison] Error during comparative analysis:', e);
    // Return fallback comparison matrix on parsing or inference failures
    return {
      caseType,
      perspectiveA: {
        perspective: perspectiveA,
        strongestClaim: 'Claims derived from standard contract obligations.',
        keyEvidence: 'Signatures and execution sections.',
        legalRisk: 'MEDIUM',
        confidence: 50
      },
      perspectiveB: {
        perspective: perspectiveB,
        strongestClaim: 'Standard exclusions of liability and terms.',
        keyEvidence: 'Termination and liability limitations.',
        legalRisk: 'MEDIUM',
        confidence: 50
      },
      sharedLawyerQuestions: [
      `How does the jurisdiction clause affect a claim raised by ${perspectiveA}?`,
      `Are there mutual indemnification obligations between ${perspectiveA} and ${perspectiveB}?`,
      'What alternative dispute resolution channels are open to both sides?']

    };
  }
};