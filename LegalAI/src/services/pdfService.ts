/*
 * pdfService.ts — Service for PDF file operations.
 *
 * PURPOSE: Handles PDF-related operations like text extraction and
 * chunk splitting. Currently a STUB that returns simulated data.
 * Will be fully implemented in Phase 4 with a real PDF parsing library.
 *
 * DESIGN DECISIONS:
 * - Async interface (returns Promises) — real PDF operations are I/O-bound.
 * - Chunk-based architecture — large legal documents are split into smaller
 *   pieces that fit within the model's context window (see docs/06-document-processing.md).
 * - The stub returns realistic data so the UI can be fully tested.
 *
 * FUTURE (Phase 4):
 * - Use react-native-pdf or pdf-lib for real PDF text extraction
 * - Implement intelligent chunk splitting (by paragraphs, not arbitrary sizes)
 * - Handle scanned PDFs with OCR (Phase 7)
 */

/*
 * CHUNK_SIZE — The maximum number of characters per text chunk.
 *
 * Why 1000 characters?
 * - Small models like Qwen 2.5 3B have limited context windows (~4K tokens).
 * - 1000 characters ≈ 200-250 tokens — safe margin within context limits.
 * - Multiple chunks can be sent together if they're all relevant.
 */
const CHUNK_SIZE = 1000;

import { NativeModules } from 'react-native';
import { cleanPdfText } from '../utils/textCleaner';

/* Access the custom Android native module */
const { PdfExtractor } = NativeModules;

/* Helper to generate simulated text if the native module is unavailable */
const getSimulatedText = (fileUri: string): string => {
  return `LEGAL AGREEMENT

This Agreement ("Agreement") is entered into as of the date of last signature below, by and between Party A ("Client") and Party B ("Service Provider").

1. SCOPE OF SERVICES
The Service Provider agrees to provide legal consultation services as described in Exhibit A attached hereto.

2. TERM
This Agreement shall commence on the Effective Date and continue for a period of twelve (12) months unless terminated earlier in accordance with Section 7.

3. COMPENSATION
Client agrees to pay Service Provider a monthly retainer of the amount specified in Exhibit B. Payment is due within thirty (30) days of invoice receipt.

4. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all information shared during the course of this engagement. This obligation survives termination of this Agreement.

5. INTELLECTUAL PROPERTY
All work product created by Service Provider in the course of performing services shall be the property of the Client upon full payment.

6. LIMITATION OF LIABILITY
In no event shall either party be liable for indirect, special, or consequential damages arising out of this Agreement.

7. TERMINATION
Either party may terminate this Agreement with thirty (30) days written notice. Upon termination, Client shall pay for all services rendered through the date of termination.

8. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the applicable jurisdiction.

[Document source (Simulated): ${fileUri}]`;
};

/*
 * extractText — Extracts raw text content from a file (PDF, DOCX, TXT).
 *
 * @param fileUri — The local file path/URI.
 * @returns A Promise that resolves to the extracted text string.
 *
 * Calls the custom Android Native Module to extract text offline based on file extension.
 * Falls back to simulated text if running on an unsupported platform or testing.
 */
export const extractText = async (fileUri: string): Promise<string> => {
  try {
    const extension = fileUri.split('.').pop()?.toLowerCase() || '';

    /* If the native module is not registered (e.g. running on iOS or tests), fall back to stub */
    if (!PdfExtractor) {
      console.warn('[PdfService] PdfExtractor native module is not available. Falling back to stub.');
      /* Simulate a short processing delay for the stub fallback */
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      return cleanPdfText(getSimulatedText(fileUri));
    }

    let text = '';
    if (extension === 'docx') {
      text = await PdfExtractor.extractDocxText(fileUri);
    } else if (extension === 'txt') {
      text = await PdfExtractor.extractTxtText(fileUri);
    } else {
      /* Default to PDF text extraction */
      text = await PdfExtractor.extractText(fileUri);
    }

    return cleanPdfText(text);
  } catch (error) {
    console.error('[PdfService] Error calling native PdfExtractor:', error);
    throw error;
  }
};

/*
 * splitIntoChunks — Splits a long text into smaller, manageable chunks.
 *
 * @param text — The full extracted text from a PDF.
 * @param chunkSize — Maximum characters per chunk (default: CHUNK_SIZE = 1000).
 * @returns An array of text chunks.
 *
 * WHY CHUNK?
 * Large legal documents (50-200 pages) can have 100K+ characters.
 * The model's context window is limited (~4K tokens ≈ ~16K chars for Qwen 2.5 3B).
 * By splitting into chunks, we can:
 * 1. Summarize each chunk independently, then combine summaries.
 * 2. Find the most relevant chunk for a question, then send only that chunk.
 *
 * CURRENT IMPLEMENTATION:
 * Simple character-based splitting. Tries to break at paragraph boundaries
 * (\n\n) when possible, otherwise falls back to sentence boundaries (.),
 * and finally to the hard character limit.
 *
 * FUTURE IMPROVEMENT:
 * Use semantic splitting — split by document sections, headings, or clauses
 * to keep related content together.
 */
export const splitIntoChunks = (
  text: string,                    // The full document text
  chunkSize: number = CHUNK_SIZE,  // Max chars per chunk (default 1000)
): string[] => {
  /* If the text fits in a single chunk, return it as-is in an array */
  if (text.length <= chunkSize) {
    return [text]; // No splitting needed — wrap in array for consistent return type
  }

  /* Array to hold the resulting chunks */
  const chunks: string[] = [];

  /* Track our position as we walk through the text */
  let currentPosition = 0;

  /* Keep extracting chunks until we've processed the entire text */
  while (currentPosition < text.length) {
    /* Extract a candidate chunk of maximum size */
    let chunk = text.substring(currentPosition, currentPosition + chunkSize);

    /*
     * Try to find a natural break point near the end of the chunk.
     * We look for paragraph breaks (\n\n) first, then line breaks (\n),
     * then sentence endings (. ), and finally just use the full chunk.
     * This prevents cutting words or sentences in half.
     */
    if (currentPosition + chunkSize < text.length) {
      /* Look for paragraph break in the last 200 characters of the chunk */
      const paragraphBreak = chunk.lastIndexOf('\n\n');

      /* Look for line break as a fallback */
      const lineBreak = chunk.lastIndexOf('\n');

      /* Look for sentence end (period followed by space) as last resort */
      const sentenceEnd = chunk.lastIndexOf('. ');

      if (paragraphBreak > chunkSize * 0.5) {
        /* Found a paragraph break in the second half — use it */
        chunk = chunk.substring(0, paragraphBreak);
      } else if (lineBreak > chunkSize * 0.5) {
        /* Found a line break — use it */
        chunk = chunk.substring(0, lineBreak);
      } else if (sentenceEnd > chunkSize * 0.5) {
        /* Found a sentence end — include the period */
        chunk = chunk.substring(0, sentenceEnd + 1);
      }
      /* If no good break point, use the full chunk (hard split) */
    }

    /* Add the chunk to our results array */
    chunks.push(chunk.trim()); // trim() removes leading/trailing whitespace

    /* Move the position forward past the chunk we just extracted */
    currentPosition += chunk.length;

    /*
     * Skip whitespace between chunks — prevents chunks from starting
     * with blank lines or spaces from the break point.
     */
    while (currentPosition < text.length && text[currentPosition] === '\n') {
      currentPosition++; // Skip newline characters
    }
  }

  /* Return the array of text chunks */
  return chunks;
};

/*
 * getFileInfo — Gets basic metadata about a file.
 *
 * @param fileUri — The local file path.
 * @param fileName — The display name of the file.
 * @returns An object with file metadata.
 *
 * STUB — Returns placeholder metadata.
 * In Phase 4, this will read actual file stats from the filesystem.
 */
export const getFileInfo = (fileUri: string, fileName: string) => {
  return {
    name: fileName,               // Original file name
    uri: fileUri,                 // Local file path
    size: 0,                      // Will be actual size in Phase 4
    pageCount: 0,                 // Will be actual page count in Phase 4
    extractedAt: new Date().toISOString(), // When the text was extracted
  };
};
