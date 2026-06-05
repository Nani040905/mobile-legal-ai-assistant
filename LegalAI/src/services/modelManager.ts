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
import { initLlama, LlamaContext } from 'llama.rn';

/* Import RNFS to check if the model file exists on the device filesystem */
import RNFS from 'react-native-fs';

/* Import AsyncStorage to persist the model preference and load state */
import AsyncStorage from '@react-native-async-storage/async-storage';

/* Keys for storing preferences in AsyncStorage */
const ACTIVE_MODEL_KEY = 'legal-ai-active-model-id';
const SHOULD_LOAD_KEY = 'legal-ai-model-should-load';

/* ModelConfig interface defining the metadata of a local GGUF model option */
export interface ModelConfig {
  id: string;
  name: string;
  filename: string;
  downloadUrl: string;
  sizeLabel: string;
  description: string;
}

/* List of available offline LLM models for selection */
export const MODELS: ModelConfig[] = [
  {
    id: 'qwen-2.5-3b',
    name: 'Qwen 2.5 3B (Recommended)',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
    sizeLabel: '1.96 GB',
    description: 'Best quality & reasoning. Ideal for devices with 6GB+ RAM.',
  },
  {
    id: 'qwen-2.5-1.5b',
    name: 'Qwen 2.5 1.5B (Light)',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeLabel: '1.13 GB',
    description: 'Fast response times. Balanced for lower memory usage.',
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B (Ultra-Light)',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF/resolve/main/llama-3.2-1b-instruct-q4_k_m.gguf',
    sizeLabel: '0.81 GB',
    description: 'Extremely fast. Minimal RAM footprint, fits all devices.',
  },
];

/*
 * ModelStatus — Union type representing the possible states of the LLM.
 */
export type ModelStatus = 'not_downloaded' | 'downloading' | 'idle' | 'loading' | 'ready' | 'generating' | 'error';

/*
 * MODEL_DIR — The directory where we expect the model file to be stored.
 */
const MODEL_DIR = RNFS.DocumentDirectoryPath;

/*
 * DOWNLOAD_FALLBACK_DIR — Alternative path for dev/testing.
 */
const DOWNLOAD_FALLBACK_DIR = '/sdcard/Download';

/*
 * StatusListener — Callback type for status change notifications.
 */
type StatusListener = (status: ModelStatus) => void;

/*
 * modelContext — The active llama.rn context, or null if not loaded.
 */
let modelContext: LlamaContext | null = null;

/*
 * currentStatus — The current lifecycle status of the LLM.
 */
let currentStatus: ModelStatus = 'not_downloaded';

/*
 * errorMessage — Stores the last error message if status is 'error'.
 */
let errorMessage: string = '';

/*
 * resolvedModelPath — The full filesystem path to the model file.
 */
let resolvedModelPath: string | null = null;

/*
 * downloadProgress — Current download percentage (0 to 100).
 */
let downloadProgress: number = 0;

/*
 * progressListeners — Registered callbacks for download progress notifications.
 */
const progressListeners: ((progress: number) => void)[] = [];

/*
 * activeDownloadJobId — The job ID returned by RNFS.downloadFile to allow cancellation.
 */
let activeDownloadJobId: number | null = null;

/*
 * listeners — Array of registered status change listeners.
 */
const listeners: StatusListener[] = [];

/*
 * activeModel — The currently active model configuration.
 */
let activeModel: ModelConfig = MODELS[0];

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
  listeners.forEach(listener => listener(currentStatus));
};

/*
 * setStatus — Updates the current model status and notifies listeners.
 */
const setStatus = (status: ModelStatus) => {
  currentStatus = status;
  notifyListeners();
};

/*
 * loadSavedModelPreference — Loads user preferences from AsyncStorage.
 */
const loadSavedModelPreference = async () => {
  try {
    const savedModelId = await AsyncStorage.getItem(ACTIVE_MODEL_KEY);
    if (savedModelId) {
      const found = MODELS.find(m => m.id === savedModelId);
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
  const existsInPrimary = await RNFS.exists(pathToCheck);
  let exists = existsInPrimary;
  resolvedModelPath = existsInPrimary ? pathToCheck : null;

  if (!exists && RNFS.ExternalDirectoryPath) {
    const externalPath = `${RNFS.ExternalDirectoryPath}/${activeModel.filename}`;
    const existsInExternal = await RNFS.exists(externalPath);
    if (existsInExternal) {
      resolvedModelPath = externalPath;
      exists = true;
    }
  }

  if (!exists) {
    const fallbackPath = `${DOWNLOAD_FALLBACK_DIR}/${activeModel.filename}`;
    const existsInFallback = await RNFS.exists(fallbackPath);
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
        initializeModel().catch(err => {
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
const checkModelExists = async (): Promise<boolean> => {
  try {
    if (!isInitialized) {
      isInitialized = true;
      await loadSavedModelPreference();
      return currentStatus === 'idle' || currentStatus === 'ready';
    }

    const primaryPath = `${MODEL_DIR}/${activeModel.filename}`;
    const existsInPrimary = await RNFS.exists(primaryPath);

    if (existsInPrimary) {
      resolvedModelPath = primaryPath;
      setStatus('idle');
      return true;
    }

    if (RNFS.ExternalDirectoryPath) {
      const externalPath = `${RNFS.ExternalDirectoryPath}/${activeModel.filename}`;
      const existsInExternal = await RNFS.exists(externalPath);
      if (existsInExternal) {
        resolvedModelPath = externalPath;
        setStatus('idle');
        return true;
      }
    }

    const fallbackPath = `${DOWNLOAD_FALLBACK_DIR}/${activeModel.filename}`;
    const existsInFallback = await RNFS.exists(fallbackPath);

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
const initializeModel = async (): Promise<boolean> => {
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

    modelContext = await initLlama({
      model: resolvedModelPath,
      n_ctx: 2048,
      n_gpu_layers: 0,
      use_mlock: true,
      n_threads: 4,
    });

    console.log('[ModelManager] Model loaded successfully!');
    setStatus('ready');

    // Save should-load state so it autoloads on next startup
    await AsyncStorage.setItem(SHOULD_LOAD_KEY, 'true');
    return true;
  } catch (error: any) {
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
const releaseModel = async (): Promise<void> => {
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
const getContext = (): LlamaContext | null => {
  return modelContext;
};

/*
 * getStatus — Returns the current model lifecycle status.
 */
const getStatus = (): ModelStatus => {
  return currentStatus;
};

/*
 * getError — Returns the last error message, if any.
 */
const getError = (): string => {
  return errorMessage;
};

/*
 * getModelPath — Returns the expected filesystem path for the model.
 */
const getModelPath = (): string => {
  return resolvedModelPath || `${MODEL_DIR}/${activeModel.filename}`;
};

/*
 * getModels — Returns all available model options.
 */
const getModels = (): ModelConfig[] => {
  return MODELS;
};

/*
 * getActiveModel — Returns the currently selected active model.
 */
const getActiveModel = (): ModelConfig => {
  return activeModel;
};

/*
 * setActiveModel — Switch the active model configuration.
 */
const setActiveModel = async (modelId: string): Promise<boolean> => {
  const found = MODELS.find(m => m.id === modelId);
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
const stopCompletion = async (): Promise<void> => {
  if (modelContext) {
    isCancelled = true;
    await modelContext.stopCompletion();
    console.log('[ModelManager] Text generation cancelled by user request.');
  }
};

/*
 * getIsCancelled — Returns whether user aborted the current completion.
 */
const getIsCancelled = (): boolean => {
  return isCancelled;
};

/*
 * resetIsCancelled — Resets the cancellation flag.
 */
const resetIsCancelled = (): void => {
  isCancelled = false;
};

/*
 * setGenerating — Transition model status between ready and generating states.
 */
const setGenerating = (generating: boolean): void => {
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
const handleCrash = async (error: any): Promise<void> => {
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
const addProgressListener = (listener: (progress: number) => void): (() => void) => {
  progressListeners.push(listener);
  return () => {
    const index = progressListeners.findIndex(l => l === listener);
    if (index !== -1) {
      progressListeners.splice(index, 1);
    }
  };
};

/*
 * getDownloadProgress — Returns the current download progress percentage.
 */
const getDownloadProgress = (): number => {
  return downloadProgress;
};

/*
 * downloadModel — Downloads the GGUF model file from Hugging Face.
 */
const downloadModel = async (): Promise<boolean> => {
  try {
    if (currentStatus === 'downloading') {
      console.warn('[ModelManager] Download is already in progress.');
      return false;
    }

    setStatus('downloading');
    downloadProgress = 0;
    errorMessage = '';

    const targetPath = `${MODEL_DIR}/${activeModel.filename}`;

    const dirExists = await RNFS.exists(MODEL_DIR);
    if (!dirExists) {
      await RNFS.mkdir(MODEL_DIR);
    }

    const downloadUrl = activeModel.downloadUrl;
    console.log(`[ModelManager] Downloading model from ${downloadUrl} to ${targetPath}`);

    const options = {
      fromUrl: downloadUrl,
      toFile: targetPath,
      begin: (res: any) => {
        activeDownloadJobId = res.jobId;
        console.log('[ModelManager] Download started. Job ID:', res.jobId);
      },
      progress: (res: any) => {
        if (res.contentLength > 0) {
          const ratio = res.bytesWritten / res.contentLength;
          downloadProgress = Math.round(ratio * 100);
          progressListeners.forEach(listener => listener(downloadProgress));
        }
      },
      progressInterval: 500,
    };

    const result = await RNFS.downloadFile(options).promise;
    activeDownloadJobId = null;

    if (result.statusCode === 200) {
      console.log('[ModelManager] Download completed successfully!');
      resolvedModelPath = targetPath;
      setStatus('idle');
      return true;
    } else {
      throw new Error(`Download failed with HTTP status code ${result.statusCode}`);
    }
  } catch (error: any) {
    console.error('[ModelManager] Error downloading model:', error);
    activeDownloadJobId = null;
    errorMessage = error?.message || 'Failed to download model';
    setStatus('error');
    return false;
  }
};

/*
 * cancelDownload — Cancels the active model download task.
 */
const cancelDownload = async (): Promise<void> => {
  if (activeDownloadJobId !== null) {
    try {
      await RNFS.stopDownload(activeDownloadJobId);
      console.log('[ModelManager] Active download stopped.');
    } catch (error) {
      console.error('[ModelManager] Error stopping download:', error);
    } finally {
      activeDownloadJobId = null;
      downloadProgress = 0;
      setStatus('not_downloaded');
    }
  }
};

const addStatusListener = (listener: StatusListener): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.findIndex(l => l === listener);
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
  handleCrash,
};
