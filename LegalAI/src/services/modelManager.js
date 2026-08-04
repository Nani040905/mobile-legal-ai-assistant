/*
 * modelManager.ts — Singleton service for managing the local LLM lifecycle.
 *
 * PURPOSE: Handles loading, unloading, and status tracking of the Qwen 2.5 3B
 * GGUF model via llama.rn. This is the single point of access for the LLM context
 * — no other file should call initLlama() directly.
 *
 * DESIGN DECISIONS:
 * - Singleton pattern — only one model context can exist at a time. Loading a
 *   3B model consumes ~2 GB RAM; two contexts would crash the device.
 * - Status tracking — exposes a reactive status so UI can show load progress.
 * - CPU-only inference (n_gpu_layers: 0) — maximizes device compatibility.
 *   GPU offloading on Android Adreno GPUs can cause crashes with flash attention.
 * - use_mlock: true — prevents the OS from paging model weights to disk,
 *   which would cause extreme slowdowns during inference.
 * - n_ctx: 2048 — conservative context window size. Qwen 2.5 3B supports up
 *   to 32K tokens, but 2048 keeps RAM usage within safe limits on 6-12 GB devices.
 *
 * LIFECYCLE:
 * 1. App starts → status is 'not_downloaded' or 'idle' (depending on file check)
 * 2. User taps "Load Model" → initializeModel() → status becomes 'loading'
 * 3. llama.rn finishes loading → status becomes 'ready'
 * 4. User taps "Unload Model" or app backgrounds → releaseModel() → sta/* Import the initLlama function from llama.rn — this is the main entry point */
import { initLlama } from 'llama.rn';
import { recordModelLoad } from './telemetry';

/* Import RNFS to check if the model file exists on the device filesystem */
import RNFS from 'react-native-fs';

/* Import AsyncStorage to persist the model preference and load state */
import AsyncStorage from '@react-native-async-storage/async-storage';

/* Keys for storing preferences in AsyncStorage */
const ACTIVE_MODEL_KEY = 'legal-ai-active-model-id';
const SHOULD_LOAD_KEY = 'legal-ai-model-should-load';

/* ModelConfig interface defining the metadata of a local GGUF model option */









/* List of available offline LLM models for selection */
export const MODELS = [
{
  id: 'qwen-2.5-3b',
  name: 'Qwen 2.5 3B (Recommended)',
  filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
  downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
  sizeLabel: '1.96 GB',
  description: 'Best quality & reasoning. Ideal for devices with 6GB+ RAM.'
},
{
  id: 'qwen-2.5-1.5b',
  name: 'Qwen 2.5 1.5B (Light)',
  filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
  sizeLabel: '1.13 GB',
  description: 'Fast response times. Balanced for lower memory usage.'
},
{
  id: 'llama-3.2-1b',
  name: 'Llama 3.2 1B (Ultra-Light)',
  filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
  downloadUrl: 'https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-1b-instruct-q4_k_m.gguf',
  sizeLabel: '0.81 GB',
  description: 'Extremely fast. Minimal RAM footprint, fits all devices.'
}];


/*
 * ModelStatus — Union type representing the possible states of the LLM.
 */


/*
 * MODEL_DIR — The directory where we expect the model file to be stored.
 * We prioritize ExternalDirectoryPath so that it's located on external storage
 * where users can easily access and delete it manually via a computer or file manager
 * to free up space, with DocumentDirectoryPath as a fallback.
 */
const MODEL_DIR = RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;

/*
 * DOWNLOAD_FALLBACK_DIR — Alternative path for dev/testing.
 */
const DOWNLOAD_FALLBACK_DIR = '/sdcard/Download';

/*
 * StatusListener — Callback type for status change notifications.
 */


/*
 * modelContext — The active llama.rn context, or null if not loaded.
 */
let modelContext = null;

/*
 * currentStatus — The current lifecycle status of the LLM.
 */
let currentStatus = 'not_downloaded';

/*
 * errorMessage — Stores the last error message if status is 'error'.
 */
let errorMessage = '';

/*
 * resolvedModelPath — The full filesystem path to the model file.
 */
let resolvedModelPath = null;

/*
 * downloadProgress — Current download percentage (0 to 100).
 */
let downloadProgress = 0;

/*
 * progressListeners — Registered callbacks for download progress notifications.
 */
const progressListeners = [];

/*
 * activeDownloadJobId — The job ID returned by RNFS.downloadFile to allow cancellation.
 */
let activeDownloadJobId = null;

/*
 * listeners — Array of registered status change listeners.
 */
const listeners = [];

/*
 * activeModel — The currently active model configuration.
 */
let activeModel = MODELS[0];

/*
 * isInitialized — Tracks if saved preferences have been loaded from disk.
 */
let isInitialized = false;

/*
 * isCancelled — Tracks if the current text generation process was aborted.
 */
let isCancelled = false;

/*
 * notifyListeners — Broadcasts the current status to all registered listeners.
 */
const notifyListeners = () => {
  listeners.forEach((listener) => listener(currentStatus));
};

/*
 * setStatus — Updates the current model status and notifies listeners.
 */
const setStatus = (status) => {
  currentStatus = status;
  notifyListeners();
};

/*
 * verifyModelFile — Checks if a file exists and is of sufficient size (>= 100MB).
 * If it is smaller, we treat it as corrupted, clean it up, and return false.
 */
const verifyModelFile = async (path) => {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) {
      return false;
    }
    const stats = await RNFS.stat(path);
    const MIN_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
    if (Number(stats.size) < MIN_SIZE_BYTES) {
      console.warn(`[ModelManager] File at ${path} is too small (${stats.size} bytes). Treating as corrupt/partial and deleting.`);
      try {
        await RNFS.unlink(path);
      } catch (err) {
        console.error(`[ModelManager] Error deleting corrupted file ${path}:`, err);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[ModelManager] Error verifying model file at ${path}:`, error);
    return false;
  }
};

/*
 * loadSavedModelPreference — Loads user preferences from AsyncStorage.
 */
const loadSavedModelPreference = async () => {
  try {
    const savedModelId = await AsyncStorage.getItem(ACTIVE_MODEL_KEY);
    if (savedModelId) {
      const found = MODELS.find((m) => m.id === savedModelId);
      if (found) {
        activeModel = found;
        console.log('[ModelManager] Loaded active model preference:', activeModel.id);
      }
    }
  } catch (err) {
    console.error('[ModelManager] Error loading model ID preference:', err);
  }

  // Check file existence for the active model
  const pathToCheck = `${MODEL_DIR}/${activeModel.filename}`;
  const existsInPrimary = await verifyModelFile(pathToCheck);
  let exists = existsInPrimary;
  resolvedModelPath = existsInPrimary ? pathToCheck : null;

  // Fallback 1: Internal storage if primary is external
  if (!exists && MODEL_DIR !== RNFS.DocumentDirectoryPath) {
    const internalPath = `${RNFS.DocumentDirectoryPath}/${activeModel.filename}`;
    const existsInInternal = await verifyModelFile(internalPath);
    if (existsInInternal) {
      resolvedModelPath = internalPath;
      exists = true;
    }
  }

  // Fallback 2: Public Download directory
  if (!exists) {
    const fallbackPath = `${DOWNLOAD_FALLBACK_DIR}/${activeModel.filename}`;
    const existsInFallback = await verifyModelFile(fallbackPath);
    if (existsInFallback) {
      resolvedModelPath = fallbackPath;
      exists = true;
    }
  }

  if (exists) {
    setStatus('idle');
    try {
      const shouldLoadStr = await AsyncStorage.getItem(SHOULD_LOAD_KEY);
      if (shouldLoadStr === 'true') {
        console.log('[ModelManager] Model was previously loaded. Autoloading...');
        initializeModel().catch((err) => {
          console.error('[ModelManager] Startup autoload failed:', err);
        });
      }
    } catch (err) {
      console.error('[ModelManager] Error checking should-load preference:', err);
    }
  } else {
    setStatus('not_downloaded');
  }
};

/*
 * checkModelExists — Checks if the GGUF model file exists on the device.
 */
const checkModelExists = async () => {
  try {
    if (!isInitialized) {
      isInitialized = true;
      await loadSavedModelPreference();
      return currentStatus === 'idle' || currentStatus === 'ready';
    }

    const primaryPath = `${MODEL_DIR}/${activeModel.filename}`;
    const existsInPrimary = await verifyModelFile(primaryPath);

    if (existsInPrimary) {
      resolvedModelPath = primaryPath;
      setStatus('idle');
      return true;
    }

    // Fallback 1: Internal storage if primary is external
    if (MODEL_DIR !== RNFS.DocumentDirectoryPath) {
      const internalPath = `${RNFS.DocumentDirectoryPath}/${activeModel.filename}`;
      const existsInInternal = await verifyModelFile(internalPath);
      if (existsInInternal) {
        resolvedModelPath = internalPath;
        setStatus('idle');
        return true;
      }
    }

    // Fallback 2: Public Download directory
    const fallbackPath = `${DOWNLOAD_FALLBACK_DIR}/${activeModel.filename}`;
    const existsInFallback = await verifyModelFile(fallbackPath);

    if (existsInFallback) {
      resolvedModelPath = fallbackPath;
      setStatus('idle');
      return true;
    }

    resolvedModelPath = null;
    setStatus('not_downloaded');
    return false;
  } catch (error) {
    console.error('[ModelManager] Error checking model file:', error);
    resolvedModelPath = null;
    setStatus('not_downloaded');
    return false;
  }
};

/*
 * initializeModel — Loads the GGUF model into memory and creates an inference context.
 */
const initializeModel = async () => {
  try {
    if (modelContext && currentStatus === 'ready') {
      console.log('[ModelManager] Model is already loaded and ready.');
      return true;
    }

    const exists = await checkModelExists();
    if (!exists || !resolvedModelPath) {
      errorMessage = `Model file "${activeModel.filename}" not found. Go to Settings to download it.`;
      setStatus('error');
      return false;
    }

    setStatus('loading');
    errorMessage = '';

    console.log(`[ModelManager] Loading model from: ${resolvedModelPath}`);

    const startTime = Date.now();
    modelContext = await initLlama({
      model: resolvedModelPath,
      n_ctx: 2048,
      n_gpu_layers: 0,
      use_mlock: true,
      n_threads: 4
    });
    const duration = Date.now() - startTime;
    recordModelLoad(duration);

    console.log('[ModelManager] Model loaded successfully!');
    setStatus('ready');

    // Save should-load state so it autoloads on next startup
    await AsyncStorage.setItem(SHOULD_LOAD_KEY, 'true');
    return true;
  } catch (error) {
    console.error('[ModelManager] Failed to load model:', error);
    errorMessage = error?.message || 'Unknown error loading model';
    setStatus('error');
    modelContext = null;
    return false;
  }
};

/*
 * releaseModel — Unloads the model from memory and frees all resources.
 */
const releaseModel = async () => {
  try {
    if (modelContext) {
      await modelContext.release();
      console.log('[ModelManager] Model released successfully.');
    }
  } catch (error) {
    console.error('[ModelManager] Error releasing model:', error);
  } finally {
    modelContext = null;
    setStatus('idle');
    // Save should-load state so it does NOT autoload on next startup
    await AsyncStorage.setItem(SHOULD_LOAD_KEY, 'false');
  }
};

/*
 * getContext — Returns the current LlamaContext for inference.
 */
const getContext = () => {
  return modelContext;
};

/*
 * getStatus — Returns the current model lifecycle status.
 */
const getStatus = () => {
  return currentStatus;
};

/*
 * getError — Returns the last error message, if any.
 */
const getError = () => {
  return errorMessage;
};

/*
 * getModelPath — Returns the expected filesystem path for the model.
 */
const getModelPath = () => {
  return resolvedModelPath || `${MODEL_DIR}/${activeModel.filename}`;
};

/*
 * getModels — Returns all available model options.
 */
const getModels = () => {
  return MODELS;
};

/*
 * getActiveModel — Returns the currently selected active model.
 */
const getActiveModel = () => {
  return activeModel;
};

/*
 * setActiveModel — Switch the active model configuration.
 */
const setActiveModel = async (modelId) => {
  const found = MODELS.find((m) => m.id === modelId);
  if (!found) {
    console.error(`[ModelManager] Model ID "${modelId}" not found in MODELS list.`);
    return false;
  }

  if (activeModel.id === found.id) {
    return true;
  }

  console.log(`[ModelManager] Switching active model to: ${found.id}`);

  // Unload old model context first if loaded
  if (modelContext) {
    await releaseModel();
  }

  activeModel = found;

  // Persist settings
  await AsyncStorage.setItem(ACTIVE_MODEL_KEY, found.id);
  await AsyncStorage.setItem(SHOULD_LOAD_KEY, 'false');

  // Trigger check existence for new model (forces updates to status and path)
  isInitialized = true;
  await checkModelExists();

  return true;
};

/*
 * stopCompletion — Stops/aborts any active text generation completion.
 */
const stopCompletion = async () => {
  if (modelContext) {
    isCancelled = true;
    await modelContext.stopCompletion();
    console.log('[ModelManager] Text generation cancelled by user request.');
  }
};

/*
 * getIsCancelled — Returns whether user aborted the current completion.
 */
const getIsCancelled = () => {
  return isCancelled;
};

/*
 * resetIsCancelled — Resets the cancellation flag.
 */
const resetIsCancelled = () => {
  isCancelled = false;
};

/*
 * setGenerating — Transition model status between ready and generating states.
 */
const setGenerating = (generating) => {
  if (generating) {
    if (currentStatus === 'ready') {
      setStatus('generating');
    }
  } else {
    if (currentStatus === 'generating') {
      setStatus('ready');
    }
  }
};

/*
 * handleCrash — Frees memory and context upon experiencing a crash, transitioning status to error.
 */
const handleCrash = async (error) => {
  console.error('[ModelManager] Crash detected, initiating recovery...', error);
  errorMessage = error?.message || 'Inference engine crashed';
  try {
    if (modelContext) {
      await modelContext.release();
    }
  } catch (err) {
    console.error('[ModelManager] Error releasing context during crash recovery:', err);
  } finally {
    modelContext = null;
    setStatus('error');
    // Save should-load state so it does NOT autoload on next startup and cause crash loops
    await AsyncStorage.setItem(SHOULD_LOAD_KEY, 'false');
  }
};

/*
 * addProgressListener — Registers a callback for download progress updates.
 */
const addProgressListener = (listener) => {
  progressListeners.push(listener);
  return () => {
    const index = progressListeners.findIndex((l) => l === listener);
    if (index !== -1) {
      progressListeners.splice(index, 1);
    }
  };
};

/*
 * getDownloadProgress — Returns the current download progress percentage.
 */
const getDownloadProgress = () => {
  return downloadProgress;
};

/*
 * downloadModel — Downloads the GGUF model file from Hugging Face.
 */
const downloadModel = async () => {
  const targetPath = `${MODEL_DIR}/${activeModel.filename}`;
  const tempTargetPath = `${targetPath}.tmp`;

  try {
    if (currentStatus === 'downloading') {
      console.warn('[ModelManager] Download is already in progress.');
      return false;
    }

    setStatus('downloading');
    downloadProgress = 0;
    errorMessage = '';

    const dirExists = await RNFS.exists(MODEL_DIR);
    if (!dirExists) {
      await RNFS.mkdir(MODEL_DIR);
    }

    const downloadUrl = activeModel.downloadUrl;
    console.log(`[ModelManager] Downloading model from ${downloadUrl} to ${tempTargetPath}`);

    const options = {
      fromUrl: downloadUrl,
      toFile: tempTargetPath,
      begin: (res) => {
        activeDownloadJobId = res.jobId;
        console.log('[ModelManager] Download started. Job ID:', res.jobId);
      },
      progress: (res) => {
        if (res.contentLength > 0) {
          const ratio = res.bytesWritten / res.contentLength;
          downloadProgress = Math.round(ratio * 100);
          progressListeners.forEach((listener) => listener(downloadProgress));
        }
      },
      progressInterval: 500
    };

    const result = await RNFS.downloadFile(options).promise;
    activeDownloadJobId = null;

    if (result.statusCode === 200) {
      console.log('[ModelManager] Download completed successfully!');

      // Remove target file if it already exists before renaming
      const targetExists = await RNFS.exists(targetPath);
      if (targetExists) {
        await RNFS.unlink(targetPath);
      }

      await RNFS.moveFile(tempTargetPath, targetPath);
      resolvedModelPath = targetPath;
      setStatus('idle');
      return true;
    } else {
      // Clean up temp file on failure
      const tempExists = await RNFS.exists(tempTargetPath);
      if (tempExists) {
        await RNFS.unlink(tempTargetPath);
      }
      throw new Error(`Download failed with HTTP status code ${result.statusCode}`);
    }
  } catch (error) {
    console.error('[ModelManager] Error downloading model:', error);
    activeDownloadJobId = null;

    // Clean up temp file on error
    try {
      const tempExists = await RNFS.exists(tempTargetPath);
      if (tempExists) {
        await RNFS.unlink(tempTargetPath);
      }
    } catch (cleanErr) {
      console.error('[ModelManager] Error cleaning up temp download file:', cleanErr);
    }

    errorMessage = error?.message || 'Failed to download model';
    setStatus('error');
    return false;
  }
};

/*
 * cancelDownload — Cancels the active model download task.
 */
const cancelDownload = async () => {
  if (activeDownloadJobId !== null) {
    try {
      await RNFS.stopDownload(activeDownloadJobId);
      console.log('[ModelManager] Active download stopped.');

      const targetPath = `${MODEL_DIR}/${activeModel.filename}`;
      const tempTargetPath = `${targetPath}.tmp`;
      const tempExists = await RNFS.exists(tempTargetPath);
      if (tempExists) {
        await RNFS.unlink(tempTargetPath);
      }
    } catch (error) {
      console.error('[ModelManager] Error stopping download / cleaning up temp file:', error);
    } finally {
      activeDownloadJobId = null;
      downloadProgress = 0;
      setStatus('not_downloaded');
    }
  }
};

const addStatusListener = (listener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.findIndex((l) => l === listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/*
 * Export all public functions as a single object.
 */
export default {
  checkModelExists,
  initializeModel,
  releaseModel,
  getContext,
  getStatus,
  getError,
  getModelPath,
  addStatusListener,
  downloadModel,
  cancelDownload,
  getDownloadProgress,
  addProgressListener,
  getModels,
  getActiveModel,
  setActiveModel,
  stopCompletion,
  getIsCancelled,
  resetIsCancelled,
  setGenerating,
  handleCrash
};