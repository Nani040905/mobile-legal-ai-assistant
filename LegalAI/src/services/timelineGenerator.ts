/*
 * timelineGenerator.ts — Chronological event timeline extraction service.
 *
 * PURPOSE: Iterates through chunks of multiple documents to extract dates and events,
 * aggregates them, normalizes the dates for sorting, and returns a sorted timeline.
 */

import { LlamaContext } from 'llama.rn';
import modelManager from './modelManager';
import { Document } from '../store/useDocumentStore';

const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '[INST]'];

export interface TimelineEvent {
  id: string;
  date: string;
  dateValue: number; // For chronological sorting
  description: string;
  confidence: 'High' | 'Low' | 'Medium';
  sourceDocName: string;
  sourceDocId: string;
}

/**
 * Normalizes a date string to a timestamp for sorting.
 * If parsing fails, returns 0 so it sorts to the bottom (or top depending on order).
 */
const parseDateValue = (dateStr: string): number => {
  if (!dateStr) return 0;
  
  // Try standard parsing
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day, month, year;
    // Assume DD/MM/YYYY if first part is > 12 or if it's standard Indian format
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }

  // Fallback
  return 0;
};

const scanChunkForEvents = async (
  context: LlamaContext,
  chunk: string,
  docName: string
): Promise<Array<{ date: string; description: string; confidence: 'High' | 'Low' | 'Medium' }>> => {
  const prompt = `Analyze the following legal document section from "${docName}". 
Extract any chronological events, incident dates, filing dates, or deadlines mentioned.

Document Section:
"""
${chunk.substring(0, 1500)}
"""

Respond ONLY in this exact JSON format. If no events are found, return an empty array.
{
  "events": [
    {
      "date": "YYYY-MM-DD or exactly as written in text",
      "description": "Short description of what happened",
      "confidence": "High"
    }
  ]
}

Only use "High", "Medium", or "Low" for confidence. Do not include any other text.`;

  try {
    await context.clearCache();
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are a legal data extractor. Respond ONLY with valid JSON. No markdown, no explanations.' },
        { role: 'user', content: prompt },
      ],
      n_predict: 512,
      stop: STOP_WORDS,
      temperature: 0.1,
      top_p: 0.9,
      top_k: 20,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn(`[TimelineGenerator] No JSON found in raw output. Raw:`, text);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.events || !Array.isArray(parsed.events)) {
      return [];
    }

    return parsed.events.filter((e: any) => e.date && typeof e.date === 'string' && e.description && typeof e.description === 'string');

  } catch (e) {
    console.warn(`[TimelineGenerator] Extraction failed for chunk:`, e);
    return [];
  }
};

export const generateTimeline = async (
  documents: Document[],
  onProgress?: (text: string, current: number, total: number) => void
): Promise<TimelineEvent[]> => {
  const context = modelManager.getContext();
  if (!context) {
    throw new Error('AI model is not loaded. Go to Settings → Load Model first.');
  }

  const allEvents: TimelineEvent[] = [];
  
  // Calculate total chunks for progress tracking
  let totalChunks = 0;
  documents.forEach(doc => {
    if (doc.chunks) totalChunks += doc.chunks.length;
  });

  if (totalChunks === 0) {
    return [];
  }

  let currentChunk = 0;

  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    for (let i = 0; i < doc.chunks.length; i++) {
      currentChunk++;
      onProgress?.(`Analyzing chunk ${currentChunk} of ${totalChunks}...`, currentChunk, totalChunks);
      
      const extracted = await scanChunkForEvents(context, doc.chunks[i], doc.name);
      
      for (const e of extracted) {
        allEvents.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          date: e.date,
          dateValue: parseDateValue(e.date),
          description: e.description,
          confidence: e.confidence || 'Medium',
          sourceDocName: doc.name,
          sourceDocId: doc.id,
        });
      }
    }
  }

  onProgress?.('Sorting and consolidating timeline...', totalChunks, totalChunks);

  // Remove duplicates based on description similarity (simple exact match or substring)
  // Since different chunks might describe the same event.
  const uniqueEvents: TimelineEvent[] = [];
  
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
    if (a.dateValue === 0 && b.dateValue !== 0) return 1;  // Put unparseable dates at the end
    if (b.dateValue === 0 && a.dateValue !== 0) return -1;
    return a.dateValue - b.dateValue;
  });

  return uniqueEvents;
};
