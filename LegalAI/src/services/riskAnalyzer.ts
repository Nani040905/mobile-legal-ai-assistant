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

import { LlamaContext } from 'llama.rn';
import modelManager from './modelManager';
import { LegalPerspective, PERSPECTIVE_FOCUS } from '../types/legalPerspective';
import { CaseType, CASE_TYPE_FOCUS } from '../types/caseType';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

/* ─── Types ─── */

export interface RiskClause {
  chunkIndex: number;       // Which chunk this clause was found in
  level: 'high' | 'medium'; // Severity level
  clause: string;           // The problematic clause or provision text (brief excerpt)
  explanation: string;      // Plain-language explanation of why it's risky
}

export interface RiskReport {
  perspective: LegalPerspective;
  caseType: CaseType;
  highRisk: RiskClause[];
  mediumRisk: RiskClause[];
  missing: string[];           // Missing standard clauses/provisions
  recommendations: string[];   // Recommended actions
  confidence: number;          // 0–100 overall confidence in this analysis
  confidenceReason: string;    // Short explanation for the confidence rating
  lawyerQuestions: string[];   // 4–6 specific questions to discuss with a lawyer
  totalChunksAnalyzed: number;
}

/* ─── Internal helpers ─── */

const buildPerspectivePrefix = (perspective: LegalPerspective, caseType: CaseType): string => {
  const focusList = CASE_TYPE_FOCUS[caseType].map(f => `- ${f}`).join('\n');
  return `Perspective: ${perspective.charAt(0).toUpperCase() + perspective.slice(1)}
Case Type: ${caseType.charAt(0).toUpperCase() + caseType.slice(1)}
${PERSPECTIVE_FOCUS[perspective]}

Focus specifically on:
${focusList}`;
};

const analyzeChunk = async (
  context: LlamaContext,
  chunk: string,
  chunkIndex: number,
  perspectivePrefix: string
): Promise<{ highRisk: RiskClause[]; mediumRisk: RiskClause[]; missing: string[] }> => {
  const prompt = `${perspectivePrefix}

Analyze the following legal document section (chunk ${chunkIndex + 1}) for risks and issues.

Document Section:
"""
${chunk.substring(0, 1200)}
"""

Respond ONLY in this exact JSON format with no extra text:
{
  "highRisk": [{"clause": "brief quote or description", "explanation": "why risky"}],
  "mediumRisk": [{"clause": "brief quote or description", "explanation": "why risky"}],
  "missing": ["missing provision name"]
}

If nothing risky is found, return empty arrays. Keep each explanation under 60 words.`;

  try {
    const result = await context.completion(
      {
        messages: [
          { role: 'system', content: 'You are a legal document risk analyzer. Respond ONLY with valid JSON matching the requested format. No markdown, no explanations outside JSON.' },
          { role: 'user', content: prompt },
        ],
        n_predict: 512,
        stop: STOP_WORDS,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 20,
      }
    );

    const text = result.text.trim();
    // Extract JSON from response — handle cases where model wraps in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { highRisk: [], mediumRisk: [], missing: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    const highRisk: RiskClause[] = (parsed.highRisk || []).map((item: any) => ({
      chunkIndex,
      level: 'high' as const,
      clause: item.clause || '',
      explanation: item.explanation || '',
    }));
    const mediumRisk: RiskClause[] = (parsed.mediumRisk || []).map((item: any) => ({
      chunkIndex,
      level: 'medium' as const,
      clause: item.clause || '',
      explanation: item.explanation || '',
    }));
    const missing: string[] = (parsed.missing || []).filter((s: any) => typeof s === 'string');

    return { highRisk, mediumRisk, missing };
  } catch (e) {
    console.warn(`[RiskAnalyzer] Failed to parse chunk ${chunkIndex}:`, e);
    return { highRisk: [], mediumRisk: [], missing: [] };
  }
};

const generateLawyerQuestions = async (
  context: LlamaContext,
  highRiskSummary: string,
  perspective: LegalPerspective,
  caseType: CaseType
): Promise<string[]> => {
  const prompt = `Based on the following legal risk summary for a ${perspective} in a ${caseType} case:

${highRiskSummary}

Generate exactly 5 specific, actionable questions this person should discuss with their lawyer. 
Number them 1–5. Each question should be specific to the risks found, not generic.
Return ONLY the numbered list of questions with no extra text.`;

  try {
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal assistant helping a client prepare for a lawyer consultation. Generate specific questions based on document risks identified.' },
        { role: 'user', content: prompt },
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.4,
      top_p: 0.9,
      top_k: 40,
    });

    const text = result.text.trim();
    // Parse numbered questions (1. Question text)
    const lines = text.split('\n').filter(l => l.trim());
    const questions = lines
      .filter(l => /^\d+[.)]\s+/.test(l.trim()))
      .map(l => l.replace(/^\d+[.)]\s+/, '').trim())
      .filter(q => q.length > 10)
      .slice(0, 6);

    if (questions.length === 0) {
      // Fallback: return generic questions if parsing fails
      return [
        'Are all the clauses in this document enforceable under Indian law?',
        'What is my legal liability exposure based on this document?',
        'Are there any procedural defects I can challenge?',
        'What remedies are available if the other party breaches?',
        'Is arbitration mandatory or can I approach a civil court?',
      ];
    }
    return questions;
  } catch (e) {
    console.warn('[RiskAnalyzer] Failed to generate lawyer questions:', e);
    return [
      'Are all the clauses in this document enforceable under Indian law?',
      'What is my legal liability exposure based on this document?',
      'What remedies are available if the other party breaches this agreement?',
      'Are there any missing provisions I should negotiate to include?',
      'What is the jurisdiction for disputes arising from this document?',
    ];
  }
};

const generateRecommendations = async (
  context: LlamaContext,
  highRiskCount: number,
  mediumRiskCount: number,
  missingCount: number,
  perspective: LegalPerspective,
  caseType: CaseType
): Promise<string[]> => {
  if (highRiskCount === 0 && mediumRiskCount === 0) {
    return ['No major risks detected. Consider a final review by a legal professional before signing.'];
  }

  const prompt = `As a ${perspective} in a ${caseType} case, the document analysis found:
- ${highRiskCount} high-risk clause(s)
- ${mediumRiskCount} medium-risk clause(s)
- ${missingCount} missing provision(s)

List 3 specific recommended actions to take before proceeding. Return ONLY a numbered list, no extra text.`;

  try {
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal risk advisor. Provide concise, actionable recommendations.' },
        { role: 'user', content: prompt },
      ],
      n_predict: 256,
      stop: STOP_WORDS,
      temperature: 0.3,
      top_p: 0.9,
      top_k: 30,
    });

    const text = result.text.trim();
    const lines = text.split('\n').filter(l => l.trim());
    const recs = lines
      .filter(l => /^\d+[.)]\s+/.test(l.trim()))
      .map(l => l.replace(/^\d+[.)]\s+/, '').trim())
      .filter(r => r.length > 5)
      .slice(0, 4);

    return recs.length > 0 ? recs : ['Seek legal counsel before signing this document.'];
  } catch (e) {
    return ['Seek legal counsel before signing or acting on this document.'];
  }
};

/* ─── Main exported function ─── */

export const analyzeRisk = async (
  chunks: string[],
  perspective: LegalPerspective,
  caseType: CaseType,
  onProgress?: (text: string, current: number, total: number) => void
): Promise<RiskReport> => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const perspectivePrefix = buildPerspectivePrefix(perspective, caseType);
  const allHighRisk: RiskClause[] = [];
  const allMediumRisk: RiskClause[] = [];
  const allMissing: string[] = [];

  // Analyze each chunk
  const total = chunks.length;
  for (let i = 0; i < total; i++) {
    onProgress?.(`Analyzing section ${i + 1} of ${total}...`, i + 1, total);
    const result = await analyzeChunk(context, chunks[i], i, perspectivePrefix);
    allHighRisk.push(...result.highRisk);
    allMediumRisk.push(...result.mediumRisk);
    allMissing.push(...result.missing);
  }

  // De-duplicate missing clauses
  const uniqueMissing = [...new Set(allMissing)];

  // Compute confidence score
  // Logic: chunks with any findings count as "informative"
  const informativeChunks = allHighRisk.length + allMediumRisk.length;
  let confidence = 50; // Base confidence
  if (total >= 3) confidence += 20; // More chunks = more reliable
  if (total >= 8) confidence += 10;
  if (allHighRisk.length > 0 || allMediumRisk.length > 0) confidence += 10;
  if (allHighRisk.length === 0 && allMediumRisk.length === 0) confidence = Math.max(40, confidence - 15);
  confidence = Math.min(95, confidence);

  const confidenceReason =
    allHighRisk.length > 0
      ? `Document contains ${allHighRisk.length} high-risk clause(s) with clear legal signals across ${total} analyzed sections.`
      : allMediumRisk.length > 0
      ? `Document contains ${allMediumRisk.length} medium-risk clause(s). No critical issues found but review is recommended.`
      : `No major risk clauses detected across ${total} document section(s).`;

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
    ...allHighRisk.map(r => `HIGH RISK — ${r.clause}: ${r.explanation}`),
    ...allMediumRisk.slice(0, 3).map(r => `MEDIUM RISK — ${r.clause}: ${r.explanation}`),
  ].join('\n');

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
    totalChunksAnalyzed: total,
  };
};
