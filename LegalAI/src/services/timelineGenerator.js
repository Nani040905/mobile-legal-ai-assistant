/*
 * timelineGenerator.ts — Chronological event timeline extraction service.
 *
 * PURPOSE: Iterates through chunks of multiple documents to extract dates and events,
 * aggregates them, normalizes the dates for sorting, and returns a sorted timeline.
 */


import modelManager from './modelManager';


const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];











const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8, sept: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

const parseDateValue = (dateStr) => {
  if (!dateStr) return 0;

  const cleanStr = dateStr.trim().toLowerCase();

  // 1. Try to find a 4-digit year between 1800 and 2100
  const yearMatch = cleanStr.match(/\b(18\d{2}|19\d{2}|20\d{2}|2100)\b/);
  if (!yearMatch) {
    return 0; // No year found, can't sort properly
  }
  const year = parseInt(yearMatch[1], 10);

  // 2. Try to find month name
  let month = 0; // Default to January
  let hasMonth = false;
  for (const [key, val] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`\\b${key}\\b|${key}`);
    if (regex.test(cleanStr)) {
      month = val;
      hasMonth = true;
      break;
    }
  }

  // 3. Try to find day of the month (1 or 2 digits, not matching the year)
  let day = 1;
  let tempStr = cleanStr.replace(yearMatch[1], '');
  for (const key of Object.keys(MONTH_MAP)) {
    tempStr = tempStr.replace(key, '');
  }

  const dayMatch = tempStr.match(/\b(\d{1,2})\b/);
  if (dayMatch) {
    const parsedDay = parseInt(dayMatch[1], 10);
    if (parsedDay >= 1 && parsedDay <= 31) {
      day = parsedDay;
    }
  }

  // 4. Handle pure numeric dates like DD/MM/YYYY or MM/DD/YYYY if no month name was found
  if (!hasMonth) {
    const numericMatch = cleanStr.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (numericMatch) {
      const p1 = parseInt(numericMatch[1], 10);
      const p2 = parseInt(numericMatch[2], 10);
      const p3 = parseInt(numericMatch[3], 10);

      // Standard Indian format: DD/MM/YYYY
      if (p2 <= 12) {
        month = p2 - 1;
        day = p1;
      } else {
        month = p1 - 1;
        day = p2;
      }
      return new Date(p3, month, day).getTime();
    }

    const numericMatchYearFirst = cleanStr.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (numericMatchYearFirst) {
      const y = parseInt(numericMatchYearFirst[1], 10);
      const m = parseInt(numericMatchYearFirst[2], 10) - 1;
      const d = parseInt(numericMatchYearFirst[3], 10);
      return new Date(y, m, d).getTime();
    }
  }

  return new Date(year, month, day).getTime();
};

const extractEventsViaRegex = (
rawText) =>
{
  const events = [];

  const objectRegex = /\{[^{}]+\}/g;
  const matches = rawText.match(objectRegex);
  if (matches) {
    for (const objStr of matches) {
      const dateMatch = objStr.match(/"date"\s*:\s*"([^"]+)"/i);
      const descMatch = objStr.match(/"description"\s*:\s*"([^"]+)"/i);
      const confMatch = objStr.match(/"confidence"\s*:\s*"([^"]+)"/i);

      if (dateMatch && descMatch) {
        const date = dateMatch[1].trim();
        const description = descMatch[1].trim();
        let confidence = 'High';
        if (confMatch) {
          const conf = confMatch[1].trim();
          if (conf === 'Medium' || conf === 'Low' || conf === 'High') {
            confidence = conf;
          }
        }
        events.push({ date, description, confidence });
      }
    }
  }

  return events;
};

const scanChunkForEvents = async (
context,
chunk,
docName) =>
{
  const prompt = `You are an expert legal data extractor. Analyze the following legal document section from "${docName}".
Extract ANY and ALL chronological events, incident dates, key property transactions, or court filings mentioned.

Document Section:
"""
${chunk.substring(0, 1500)}
"""

CRITICAL RULES:
1. Do NOT extract document registration numbers (e.g., "44/2001", "3246/2013"), case numbers (e.g., "O.S. No. 853 of 1977", "O.S. 15/2026"), section numbers, or citation numbers as dates.
2. Only extract actual calendar dates or years (e.g., "11 Dec 2000", "1977", "24 Feb 2021").
3. Make sure the event description is concise and clearly describes the factual event.

If no actual dates or events are found, return {"events": []}.
Otherwise, extract them in this JSON format:
{
  "events": [
    {
      "date": "Exactly as written in text (e.g., '11 Dec 2000' or '1977')",
      "description": "Clear description of what happened",
      "confidence": "High"
    }
  ]
}

Respond ONLY with valid JSON. Do not include markdown formatting or explanations.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
      { role: 'system', content: 'You are a legal data extractor. Respond ONLY with valid JSON. No markdown, no explanations.' },
      { role: 'user', content: prompt }],

      n_predict: 768, // Increased token limit for better completion
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20
    });

    const text = result.text.trim();
    let eventsArr = [];

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (err) {
          // If outer JSON parse fails, fix basic trailing commas and retry
          const fixedJson = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
          parsed = JSON.parse(fixedJson);
        }

        if (Array.isArray(parsed)) {
          eventsArr = parsed;
        } else if (parsed.events && Array.isArray(parsed.events)) {
          eventsArr = parsed.events;
        }
      } else {
        // Fallback to regex extraction directly on the raw text
        eventsArr = extractEventsViaRegex(text);
      }
    } catch (parseErr) {
      console.warn(`[TimelineGenerator] JSON parsing failed. Attempting regex extraction. Error:`, parseErr.message);
      eventsArr = extractEventsViaRegex(text);
    }

    return eventsArr.filter((e) => e.date && typeof e.date === 'string' && e.description && typeof e.description === 'string');

  } catch (e) {
    console.error(`[TimelineGenerator] Extraction failed for chunk:`, e);
    // Only trigger crash recovery for native inference execution crashes, NOT JS Parse/SyntaxErrors
    if (!(e instanceof SyntaxError) && !e.message?.includes('JSON')) {
      await modelManager.handleCrash(e);
    }
    throw e;
  }
};

/**
 * Quick heuristic check to see if a chunk has any chance of containing chronological events.
 * If it doesn't contain a year, month name, or numeric date, we can skip running it through the LLM.
 */
const chunkMightContainDates = (chunk) => {
  const clean = chunk.toLowerCase();

  // 1. Look for 4-digit years between 1800 and 2100 (e.g. 1977, 2013, 2026)
  const hasYear = /\b(18\d{2}|19\d{2}|20\d{2}|2100)\b/.test(clean);
  if (hasYear) return true;

  // 2. Look for month names
  const months = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  for (const month of months) {
    if (clean.includes(month)) return true;
  }

  // 3. Look for numeric dates with 2 or 4-digit years (e.g. 12/05/99, 24.02.2021, 24-02-21)
  const hasNumericDate = /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(clean);
  if (hasNumericDate) return true;

  return false;
};

export const generateTimeline = async (
documents,
onProgress) =>
{
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const allEvents = [];

  // Pre-filter chunks to only process the ones containing dates/years
  const targetChunks = [];
  documents.forEach((doc) => {
    if (!doc.chunks) return;
    doc.chunks.forEach((chunk) => {
      if (chunkMightContainDates(chunk)) {
        targetChunks.push({ doc, chunk });
      }
    });
  });

  const totalTargetChunks = targetChunks.length;
  if (totalTargetChunks === 0) {
    return [];
  }

  let currentChunk = 0;

  for (const { doc, chunk } of targetChunks) {
    currentChunk++;
    onProgress?.(`Analyzing chunk ${currentChunk} of ${totalTargetChunks}...`, currentChunk, totalTargetChunks);

    const extracted = await scanChunkForEvents(context, chunk, doc.name);

    for (const e of extracted) {
      allEvents.push({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        date: e.date,
        dateValue: parseDateValue(e.date),
        description: e.description,
        confidence: e.confidence || 'Medium',
        sourceDocName: doc.name,
        sourceDocId: doc.id
      });
    }
  }

  onProgress?.('Sorting and consolidating timeline...', totalTargetChunks, totalTargetChunks);

  // Remove duplicates based on description similarity (simple exact match or substring)
  // Since different chunks might describe the same event.
  const uniqueEvents = [];

  for (const ev of allEvents) {
    const isDuplicate = uniqueEvents.some(
      (u) => u.date === ev.date && (u.description.includes(ev.description) || ev.description.includes(u.description))
    );
    if (!isDuplicate) {
      uniqueEvents.push(ev);
    }
  }

  // Sort chronologically (oldest first)
  uniqueEvents.sort((a, b) => {
    if (a.dateValue === 0 && b.dateValue !== 0) return 1; // Put unparseable dates at the end
    if (b.dateValue === 0 && a.dateValue !== 0) return -1;
    return a.dateValue - b.dateValue;
  });

  return uniqueEvents;
};