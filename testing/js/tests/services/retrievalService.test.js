import { tokenize, search, getRelevantContext } from '../../../../LegalAI/src/services/retrievalService';

describe('retrievalService', () => {
  describe('tokenize', () => {
    test('should lowercase input and filter out punctuation', () => {
      expect(tokenize('Agreement, "Contract"!')).toEqual(['agreement', 'contract']);
    });

    test('should remove common stop words', () => {
      expect(tokenize('the client agrees with the provider')).toEqual(['client', 'agrees', 'provider']);
    });

    test('should filter out short tokens (less than 3 characters)', () => {
      expect(tokenize('in an of it up or go')).toEqual([]);
    });

    test('should handle empty or whitespace inputs gracefully', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize('   \n\t   ')).toEqual([]);
    });
  });

  describe('search', () => {
    const chunks = [
      'This is an agreement for IT consulting services. The client agrees to pay $100 per hour.',
      'CONFIDENTIALITY: All private data must be kept confidential and secure at all times.',
      'TERMINATION: Either party may terminate this agreement with thirty (30) days notice.',
      'GOVERNING LAW: The contract is governed by the laws of India and Delhi jurisdiction.'
    ];

    test('should return empty array when chunks are empty', () => {
      expect(search('payment', [])).toEqual([]);
    });

    test('should return empty array if query resolves to empty tokens', () => {
      expect(search('the of in', chunks)).toEqual([]);
    });

    test('should rank chunks by relevance using BM25', () => {
      const results = search('confidentiality security', chunks);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk).toContain('CONFIDENTIALITY');
      expect(results[0].index).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
    });

    test('should respect topK parameter', () => {
      const results = search('agreement', chunks, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('should exclude chunks with score 0 (no matching terms)', () => {
      const results = search('banana apple', chunks);
      expect(results).toEqual([]);
    });
  });

  describe('getRelevantContext', () => {
    const chunks = [
      'This is page 1 content.',
      'This is page 2 confidentiality.',
      'This is page 3 termination.'
    ];

    test('should return default message if no matches', () => {
      expect(getRelevantContext('banana', chunks)).toBe('No relevant information found in the document for this query.');
    });

    test('should format retrieved chunks with indices and separator', () => {
      const context = getRelevantContext('confidentiality', chunks);
      expect(context).toContain('[Chunk 2]:');
      expect(context).toContain('This is page 2 confidentiality.');
    });
  });
});
