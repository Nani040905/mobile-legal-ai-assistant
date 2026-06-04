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
 * 4. User taps "Unload Model" or app backgrounds → releaseModel() → status becomes 'idle'
 */

/* Import the initLlama function from llama.rn — this is the main entry point */
import { initLlama, LlamaContext } from 'llama.rn';

/* Import RNFS to check if the model file exists on the device filesystem */
import RNFS from 'react-native-fs';

/*
 * ModelStatus — Union type representing the possible states of the LLM.
 *
 * 'not_downloaded' — The .gguf file does not exist on the device.
 * 'idle'           — The file exists but the model is not loaded into memory.
 * 'loading'        — The model is currently being loaded (takes 10-30 seconds).
 * 'ready'          — The model is loaded and ready to accept prompts.
 * 'error'          — An error occurred during loading.
 */
export type ModelStatus = 'not_downloaded' | 'idle' | 'loading' | 'ready' | 'error';

/*
 * MODEL_FILENAME — The name of the GGUF model file to look for.
 *
 * This is the Qwen 2.5 3B Instruct model quantized to Q4_K_M (4-bit).
 * Q4_K_M is the sweet spot for mobile: ~1.93 GB size, good quality output,
 * and reasonable inference speed on ARM CPUs.
 */
const MODEL_FILENAME = 'qwen2.5-3b-instruct-q4_k_m.gguf';

/*
 * MODEL_DIR — The directory where we expect the model file to be stored.
 *
 * RNFS.DocumentDirectoryPath is the app's private internal storage
 * (e.g. /data/data/com.legalai/files on Android).
 * For development, we also check /sdcard/Download/ as a fallback
 * so we can use `adb push` to deploy the model file.
 */
const MODEL_DIR = RNFS.DocumentDirectoryPath;

/*
 * DOWNLOAD_FALLBACK_DIR — Alternative path for dev/testing.
 *
 * When developing, it's easier to do:
 *   adb push model.gguf /sdcard/Download/
 * than to manually copy into the app's private directory.
 */
const DOWNLOAD_FALLBACK_DIR = '/sdcard/Download';

/*
 * StatusListener — Callback type for status change notifications.
 *
 * Components register listeners to react to model status changes
 * (e.g., updating a loading indicator or enabling/disabling the chat input).
 */
type StatusListener = (status: ModelStatus) => void;

/*
 * modelContext — The active llama.rn context, or null if not loaded.
 *
 * This is the singleton instance. Only one context exists at a time.
 * All inference calls go through this context.
 */
let modelContext: LlamaContext | null = null;

/*
 * currentStatus — The current lifecycle status of the LLM.
 *
 * Starts as 'not_downloaded' — will be updated by checkModelExists().
 */
let currentStatus: ModelStatus = 'not_downloaded';

/*
 * errorMessage — Stores the last error message if status is 'error'.
 *
 * Used by the UI to display a human-readable error string.
 */
let errorMessage: string = '';

/*
 * resolvedModelPath — The full filesystem path to the model file.
 *
 * Set by checkModelExists() once the file is found.
 * null if the file does not exist on the device.
 */
let resolvedModelPath: string | null = null;

/*
 * listeners — Array of registered status change listeners.
 *
 * Components call addStatusListener() to subscribe and receive
 * status updates without polling.
 */
const listeners: StatusListener[] = [];

/*
 * notifyListeners — Broadcasts the current status to all registered listeners.
 *
 * Called internally whenever the status changes (loading → ready, etc.).
 * Each listener receives the new status value.
 */
const notifyListeners = () => {
  /* Iterate over all registered listener callbacks */
  listeners.forEach(listener => listener(currentStatus));
};

/*
 * setStatus — Updates the current model status and notifies listeners.
 *
 * @param status — The new ModelStatus value.
 *
 * This is the ONLY function that modifies currentStatus.
 * Centralizing status updates ensures listeners are always notified.
 */
const setStatus = (status: ModelStatus) => {
  /* Update the module-level status variable */
  currentStatus = status;
  /* Notify all registered UI listeners about the change */
  notifyListeners();
};

/*
 * checkModelExists — Checks if the GGUF model file exists on the device.
 *
 * Checks two locations in order:
 * 1. App's internal directory (MODEL_DIR) — production location
 * 2. /sdcard/Download/ — development convenience (adb push target)
 *
 * Updates resolvedModelPath and sets status to 'idle' if found,
 * or 'not_downloaded' if not found.
 *
 * @returns true if the model file exists, false otherwise.
 */
const checkModelExists = async (): Promise<boolean> => {
  try {
    /* First, check the app's private internal storage directory */
    const primaryPath = `${MODEL_DIR}/${MODEL_FILENAME}`;
    /* RNFS.exists() returns a Promise<boolean> — true if file exists */
    const existsInPrimary = await RNFS.exists(primaryPath);

    if (existsInPrimary) {
      /* Model found in the primary location */
      resolvedModelPath = primaryPath;
      /* Update status to idle (file exists but not loaded yet) */
      setStatus('idle');
      return true;
    }

    /* Fallback: check /sdcard/Download/ for development convenience */
    const fallbackPath = `${DOWNLOAD_FALLBACK_DIR}/${MODEL_FILENAME}`;
    /* Check if the file exists in the fallback location */
    const existsInFallback = await RNFS.exists(fallbackPath);

    if (existsInFallback) {
      /* Model found in the fallback (development) location */
      resolvedModelPath = fallbackPath;
      /* Update status to idle */
      setStatus('idle');
      return true;
    }

    /* Model file not found in either location */
    resolvedModelPath = null;
    /* Update status to not_downloaded */
    setStatus('not_downloaded');
    return false;
  } catch (error) {
    /* If filesystem check fails, treat as not downloaded */
    console.error('[ModelManager] Error checking model file:', error);
    resolvedModelPath = null;
    setStatus('not_downloaded');
    return false;
  }
};

/*
 * initializeModel — Loads the GGUF model into memory and creates an inference context.
 *
 * This is the most expensive operation in the app — it reads ~2 GB from disk
 * and allocates memory for the model weights, KV cache, and scratch buffers.
 * Typically takes 10-30 seconds on a mid-range Android device.
 *
 * The function first checks if the model file exists, then calls llama.rn's
 * initLlama() with carefully tuned parameters for mobile use.
 *
 * @returns true if the model was loaded successfully, false otherwise.
 */
const initializeModel = async (): Promise<boolean> => {
  try {
    /* If already loaded, skip re-initialization */
    if (modelContext && currentStatus === 'ready') {
      console.log('[ModelManager] Model is already loaded and ready.');
      return true;
    }

    /* Check if the model file exists on the device */
    const exists = await checkModelExists();
    if (!exists || !resolvedModelPath) {
      /* Cannot load what doesn't exist */
      errorMessage = `Model file "${MODEL_FILENAME}" not found. Push it to ${DOWNLOAD_FALLBACK_DIR}/ via adb.`;
      setStatus('error');
      return false;
    }

    /* Update status to loading — UI should show a spinner or progress bar */
    setStatus('loading');
    /* Clear any previous error message */
    errorMessage = '';

    console.log(`[ModelManager] Loading model from: ${resolvedModelPath}`);

    /*
     * initLlama() — The core llama.rn function that:
     * 1. Reads the GGUF file from disk
     * 2. Allocates memory for the model weights
     * 3. Creates a KV cache for inference context
     * 4. Returns a LlamaContext object for running completions
     *
     * Configuration parameters:
     * - model: Full filesystem path to the .gguf file
     * - n_ctx: Context window size in tokens (2048 is conservative/safe)
     * - n_gpu_layers: 0 = CPU only (avoids GPU compatibility issues on Android)
     * - use_mlock: true = lock model weights in RAM (prevents paging to disk)
     * - n_threads: 4 = number of CPU threads for inference (good for most devices)
     */
    modelContext = await initLlama({
      model: resolvedModelPath,   // Full path to the GGUF model file
      n_ctx: 2048,                // Context window: 2048 tokens (~8K characters)
      n_gpu_layers: 0,            // CPU-only: avoids Adreno GPU crashes
      use_mlock: true,            // Lock model in RAM: prevents swap-to-disk slowdowns
      n_threads: 4,               // 4 threads: good balance for quad/octa-core mobile CPUs
    });

    /* Model loaded successfully — update status to ready */
    console.log('[ModelManager] Model loaded successfully!');
    setStatus('ready');
    return true;
  } catch (error: any) {
    /* Loading failed — update status to error and store the error message */
    console.error('[ModelManager] Failed to load model:', error);
    errorMessage = error?.message || 'Unknown error loading model';
    setStatus('error');
    /* Clean up the failed context reference */
    modelContext = null;
    return false;
  }
};

/*
 * releaseModel — Unloads the model from memory and frees all resources.
 *
 * Should be called when:
 * - User taps "Unload Model" in Settings
 * - App is backgrounded for a long time (future optimization)
 * - Before loading a different model
 *
 * After release, the context is set to null and status returns to 'idle'.
 */
const releaseModel = async (): Promise<void> => {
  try {
    if (modelContext) {
      /* Release the llama.rn context — frees all native memory */
      await modelContext.release();
      console.log('[ModelManager] Model released successfully.');
    }
  } catch (error) {
    /* Log but don't throw — release errors are non-critical */
    console.error('[ModelManager] Error releasing model:', error);
  } finally {
    /* Always clear the context reference, even if release() throws */
    modelContext = null;
    /* Set status back to idle (file still exists, just not loaded) */
    setStatus('idle');
  }
};

/*
 * getContext — Returns the current LlamaContext for inference.
 *
 * @returns The active LlamaContext, or null if the model is not loaded.
 *
 * This is what llmService.ts calls to get the context for completion().
 * Always check for null before using — the model might not be loaded.
 */
const getContext = (): LlamaContext | null => {
  return modelContext;
};

/*
 * getStatus — Returns the current model lifecycle status.
 *
 * @returns The current ModelStatus string.
 */
const getStatus = (): ModelStatus => {
  return currentStatus;
};

/*
 * getError — Returns the last error message, if any.
 *
 * @returns The error string, or empty string if no error.
 */
const getError = (): string => {
  return errorMessage;
};

/*
 * getModelPath — Returns the expected filesystem path for the model.
 *
 * @returns The path where the model file should be located.
 *
 * Useful for the UI to display "Push model to: /sdcard/Download/..." instructions.
 */
const getModelPath = (): string => {
  return resolvedModelPath || `${DOWNLOAD_FALLBACK_DIR}/${MODEL_FILENAME}`;
};

/*
 * addStatusListener — Registers a callback for status change notifications.
 *
 * @param listener — Function to call when the model status changes.
 * @returns A cleanup function that removes the listener (for useEffect teardown).
 *
 * Usage in React components:
 *   useEffect(() => {
 *     const cleanup = modelManager.addStatusListener(setModelStatus);
 *     return cleanup; // Removes listener on unmount
 *   }, []);
 */
const addStatusListener = (listener: StatusListener): (() => void) => {
  /* Add the listener to our internal array */
  listeners.push(listener);

  /*
   * Return a cleanup function that removes this specific listener.
   * findIndex + splice is used instead of filter to mutate the array
   * in-place (avoids creating a new array reference on every remove).
   */
  return () => {
    const index = listeners.findIndex(l => l === listener);
    if (index !== -1) {
      listeners.splice(index, 1); // Remove the listener from the array
    }
  };
};

/*
 * Export all public functions as a single object.
 *
 * This module acts as a singleton service — there's no class to instantiate.
 * Components import it as: import modelManager from '../services/modelManager';
 */
export default {
  checkModelExists,     // Check if .gguf file is on device
  initializeModel,      // Load model into memory
  releaseModel,         // Unload model from memory
  getContext,           // Get the active LlamaContext
  getStatus,            // Get current status string
  getError,             // Get last error message
  getModelPath,         // Get expected model file path
  addStatusListener,    // Subscribe to status changes
};
