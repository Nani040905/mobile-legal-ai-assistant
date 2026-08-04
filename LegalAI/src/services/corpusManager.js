/*
 * corpusManager.js — Legal Corpus Infrastructure Service.
 *
 * PURPOSE: Manages the index structures, query configurations, search interfaces,
 * and parameters for retrieval/reference checks against the local legal corpus.
 */

import actsMetadata from '../../assets/legal/acts_metadata.json';

/**
 * Searches the legal corpus metadata for a given term or act code.
 *
 * @param {string} query — Search keywords (e.g. "cheating", "BNS")
 * @returns {Promise<Array>} List of matching legal acts or section index references
 */
export const searchCorpusMetadata = async (query) => {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();
  return actsMetadata.acts.filter(
    (act) =>
      act.name.toLowerCase().includes(lowerQuery) ||
      act.abbreviation.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Retrieves the full metadata record of a specific legal act by ID.
 *
 * @param {string} actId — Unique act identifier (e.g., "ipc_1860")
 * @returns {Promise<Object|null>} The act object if found, otherwise null
 */
export const getActMetadata = async (actId) => {
  return actsMetadata.acts.find((act) => act.id === actId) || null;
};

/**
 * Search parameter guidelines for retrieval configuration.
 * Documented for integration when legal text indices are built.
 */
export const RETRIEVAL_GUIDELINES = {
  defaultTopK: 3,
  maxContextBudgetCharacters: 3000,
  similarityThreshold: 0.65,
  useStemming: true
};
