/*
 * evidenceAnalyzer.ts — Evidence quality analysis service.
 *
 * PURPOSE: Scans document chunks for mentions of evidence items and classifies
 * them as Strong, Weak, or Missing based on legal standards. Returns a
 * confidence score reflecting how evidence-rich the document is.
 */


import modelManager from './modelManager';















import { runUnifiedAnalysis } from './unifiedAnalyzer';

export const analyzeEvidence = async (
chunks,
perspective,
caseType,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const allStrong = [];
  const allWeak = [];
  const allMissing = [];

  const total = chunks.length;

  // Call unified analysis (uses caching, so it gets the previous cached results from the risk run instantly!)
  const unifiedResults = await runUnifiedAnalysis(chunks, perspective, caseType, (text, cur, tot) => {
    onProgress?.(`Scanning evidence: ${text}`);
  });

  unifiedResults.forEach((r) => {
    allStrong.push(...r.strongEvidence);
    allWeak.push(...r.weakEvidence);
    allMissing.push(...r.missingEvidence);
  });

  const uniqueMissing = [...new Set(allMissing)];

  // Confidence calculation
  let confidence = 40;
  if (allStrong.length >= 2) confidence += 25;else
  if (allStrong.length === 1) confidence += 10;
  if (allWeak.length === 0) confidence += 10;
  if (uniqueMissing.length === 0) confidence += 10;
  if (total >= 4) confidence += 10;
  if (allStrong.length === 0 && allWeak.length === 0) confidence = Math.max(30, confidence - 10);
  confidence = Math.min(95, confidence);

  const confidenceReason =
  allStrong.length >= 2 ?
  `Document contains ${allStrong.length} strong evidence item(s) supporting the legal position.` :
  allStrong.length === 1 ?
  'Document contains 1 strong evidence item. Additional documentation is recommended.' :
  uniqueMissing.length > 0 ?
  `No strong evidence found. ${uniqueMissing.length} critical evidence item(s) appear to be missing.` :
  'Limited evidence references found in the document.';

  return {
    strongEvidence: allStrong,
    weakEvidence: allWeak,
    missingEvidence: uniqueMissing,
    confidence,
    confidenceReason
  };
};