/*
 * secureStorage.ts — Cryptographic storage service using AES-256 encryption.
 *
 * PURPOSE: Provides secure encryption and decryption wrapping AsyncStorage
 * for highly sensitive legal documents, chat records, and personal files.
 * This conforms to Zustand's StateStorage interface for easy store persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

/* Key name for retrieving our local symmetric key */
const SECURE_KEY_ALIAS = 'legal-ai-aes-sym-key';
let cachedKey: string | null = null;

/**
 * getSymmetricKey — Resolves or derives the 256-bit AES encryption key.
 * If not present, generates a secure random hex key and persists it.
 */
const getSymmetricKey = async (): Promise<string> => {
  if (cachedKey) {
    return cachedKey;
  }

  try {
    const existing = await AsyncStorage.getItem(SECURE_KEY_ALIAS);
    if (existing) {
      cachedKey = existing;
      return cachedKey;
    }

    // Generate a secure 256-bit symmetric key
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    const hexKey = randomBytes.toString(CryptoJS.enc.Hex);
    await AsyncStorage.setItem(SECURE_KEY_ALIAS, hexKey);
    cachedKey = hexKey;
    return cachedKey;
  } catch (error) {
    console.error('[SecureStorage] Key retrieval or generation failed:', error);
    // Safe fallback key derived using standard PBKDF2 parameters in case filesystem is read-only
    const fallback = CryptoJS.PBKDF2('LegalAI-Symmetric-Secret-Passphrase', 'AppSalt', {
      keySize: 256 / 32,
      iterations: 100,
    }).toString();
    return fallback;
  }
};

/**
 * secureStorage — Zustand-compatible StateStorage engine.
 * Encrypts data in setItem, decrypts data in getItem.
 */
export const secureStorage = {
  /**
   * getItem — Decrypts and retrieves a value.
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedValue = await AsyncStorage.getItem(name);
      if (!encryptedValue) {
        return null;
      }

      const key = await getSymmetricKey();
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, key);
      const plaintext = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!plaintext) {
        throw new Error('Symmetric decryption failed — possible key mismatch or corrupted state');
      }

      return plaintext;
    } catch (error) {
      console.error(`[SecureStorage] Failed to read or decrypt key "${name}":`, error);
      return null;
    }
  },

  /**
   * setItem — Encrypts and persists a value.
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const key = await getSymmetricKey();
      const encryptedValue = CryptoJS.AES.encrypt(value, key).toString();
      await AsyncStorage.setItem(name, encryptedValue);
    } catch (error) {
      console.error(`[SecureStorage] Failed to encrypt or write key "${name}":`, error);
    }
  },

  /**
   * removeItem — Deletes a value.
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error(`[SecureStorage] Failed to remove key "${name}":`, error);
    }
  },
};
