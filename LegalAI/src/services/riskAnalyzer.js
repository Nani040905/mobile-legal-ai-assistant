/*
 * riskAnalyzer.ts — Legal risk analysis service with chunk-by-chunk batch audit.
 *
 * PURPOSE: Iterates through every document chunk, calls the on-device LLM for
 * each one to detect risk clauses, and aggregates results into a structured
 * RiskReport. Also generates a confidence score and lawyer consultation questions.
 *
 * DESIGN DECISIONS:
 * - Chunk-by-chunk iteration prevents context window overflow on large documents.
 * - Progress callback allows the UI to show live progress ("Analyzing chunk 3 of 12").
 * - Confidence is computed from the proportion of chunks with clear legal signals.
 * - Lawyer questions are generated in a final dedicated LLM pass using the full
 *   aggregated risk summary as context (not individual chunks).
 */


import modelManager from './modelManager';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

/* ─── Types ─── */





















/* ─── Internal helpers ─── */

const generateLawyerQuestions = async (
context,
highRiskSummary,
perspective,
caseType) =>
{
  const prompt = `Based on the following legal risk summary for a ${perspective} in a ${caseType} case:

${highRiskSummary}

Generate exactly 5 specific, actionable questions this person should discuss with their lawyer. 
Number them 1–5. Each question should be specific to the risks found, not generic.
Return ONLY the numbered list of questions with no extra text.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal assistant helping a client prepare for a lawyer consultation. Generate specific questions based on document risks identified.' },
      { role: 'user', content: prompt }],

      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.4,
      top_p: 0.9,
      top_k: 40
    });

    const text = result.text.trim();
    // Parse numbered questions (1. Question text)
    const lines = text.split('\n').filter((l) => l.trim());
    const questions = lines.
    filter((l) => /^\d+[.)]\s+/.test(l.trim())).
    map((l) => l.replace(/^\d+[.)]\s+/, '').trim()).
    filter((q) => q.length > 10).
    slice(0, 6);

    if (questions.length === 0) {
      // Fallback: return generic questions if parsing fails
      return [
      'Are all the clauses in this document enforceable under Indian law?',
      'What is my legal liability exposure based on this document?',
      'Are there any procedural defects I can challenge?',
      'What remedies are available if the other party breaches?',
      'Is arbitration mandatory or can I approach a civil court?'];

    }
    return questions;
  } catch (e) {
    console.warn('[RiskAnalyzer] Failed to generate lawyer questions:', e);
    return [
    'Are all the clauses in this document enforceable under Indian law?',
    'What is my legal liability exposure based on this document?',
    'What remedies are available if the other party breaches this agreement?',
    'Are there any missing provisions I should negotiate to include?',
    'What is the jurisdiction for disputes arising from this document?'];

  }
};

const generateRecommendations = async (
context,
highRiskCount,
mediumRiskCount,
missingCount,
perspective,
caseType) =>
{
  if (highRiskCount === 0 && mediumRiskCount === 0) {
    return ['No major risks detected. Consider a final review by a legal professional before signing.'];
  }

  const prompt = `As a ${perspective} in a ${caseType} case, the document analysis found:
- ${highRiskCount} high-risk clause(s)
- ${mediumRiskCount} medium-risk clause(s)
- ${missingCount} missing provision(s)

List 3 specific recommended actions to take before proceeding. Return ONLY a numbered list, no extra text.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal risk advisor. Provide concise, actionable recommendations.' },
      { role: 'user', content: prompt }],

      n_predict: 256,
      stop: STOP_WORDS,
      temperature: 0.3,
      top_p: 0.9,
      top_k: 30
    });

    const text = result.text.trim();
    const lines = text.split('\n').filter((l) => l.trim());
    const recs = lines.
    filter((l) => /^\d+[.)]\s+/.test(l.trim())).
    map((l) => l.replace(/^\d+[.)]\s+/, '').trim()).
    filter((r) => r.length > 5).
    slice(0, 4);

    return recs.length > 0 ? recs : ['Seek legal counsel before signing this document.'];
  } catch (e) {
    return ['Seek legal counsel before signing or acting on this document.'];
  }
};

import { runUnifiedAnalysis } from './unifiedAnalyzer';

/* ─── Main exported function ─── */

export const analyzeRisk = async (
chunks,
perspective,
caseType,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const total = chunks.length;

  // Call unified analysis (uses caching, so if this is run first it does the work; if second, it's instant)
  const unifiedResults = await runUnifiedAnalysis(chunks, perspective, caseType, onProgress);

  const allHighRisk = [];
  const allMediumRisk = [];
  const allMissing = [];

  unifiedResults.forEach((r) => {
    allHighRisk.push(...r.highRisk);
    allMediumRisk.push(...r.mediumRisk);
    allMissing.push(...r.missingClauses);
  });

  // De-duplicate missing clauses
  const uniqueMissing = [...new Set(allMissing)];

  // Compute confidence score
  let confidence = 50; // Base confidence
  if (total >= 3) confidence += 20; // More chunks = more reliable
  if (total >= 8) confidence += 10;
  if (allHighRisk.length > 0 || allMediumRisk.length > 0) confidence += 10;
  if (allHighRisk.length === 0 && allMediumRisk.length === 0) confidence = Math.max(40, confidence - 15);
  confidence = Math.min(95, confidence);

  const confidenceReason =
  allHighRisk.length > 0 ?
  `Document contains ${allHighRisk.length} high-risk clause(s) with clear legal signals across ${total} analyzed sections.` :
  allMediumRisk.length > 0 ?
  `Document contains ${allMediumRisk.length} medium-risk clause(s). No critical issues found but review is recommended.` :
  `No major risk clauses detected across ${total} document section(s).`;

  // Generate recommendations
  onProgress?.('Generating recommendations...', total, total);
  const recommendations = await generateRecommendations(
    context,
    allHighRisk.length,
    allMediumRisk.length,
    uniqueMissing.length,
    perspective,
    caseType
  );

  // Generate lawyer questions
  onProgress?.('Preparing consultation questions...', total, total);
  const riskSummary = [
  ...allHighRisk.map((r) => `HIGH RISK — ${r.clause}: ${r.explanation}`),
  ...allMediumRisk.slice(0, 3).map((r) => `MEDIUM RISK — ${r.clause}: ${r.explanation}`)].
  join('\n');

  const lawyerQuestions = await generateLawyerQuestions(
    context,
    riskSummary || 'No major risks found in the document.',
    perspective,
    caseType
  );

  return {
    perspective,
    caseType,
    highRisk: allHighRisk,
    mediumRisk: allMediumRisk,
    missing: uniqueMissing,
    recommendations,
    confidence,
    confidenceReason,
    lawyerQuestions,
    totalChunksAnalyzed: total
  };
};