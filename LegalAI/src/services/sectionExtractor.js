/*
 * sectionExtractor.js — Section Extractor and Indian Law Explainer Service.
 *
 * PURPOSE: Extracts relevant sections of Indian Law (IPC, CrPC, BNS, BNSS, IEA, etc.)
 * from case documents, and generates detailed explanations including ingredients,
 * burden, penalty, defenses, and common mistakes using the local LLM.
 */

import modelManager from './modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useCaseStore from '../store/useCaseStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

// Regex fallback for section explanation parsing
const parseExplanationViaRegex = (rawText) => {
  const parseList = (sectionName, text) => {
    const sectionRegex = new RegExp(`"${sectionName}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const match = text.match(sectionRegex);
    if (match) {
      const itemsText = match[1];
      const itemRegex = /"([^"]+)"/g;
      const items = [];
      let m;
      while ((m = itemRegex.exec(itemsText)) !== null) {
        items.push(m[1].trim());
      }
      return items;
    }
    return [];
  };

  const getSingleField = (fieldName, text) => {
    const fieldRegex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'i');
    const match = text.match(fieldRegex);
    return match ? match[1].trim() : '';
  };

  return {
    sectionCode: getSingleField('sectionCode', rawText) || 'Section Code',
    actName: getSingleField('actName', rawText) || 'Indian Law Act',
    ingredients: parseList('ingredients', rawText),
    burden: getSingleField('burden', rawText) || 'Burden details.',
    penalty: getSingleField('penalty', rawText) || 'Penalty details.',
    defenses: parseList('defenses', rawText),
    commonMistakes: parseList('commonMistakes', rawText),
    relatedSections: parseList('relatedSections', rawText)
  };
};

/**
 * Extracts Indian legal sections (e.g. Section 302 IPC, Section 420, etc.) from case documents.
 */
export const extractSectionsFromCase = async (caseId, onProgress) => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const caseObj = useCaseStore.getState().getCaseById(caseId);
  if (!caseObj) {
    throw new Error('Case folder not found.');
  }

  const documentIds = caseObj.documents || [];
  const allDocs = useDocumentStore.getState().documents;
  const linkedDocs = allDocs.filter(d => documentIds.includes(d.id));

  if (linkedDocs.length === 0) {
    return [];
  }

  const allSections = [];
  let processedDocs = 0;

  for (const doc of linkedDocs) {
    processedDocs++;
    if (!doc.chunks || doc.chunks.length === 0) continue;

    onProgress?.(`Extracting legal sections from "${doc.name}"...`, processedDocs, linkedDocs.length);

    // Scan the first 3 chunks of each document to extract sections
    const chunksToScan = doc.chunks.slice(0, 3);
    for (const chunk of chunksToScan) {
      const prompt = `You are a legal assistant. Analyze the following document text and extract all specific Indian acts and sections mentioned (e.g., Section 302 of IPC, Section 138 of NI Act, Section 439 of CrPC).
      
Text:
"""
${chunk.substring(0, 1500)}
"""

Respond ONLY in this exact JSON format with no additional text:
{
  "sections": [
    { "sectionCode": "Section 138", "actName": "Negotiable Instruments Act" }
  ]
}

If no legal sections are found, return {"sections": []}.`;

      try {
        await context.clearCache();
        const result = await context.completion({
          messages: [
            { role: 'system', content: 'You are a legal acts extractor. Respond ONLY with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          n_predict: 256,
          stop: STOP_WORDS,
          temperature: 0.1,
          top_p: 0.9,
          top_k: 20
        });

        const text = result.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
          if (parsed.sections && Array.isArray(parsed.sections)) {
            for (const s of parsed.sections) {
              if (s.sectionCode && s.actName) {
                // Deduplicate
                const exists = allSections.some(
                  item => item.sectionCode.toLowerCase() === s.sectionCode.toLowerCase() && item.actName.toLowerCase() === s.actName.toLowerCase()
                );
                if (!exists) {
                  allSections.push({
                    sectionCode: s.sectionCode.trim(),
                    actName: s.actName.trim()
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[SectionExtractor] Scan failed for chunk:`, err);
      }
    }
  }

  return allSections;
};

/**
 * Generates a detailed legal explanation for a specific section code of Indian law.
 */
export const explainSection = async (sectionCode, actName = 'Indian Penal Code') => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const prompt = `You are an expert Indian law professor. Explain the legal provision "${sectionCode}" under "${actName}".
Provide the details structured exactly in this JSON format. Respond ONLY with JSON, no other text:
{
  "sectionCode": "${sectionCode}",
  "actName": "${actName}",
  "ingredients": ["Core element/ingredient 1", "Core element/ingredient 2"],
  "burden": "Briefly explain who has the burden of proof and the standard required (e.g. beyond reasonable doubt on prosecution).",
  "penalty": "Explain the punishment/fines defined for this section.",
  "defenses": ["Legal defense/exception 1", "Legal defense 2"],
  "commonMistakes": ["Common procedural/drafting mistake advocates make when filing or arguing this section 1", "Mistake 2"],
  "relatedSections": ["Section number 1", "Section number 2"]
}

Ensure the "commonMistakes" are highly practical and focus on procedural pitfalls in Indian litigation.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal section explainer. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, '$1'));
        return {
          sectionCode: parsed.sectionCode || sectionCode,
          actName: parsed.actName || actName,
          ingredients: parsed.ingredients || [],
          burden: parsed.burden || 'Standard Indian law proof burden.',
          penalty: parsed.penalty || 'Specified punishment.',
          defenses: parsed.defenses || [],
          commonMistakes: parsed.commonMistakes || [],
          relatedSections: parsed.relatedSections || []
        };
      }
    } catch (parseErr) {
      console.warn(`[SectionExtractor] Explanation JSON parse failed. Using regex.`, parseErr);
    }
    return parseExplanationViaRegex(text);
  } catch (err) {
    console.error(`[SectionExtractor] Explanation failed for ${sectionCode}:`, err);
    if (!(err instanceof SyntaxError) && !err.message?.includes('JSON')) {
      await modelManager.handleCrash(err);
    }
    throw err;
  }
};
