/*
 * textCleaner.ts — Utility for cleaning and normalizing text extracted from PDFs.
 *
 * PURPOSE: PDF extraction often introduces noise: page numbers, headers, footers,
 * stray formatting characters, multiple consecutive spaces, and excessive line breaks.
 * This utility sanitizes the raw text to improve token efficiency and context relevance.
 */

/**
 * Cleans extracted PDF text by removing page artifacts, formatting characters,
 * and normalizing spacing.
 *
 * @param raw - The raw extracted text from the PDF parser.
 * @returns The cleaned and formatted text.
 */
export const cleanPdfText = (raw) => {
  if (!raw) {
    return '';
  }

  let text = raw;

  // 1. Normalize line endings (CRLF -> LF)
  text = text.replace(/\r\n/g, '\n');

  // 2. Remove non-printable or control characters (except tabs and newlines)
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Remove zero-width spaces, soft hyphens, and other special characters
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 4. Remove common PDF header/footer page patterns (e.g., "Page 1 of 10", "Page 5", etc.)
  // Case-insensitive matching for "page X of Y" or just "page X"
  text = text.replace(/page\s+\d+\s+of\s+\d+/gi, '');
  text = text.replace(/page\s+\d+/gi, '');

  // 5. Replace multiple spaces with a single space (avoiding breaking newlines)
  text = text.replace(/[ \t]+/g, ' ');

  // 6. Normalize paragraph breaks: replace 3 or more consecutive newlines with exactly 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // 7. Remove leading and trailing spaces from each line
  text = text.split('\n').map((line) => line.trim()).join('\n');

  // 8. Clean up final leading/trailing whitespace
  return text.trim();
};