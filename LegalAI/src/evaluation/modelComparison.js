/*
 * modelComparison.ts — Benchmark suite to compare different local LLM models on the device.
 *
 * PURPOSE: Runs a standard set of queries across Qwen 3B, Qwen 1.5B, and Llama 1B
 * to measure load time, inference speed (tokens/sec), peak memory consumption (RAM),
 * and factual verification (hallucination) score.
 */

import modelManager from '../services/modelManager';
import { measurePeakMemory } from './performanceBenchmark';
import { verifyAnswer } from '../services/answerVerifier';
import { search } from '../services/retrievalService';
import { BENCHMARK_DOCUMENTS } from './benchmarkDocumentsData';
import benchmarkQuestions from './benchmarkQuestions.json';

// Benchmark splitIntoChunks helper
const splitIntoChunks = (text, chunkSize = 1000) => {
  if (text.length <= chunkSize) return [text];
  const chunks = [];
  let currentPosition = 0;
  while (currentPosition < text.length) {
    let chunk = text.substring(currentPosition, currentPosition + chunkSize);
    if (currentPosition + chunkSize < text.length) {
      const paragraphBreak = chunk.lastIndexOf('\n\n');
      const lineBreak = chunk.lastIndexOf('\n');
      const sentenceEnd = chunk.lastIndexOf('. ');
      if (paragraphBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, paragraphBreak);
      } else if (lineBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, lineBreak);
      } else if (sentenceEnd > chunkSize * 0.5) {
        chunk = chunk.substring(0, sentenceEnd + 1);
      }
    }
    chunks.push(chunk.trim());
    currentPosition += chunk.length;
    while (currentPosition < text.length && text[currentPosition] === '\n') {
      currentPosition++;
    }
  }
  return chunks;
};













export const runModelComparison = async (
modelIds,
onProgress) =>
{
  const originalModel = modelManager.getActiveModel();
  const originalStatus = modelManager.getStatus();

  const results = [];

  // We will run 3 benchmark questions on the Employment Agreement document
  const testQuestions = benchmarkQuestions.slice(0, 3);
  const docName = 'EmploymentAgreement.txt';
  const docText = BENCHMARK_DOCUMENTS[docName] || '';
  const docChunks = splitIntoChunks(docText);

  for (const modelId of modelIds) {
    const config = modelManager.getModels().find((m) => m.id === modelId);
    if (!config) continue;

    onProgress?.(`Configuring model: ${config.name}...`);
    await modelManager.setActiveModel(modelId);
    const exists = await modelManager.checkModelExists();

    if (!exists) {
      results.push({
        modelId,
        modelName: config.name,
        sizeLabel: config.sizeLabel,
        downloaded: false,
        loadTimeMs: null,
        tokensPerSecond: null,
        peakRamMb: null,
        hallucinationScore: null,
        accuracyScore: null
      });
      continue;
    }

    onProgress?.(`Measuring load time for ${config.name}...`);

    // Ensure it's unloaded first
    if (modelManager.getStatus() === 'ready') {
      await modelManager.releaseModel();
    }

    const startLoad = Date.now();
    const loadSuccess = await modelManager.initializeModel();
    const loadTimeMs = Date.now() - startLoad;

    if (!loadSuccess) {
      results.push({
        modelId,
        modelName: config.name,
        sizeLabel: config.sizeLabel,
        downloaded: true,
        loadTimeMs: null,
        tokensPerSecond: null,
        peakRamMb: null,
        hallucinationScore: null,
        accuracyScore: null
      });
      continue;
    }

    // Measure baseline RAM after loading
    const loadRamBytes = await measurePeakMemory();
    let maxRamBytes = loadRamBytes;

    const context = modelManager.getContext();
    if (!context) {
      results.push({
        modelId,
        modelName: config.name,
        sizeLabel: config.sizeLabel,
        downloaded: true,
        loadTimeMs,
        tokensPerSecond: null,
        peakRamMb: null,
        hallucinationScore: null,
        accuracyScore: null
      });
      continue;
    }

    let totalTokens = 0;
    let totalInferenceTimeMs = 0;
    let confidenceSum = 0;
    let correctCount = 0;

    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i];
      onProgress?.(`Evaluating question ${i + 1}/${testQuestions.length} on ${config.name}...`);

      const searchResults = search(q.query, docChunks, 3);
      const contextText = searchResults.map((r) => r.chunk).join('\n\n---\n\n');

      const prompt = `[INST] You are a legal assistant. Answer the question based ONLY on the provided context. If not found, say "Not found".
Context:
${contextText}

Question: ${q.query} [/INST]`;

      let tokensForQuery = 0;
      const startInference = Date.now();

      const compResult = await context.completion(
        {
          prompt,
          n_predict: 80,
          temperature: 0.2,
          stop: ['[INST]', '[/INST]', '<|im_end|>', '</s>']
        },
        () => {
          tokensForQuery++;
        }
      );

      const inferenceTime = Date.now() - startInference;
      totalInferenceTimeMs += inferenceTime;
      totalTokens += tokensForQuery;

      // Track RAM during active execution
      const currentRam = await measurePeakMemory();
      if (currentRam > maxRamBytes) {
        maxRamBytes = currentRam;
      }

      // Verify answer claims (grounding verification)
      const verifyResult = verifyAnswer(compResult.text, searchResults.map((r) => r.chunk));
      confidenceSum += verifyResult.confidence;

      // Accuracy: check if model answer contains the ground truth expectedText
      const isCorrect = compResult.text.toLowerCase().includes(q.expectedText.toLowerCase());
      if (isCorrect) {
        correctCount++;
      }
    }

    const tokensPerSecond = totalInferenceTimeMs > 0 ? totalTokens / totalInferenceTimeMs * 1000 : 0;
    const avgConfidence = confidenceSum / testQuestions.length;
    const hallucinationScore = (1 - avgConfidence) * 100;
    const accuracyScore = correctCount / testQuestions.length * 100;
    const peakRamMb = maxRamBytes > 0 ? maxRamBytes / (1024 * 1024) : null;

    results.push({
      modelId,
      modelName: config.name,
      sizeLabel: config.sizeLabel,
      downloaded: true,
      loadTimeMs,
      tokensPerSecond: Number(tokensPerSecond.toFixed(1)),
      peakRamMb: peakRamMb ? Number(peakRamMb.toFixed(0)) : null,
      hallucinationScore: Number(hallucinationScore.toFixed(0)),
      accuracyScore: Number(accuracyScore.toFixed(0))
    });

    // Unload the model before moving to next one
    await modelManager.releaseModel();
  }

  // Restore the user's original model setup
  onProgress?.(`Restoring original model preference: ${originalModel.name}...`);
  await modelManager.setActiveModel(originalModel.id);
  if (originalStatus === 'ready') {
    await modelManager.initializeModel();
  }

  return results;
};