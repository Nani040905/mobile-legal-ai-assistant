/*
 * performanceBenchmark.ts — Benchmark functions for model load time, latency, and memory.
 *
 * PURPOSE: Measures local AI model initialization time, inference throughput (tokens/sec),
 * and native heap memory footprint on the device.
 */

import { NativeModules } from 'react-native';
import modelManager from '../services/modelManager';

const { PdfExtractor } = NativeModules;

/**
 * measureModelLoadTime — Unloads and reloads the active model to measure exact loading time in milliseconds.
 */
export const measureModelLoadTime = async () => {
  // Unload if loaded to ensure fresh load
  if (modelManager.getStatus() === 'ready') {
    console.log('[PerformanceBenchmark] Unloading model before benchmark...');
    await modelManager.releaseModel();
  }

  const startTime = Date.now();
  console.log('[PerformanceBenchmark] Initializing model...');
  const success = await modelManager.initializeModel();
  const endTime = Date.now();

  if (!success) {
    throw new Error('Failed to initialize model for benchmark. Check download status.');
  }

  return endTime - startTime;
};

/**
 * InferenceMetrics — Structured performance data.
 */








/**
 * measureInferenceLatency — Runs a short completion on the active model context to calculate throughput metrics.
 */
export const measureInferenceLatency = async (
prompt,
onToken) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('Model is not loaded. Cannot run inference benchmark.');
  }

  let tokenCount = 0;
  const startTime = Date.now();

  const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>'];

  console.log('[PerformanceBenchmark] Running completion on prompt...');
  const result = await context.completion(
    {
      prompt: prompt,
      n_predict: 50, // 50 tokens is standard for latency verification
      stop: STOP_WORDS,
      temperature: 0.3
    },
    (tokenData) => {
      tokenCount++;
      if (onToken) {
        onToken(tokenData.token);
      }
    }
  );

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const tokensPerSecond = tokenCount > 0 ? tokenCount / durationMs * 1000 : 0;
  const msPerToken = tokenCount > 0 ? durationMs / tokenCount : 0;

  return {
    durationMs,
    tokenCount,
    msPerToken,
    tokensPerSecond,
    text: result.text
  };
};

/**
 * measurePeakMemory — Queries the native Android module for allocated native heap size in bytes.
 */
export const measurePeakMemory = async () => {
  if (PdfExtractor && PdfExtractor.getSystemMemoryInfo) {
    try {
      const memInfo = await PdfExtractor.getSystemMemoryInfo();
      return memInfo.nativeAllocated; // Bytes allocated on native heap
    } catch (e) {
      console.error('[PerformanceBenchmark] Error calling native memory info:', e);
    }
  }
  return 0;
};