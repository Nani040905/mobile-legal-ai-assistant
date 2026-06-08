/*
 * storageService.ts — Thin wrapper around AsyncStorage for data persistence.
 *
 * PURPOSE: Provides a clean, typed API for saving and loading data from
 * React Native's AsyncStorage. Other services and stores call these
 * functions instead of using AsyncStorage directly.
 *
 * DESIGN DECISIONS:
 * - Wrapper pattern — if we ever switch storage backends (e.g., to MMKV
 *   for better performance), we only change this one file.
 * - JSON serialization built in — AsyncStorage only stores strings,
 *   so we handle JSON.stringify/parse here.
 * - Error handling with try/catch — prevents crashes from storage failures.
 * - Generic type parameter <T> — works with any data shape.
 *
 * USAGE:
 *   await saveData('my-key', { foo: 'bar' });
 *   const data = await loadData<MyType>('my-key');
 */

/* Import AsyncStorage — React Native's key-value storage API */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';

/*
 * STORAGE_KEYS — Centralized key constants for all stored data.
 *
 * Using constants (not inline strings) prevents typos and makes it
 * easy to find all storage access points via "Find References".
 * If we rename a key, we only change it here.
 */
export const STORAGE_KEYS = {
  DOCUMENTS: 'legal-ai-documents',     // Key for the documents metadata array
  CHAT_MESSAGES: 'legal-ai-chat',      // Key for chat messages (managed by Zustand persist)
  SETTINGS: 'legal-ai-settings',       // Key for app settings
};

/*
 * saveData — Serializes and saves a value securely.
 *
 * @param key — The storage key (use STORAGE_KEYS constants).
 * @param value — Any serializable JavaScript value (object, array, string, number).
 * @returns A Promise that resolves when saving is complete.
 */
export const saveData = async <T>(key: string, value: T): Promise<void> => {
  try {
    /* Convert the value to a JSON string */
    const jsonValue = JSON.stringify(value);

    /* Save securely */
    await secureStorage.setItem(key, jsonValue);
  } catch (error) {
    /* Log the error but don't crash — storage failures shouldn't break the app */
    console.error(`[StorageService] Error saving data for key "${key}":`, error);
  }
};

/*
 * loadData — Reads and decrypts a value securely.
 *
 * @param key — The storage key to read from.
 * @returns A Promise that resolves to the parsed value, or null if not found.
 */
export const loadData = async <T>(key: string): Promise<T | null> => {
  try {
    /* Read and decrypt the raw JSON string */
    const jsonValue = await secureStorage.getItem(key);

    /* If the key doesn't exist, returns null */
    if (jsonValue === null) {
      return null; // No data stored for this key
    }

    /* Parse the JSON string back to its original JavaScript type */
    return JSON.parse(jsonValue) as T;
  } catch (error) {
    /* Log the error and return null — treat read failures as "no data" */
    console.error(`[StorageService] Error loading data for key "${key}":`, error);
    return null;
  }
};

/*
 * removeData — Deletes a value securely.
 *
 * @param key — The storage key to delete.
 * @returns A Promise that resolves when deletion is complete.
 */
export const removeData = async (key: string): Promise<void> => {
  try {
    /* Remove the key-value pair securely */
    await secureStorage.removeItem(key);
  } catch (error) {
    console.error(`[StorageService] Error removing data for key "${key}":`, error);
  }
};

/*
 * clearAllData — Removes ALL data from AsyncStorage.
 *
 * @returns A Promise that resolves when clearing is complete.
 *
 * WARNING: This is a destructive operation — it deletes everything.
 * Used by the Settings screen "Clear All Documents" button.
 * AsyncStorage.clear() removes every key, not just our app's keys.
 */
export const clearAllData = async (): Promise<void> => {
  try {
    /* Remove all key-value pairs from AsyncStorage */
    await AsyncStorage.clear();
  } catch (error) {
    console.error('[StorageService] Error clearing all data:', error);
  }
};

/*
 * getStorageSize — Estimates the total storage used by our app.
 *
 * @returns A Promise that resolves to the total size in bytes.
 *
 * How it works:
 * 1. Get all keys stored in AsyncStorage
 * 2. Read the value for each key
 * 3. Sum up the string lengths (approximate byte count for UTF-8 ASCII)
 *
 * Note: This is an approximation — string.length gives character count,
 * not exact byte count, but it's close enough for display purposes.
 */
export const getStorageSize = async (): Promise<number> => {
  try {
    /* Get all keys in AsyncStorage */
    const keys = await AsyncStorage.getAllKeys();

    /* Read all values for those keys — returns an object mapping keys to values */
    const entries = await AsyncStorage.getMany(keys);

    /* Sum up the lengths of all values to estimate total storage */
    let totalSize = 0;
    for (const key of keys) {
      const value = entries[key];
      if (value) {
        totalSize += value.length; // Approximate byte count
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[StorageService] Error calculating storage size:', error);
    return 0; // Return 0 on error — better than crashing
  }
};
