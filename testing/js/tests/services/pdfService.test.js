import { splitIntoChunks, extractText, getFileInfo } from '../../../../LegalAI/src/services/pdfService';

describe('pdfService', () => {
  describe('splitIntoChunks', () => {
    test('should return single chunk if text is smaller than chunkSize', () => {
      const text = 'Short document text.';
      expect(splitIntoChunks(text, 100)).toEqual(['Short document text.']);
    });

    test('should split text at paragraph breaks when possible', () => {
      const text = 'Paragraph one text content.\n\nParagraph two text content.\n\nParagraph three text.';
      const chunks = splitIntoChunks(text, 40);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toBe('Paragraph one text content.');
      expect(chunks[1]).toBe('Paragraph two text content.');
    });

    test('should split at sentence boundary if no paragraph break is available', () => {
      const text = 'Sentence one text context. Sentence two text context. Sentence three.';
      const chunks = splitIntoChunks(text, 35);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toBe('Sentence one text context.');
    });
  });

  describe('extractText stub', () => {
    test('should fall back to simulated text if native module is not defined', async () => {
      const text = await extractText('test.pdf');
      expect(text).toContain('LEGAL AGREEMENT');
      expect(text).toContain('test.pdf');
    });
  });

  describe('getFileInfo stub', () => {
    test('should return file metadata', () => {
      const info = getFileInfo('test.pdf', 'Legal Contract');
      expect(info.name).toBe('Legal Contract');
      expect(info.uri).toBe('test.pdf');
      expect(info.extractedAt).toBeDefined();
    });
  });
});
