/*
 * evidenceAnalyzer.ts — Evidence quality analysis service.
 *
 * PURPOSE: Scans document chunks for mentions of evidence items and classifies
 * them as Strong, Weak, or Missing based on legal standards. Returns a
 * confidence score reflecting how evidence-rich the document is.
 */

import { LlamaContext } from 'llama.rn';
import modelManager from './modelManager';
import { LegalPerspective } from '../types/legalPerspective';
import { CaseType } from '../types/caseType';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

export interface EvidenceItem {
  chunkIndex: number;
  item: string;      // Brief description of the evidence
  reference: string; // Clause/section reference if available
}

export interface EvidenceReport {
  strongEvidence: EvidenceItem[];
  weakEvidence: EvidenceItem[];
  missingEvidence: string[];
  confidence: number;        // 0–100 confidence on the evidence assessment
  confidenceReason: string;
}

const analyzeChunkForEvidence = async (
  context: LlamaContext,
  chunk: string,
  chunkIndex: number,
  perspective: LegalPerspective,
  caseType: CaseType
): Promise<{ strong: EvidenceItem[]; weak: EvidenceItem[]; missing: string[] }> => {
  const prompt = `You are analyzing evidence quality in a legal document for a ${perspective} in a ${caseType} case.

Document Section:
"""
${chunk.substring(0, 1000)}
"""

Identify evidence mentioned in this section. Classify as:
- STRONG: Signed documents, filed FIRs, receipts, official certificates, dated agreements, court orders
- WEAK: Unsigned documents, verbal references, undated documents, single-witness statements, copies without originals

Respond ONLY in this JSON format:
{
  "strong": [{"item": "evidence description", "reference": "clause or section if mentioned"}],
  "weak": [{"item": "evidence description", "reference": "clause or section if mentioned"}],
  "missing": ["type of evidence that should exist but is absent"]
}

Return empty arrays if no evidence is mentioned. Keep descriptions under 50 words.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal evidence analyst. Respond ONLY with valid JSON. No extra text.' },
        { role: 'user', content: prompt },
      ],
      n_predict: 400,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[EvidenceAnalyzer] No JSON block found in raw output for chunk ${chunkIndex}. Raw:`, text);
      return { strong: [], weak: [], missing: [] };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      const strong: EvidenceItem[] = (parsed.strong || []).map((item: any) => ({
        chunkIndex,
        item: item.item || '',
        reference: item.reference || '',
      }));
      const weak: EvidenceItem[] = (parsed.weak || []).map((item: any) => ({
        chunkIndex,
        item: item.item || '',
        reference: item.reference || '',
      }));
      const missing: string[] = (parsed.missing || []).filter((s: any) => typeof s === 'string');

      return { strong, weak, missing };
    } catch (parseErr) {
      console.warn(`[EvidenceAnalyzer] JSON parse error on chunk ${chunkIndex}. Raw JSON matched substring:`, jsonMatch[0], parseErr);
      return { strong: [], weak: [], missing: [] };
    }
  } catch (e) {
    console.warn(`[EvidenceAnalyzer] Completion failed for chunk ${chunkIndex}:`, e);
    return { strong: [], weak: [], missing: [] };
  }
};

export const analyzeEvidence = async (
  chunks: string[],
  perspective: LegalPerspective,
  caseType: CaseType,
  onProgress?: (text: string) => void
): Promise<EvidenceReport> => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const allStrong: EvidenceItem[] = [];
  const allWeak: EvidenceItem[] = [];
  const allMissing: string[] = [];

  const total = chunks.length;
  for (let i = 0; i < total; i++) {
    onProgress?.(`Scanning evidence in section ${i + 1} of ${total}...`);
    const result = await analyzeChunkForEvidence(context, chunks[i], i, perspective, caseType);
    allStrong.push(...result.strong);
    allWeak.push(...result.weak);
    allMissing.push(...result.missing);
  }

  const uniqueMissing = [...new Set(allMissing)];

  // Confidence calculation
  let confidence = 40;
  if (allStrong.length >= 2) confidence += 25;
  else if (allStrong.length === 1) confidence += 10;
  if (allWeak.length === 0) confidence += 10;
  if (uniqueMissing.length === 0) confidence += 10;
  if (total >= 4) confidence += 10;
  if (allStrong.length === 0 && allWeak.length === 0) confidence = Math.max(30, confidence - 10);
  confidence = Math.min(95, confidence);

  const confidenceReason =
    allStrong.length >= 2
      ? `Document contains ${allStrong.length} strong evidence item(s) supporting the legal position.`
      : allStrong.length === 1
      ? 'Document contains 1 strong evidence item. Additional documentation is recommended.'
      : uniqueMissing.length > 0
      ? `No strong evidence found. ${uniqueMissing.length} critical evidence item(s) appear to be missing.`
      : 'Limited evidence references found in the document.';

  return {
    strongEvidence: allStrong,
    weakEvidence: allWeak,
    missingEvidence: uniqueMissing,
    confidence,
    confidenceReason,
  };
};
