/*
 * telemetry.js — Performance Telemetry Tracking Service.
 *
 * PURPOSE: Monitors and logs model loading latency, token inference speeds, RAM consumption,
 * and storage space occupied by document files and directories.
 */

import useDocumentStore from '../store/useDocumentStore';
import modelManager from './modelManager';

let modelLoadTime = 0;
let lastInferenceSpeed = 0; // tokens/sec
let lastInferenceTime = 0; // ms
let totalTokensGenerated = 0;

export const recordModelLoad = (durationMs) => {
  modelLoadTime = durationMs;
};

export const recordInference = (tokenCount, durationMs) => {
  if (durationMs > 0) {
    lastInferenceSpeed = parseFloat(((tokenCount / durationMs) * 1000).toFixed(2));
    lastInferenceTime = durationMs;
    totalTokensGenerated += tokenCount;
  }
};

export const getTelemetryData = () => {
  // Estimate RAM usage dynamically based on model load status
  const modelStatus = modelManager.getStatus();
  const activeModel = modelManager.getActiveModel();
  
  let estimatedRam = 180; // Base baseline app RAM usage in MB
  if (modelStatus === 'ready' || modelStatus === 'generating') {
    if (activeModel.id === 'qwen-2.5-3b') {
      estimatedRam += 1850; // 3B model footprint
    } else if (activeModel.id === 'qwen-2.5-1.5b') {
      estimatedRam += 1100; // 1.5B model footprint
    } else {
      estimatedRam += 800; // 1B footprint
    }
  }

  // Calculate storage usage
  const docs = useDocumentStore.getState().documents || [];
  const rawBytes = docs.reduce((sum, d) => sum + (d.size || 0), 0);
  const storageSizeMB = parseFloat((rawBytes / (1024 * 1024)).toFixed(2));

  return {
    modelLoadTime,
    lastInferenceSpeed,
    lastInferenceTime,
    totalTokensGenerated,
    ramUsageMB: estimatedRam,
    storageSizeMB
  };
};

export const resetTelemetry = () => {
  modelLoadTime = 0;
  lastInferenceSpeed = 0;
  lastInferenceTime = 0;
  totalTokensGenerated = 0;
};
