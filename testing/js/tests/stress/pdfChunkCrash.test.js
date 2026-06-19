import { splitIntoChunks } from '../../../../LegalAI/src/services/pdfService';
import { cleanPdfText } from '../../../../LegalAI/src/utils/textCleaner';

describe('PDF Chunking Stress & Crash Suite', () => {
  test('should handle 1MB single-paragraph text blob without crashing or lagging out', () => {
    const hugeText = 'a'.repeat(1000000); // 1MB single word/paragraph
    let chunks;
    expect(() => {
      chunks = splitIntoChunks(hugeText, 1000);
    }).not.toThrow();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].length).toBeLessThanOrEqual(1200); // max hard boundary
  });

  test('should handle extreme chunkSize of 1 character safely', () => {
    const text = 'Short document text with several words.';
    let chunks;
    expect(() => {
      chunks = splitIntoChunks(text, 1);
    }).not.toThrow();
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toBe('S');
  });

  test('should handle extreme chunkSize of 10,000,000 safely', () => {
    const text = 'Short document text with several words.';
    const chunks = splitIntoChunks(text, 10000000);
    expect(chunks).toEqual([text]);
  });

  test('should handle document with only whitespace gracefully', () => {
    const text = '    \n   \t   \r   ';
    const chunks = splitIntoChunks(text, 100);
    // Should filter out or return empty without infinite loop
    expect(Array.isArray(chunks)).toBe(true);
  });

  test('should handle document with only newlines gracefully', () => {
    const text = '\n'.repeat(50000);
    const chunks = splitIntoChunks(text, 100);
    expect(Array.isArray(chunks)).toBe(true);
  });

  test('should handle empty string gracefully', () => {
    expect(splitIntoChunks('', 100)).toEqual(['']);
  });

  test('should handle 1000-word sentence with no spaces without infinite loop', () => {
    const longWord = 'a'.repeat(10000);
    expect(() => splitIntoChunks(longWord, 500)).not.toThrow();
  });

  test('should handle document with 10,000 consecutive paragraph breaks', () => {
    const text = 'Part 1' + '\n\n'.repeat(10000) + 'Part 2';
    let chunks;
    expect(() => {
      chunks = splitIntoChunks(text, 500);
    }).not.toThrow();
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('should clean embedded null bytes and control characters during split', () => {
    const badText = 'First paragraph.\x00\x01\x02\n\nSecond\x00\x00\x00 paragraph.';
    const cleaned = cleanPdfText(badText);
    const chunks = splitIntoChunks(cleaned, 20);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).not.toContain('\x00');
    expect(chunks[1]).not.toContain('\x00');
  });

  test('should split Unicode Hindi document correctly without corrupting characters', () => {
    const hindiText = 'यह पहला पैराग्राफ है।\n\nयह दूसरा पैराग्राफ है।';
    const chunks = splitIntoChunks(hindiText, 25);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe('यह पहला पैराग्राफ है।');
  });

  test('should run 50 document splits sequentially without leaking state', () => {
    const docText = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    for (let i = 0; i < 50; i++) {
      const chunks = splitIntoChunks(docText, 100);
      expect(chunks.length).toBe(1);
    }
  });

  test('should always satisfy the chunk size invariant', () => {
    const texts = [
      'a'.repeat(10000),
      'a. '.repeat(1000),
      'a\n\n'.repeat(500),
      'a'.repeat(100) + '\n\n' + 'b'.repeat(2000) + '. ' + 'c'.repeat(50)
    ];

    texts.forEach(text => {
      const chunks = splitIntoChunks(text, 1000);
      expect(Array.isArray(chunks)).toBe(true);
      chunks.forEach(c => {
        expect(c.length).toBeGreaterThan(0);
        // Hard boundary is 1200 chars in splitIntoChunks to prevent infinite loops
        expect(c.length).toBeLessThanOrEqual(1200); 
      });
      
      const totalChars = chunks.reduce((acc, c) => acc + c.length, 0);
      expect(totalChars).toBeLessThanOrEqual(text.length + 100);
    });
  });
});
