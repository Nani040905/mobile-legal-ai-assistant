/*
 * entityTracker.js — Cross-document entity tracker service.
 *
 * PURPOSE: Scans document chunks to extract legal entities (people, dates, amounts, etc.)
 * using the on-device LLM, and aggregates them into a case-wide cross-referenced index.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

// Helper to parse entities via regex if JSON parsing fails
const parseEntitiesViaRegex = (rawText) => {
  const entities = [];
  const objectRegex = /\{[^{}]+\}/g;
  const matches = rawText.match(objectRegex);
  
  if (matches) {
    for (const objStr of matches) {
      const valueMatch = objStr.match(/"value"\s*:\s*"([^"]+)"/i);
      const typeMatch = objStr.match(/"type"\s*:\s*"([^"]+)"/i);

      if (valueMatch && typeMatch) {
        const type = typeMatch[1].trim().toLowerCase();
        // Validate type against allowed list
        const allowedTypes = ['person', 'date', 'amount', 'address', 'phone', 'vehicle', 'caseNumber', 'section'];
        if (allowedTypes.includes(type)) {
          entities.push({
            value: valueMatch[1].trim(),
            type
          });
        }
      }
    }
  }
  return entities;
};

/**
 * Extracts entities from a single document's chunks using the on-device LLM.
 * 
 * @param {string[]} chunks - Chunks of text from the document.
 * @param {string} docId - The unique ID of the document.
 * @param {string} docName - The human-readable name of the document.
 * @param {function} onChunkProgress - Callback to notify parent of progress.
 * @returns {Promise<Array>} - List of raw entity instances.
 */
export const extractEntitiesFromDoc = async (chunks, docId, docName, onChunkProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded.');
  }

  const rawEntities = [];
  // Scan up to first 5 chunks of each document to keep it fast and prevent context/time blowout on mobile
  const chunksToProcess = chunks.slice(0, 5);
  let chunkIndex = 0;

  for (const chunk of chunksToProcess) {
    chunkIndex++;
    onChunkProgress?.(chunkIndex, chunksToProcess.length);

    const prompt = `You are a legal assistant. Analyze the following document section (chunk ${chunkIndex}) from the document "${docName}".
Extract all key legal entities mentioned. Group them by these exact types:
- person: Names of individuals (e.g. accused, victim, witness, judge, lawyer, officer)
- date: Dates (e.g. date of incident, date of filing, date of hearing)
- amount: Monetary values (e.g. bribe, fine, recovery, bail amount, contract value)
- address: Locations, crime scene address, property address
- phone: Telephone/mobile numbers
- vehicle: License plate numbers, vehicle models mentioned
- caseNumber: FIR number, case number, petition number
- section: Acts/sections (e.g. IPC Section 302, BNS Section 103, CrPC Section 438)

Document Section:
"""
${chunk.substring(0, 1500)}
"""

Respond ONLY in this exact JSON format with no extra text:
{
  "entities": [
    {
      "value": "Entity value/text exactly as it appears in the document",
      "type": "person"
    }
  ]
}

Only return entities that are clearly stated. Keep values short (under 10 words). If no entities are found, return {"entities": []}.`;

    try {
      await context.clearCache();
      const result = await context.completion({
        messages: [
          { role: 'system', content: 'You are a legal entity extractor. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        n_predict: 350,
        stop: STOP_WORDS,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 20
      });

      const text = result.text.trim();
      let extracted = [];

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
          if (parsed.entities && Array.isArray(parsed.entities)) {
            extracted = parsed.entities;
          } else if (parsed.value && parsed.type) {
            extracted = [parsed];
          }
        } else {
          extracted = parseEntitiesViaRegex(text);
        }
      } catch (parseErr) {
        console.warn(`[EntityTracker] JSON parsing failed for ${docName} chunk ${chunkIndex}. Using regex fallback.`, parseErr);
        extracted = parseEntitiesViaRegex(text);
      }

      // Add appearance context
      const preview = chunk.length > 150 ? chunk.substring(0, 150) + '...' : chunk;
      for (const item of extracted) {
        if (item.value && item.type) {
          rawEntities.push({
            value: item.value.trim(),
            type: item.type.toLowerCase().trim(),
            docId,
            docName,
            chunkIndex: chunkIndex - 1,
            preview
          });
        }
      }
    } catch (e) {
      console.error(`[EntityTracker] Entity extraction failed for chunk ${chunkIndex} in ${docName}:`, e);
      if (!(e instanceof SyntaxError) && !e.message?.includes('JSON')) {
        await modelManager.handleCrash(e);
      }
    }
  }

  return rawEntities;
};

/**
 * Builds the case-wide entity index by aggregating entity extractions across all docs.
 * 
 * @param {string} caseId - The unique ID of the case.
 * @param {function} onProgress - Callback for loading progress status in UI.
 * @returns {Promise<object>} - The aggregated entity index grouped by type.
 */
export const buildEntityIndex = async (caseId, onProgress) => {
  const caseObj = useCaseStore.getState().getCaseById(caseId);
  if (!caseObj) {
    throw new Error('Case not found.');
  }

  const documentIds = caseObj.documents || [];
  if (documentIds.length === 0) {
    return {};
  }

  const allDocuments = useDocumentStore.getState().documents;
  const linkedDocs = allDocuments.filter(d => documentIds.includes(d.id));

  if (linkedDocs.length === 0) {
    return {};
  }

  const aggregatedEntities = {};
  let processedDocs = 0;

  for (const doc of linkedDocs) {
    processedDocs++;
    if (!doc.chunks || doc.chunks.length === 0) continue;

    const docName = doc.name;
    const rawList = await extractEntitiesFromDoc(
      doc.chunks, 
      doc.id, 
      docName,
      (currentChunk, totalChunks) => {
        onProgress?.(
          `Extracting entities from "${docName}" (chunk ${currentChunk}/${totalChunks})...`,
          processedDocs,
          linkedDocs.length
        );
      }
    );

    // Group and merge entities
    for (const item of rawList) {
      const type = item.type;
      const normalizedValue = item.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!aggregatedEntities[type]) {
        aggregatedEntities[type] = [];
      }

      // Find if we already have this entity (case-insensitive merge)
      const existing = aggregatedEntities[type].find(
        e => e.value.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedValue
      );

      if (existing) {
        // Avoid duplicate appearances of the same docId and chunkIndex
        const isDuplicateAppearance = existing.appearances.some(
          app => app.docId === item.docId && app.chunkIndex === item.chunkIndex
        );

        if (!isDuplicateAppearance) {
          existing.appearances.push({
            docId: item.docId,
            docName: item.docName,
            chunkIndex: item.chunkIndex,
            preview: item.preview
          });
        }
      } else {
        aggregatedEntities[type].push({
          value: item.value,
          type: item.type,
          appearances: [
            {
              docId: item.docId,
              docName: item.docName,
              chunkIndex: item.chunkIndex,
              preview: item.preview
            }
          ]
        });
      }
    }
  }

  return aggregatedEntities;
};
