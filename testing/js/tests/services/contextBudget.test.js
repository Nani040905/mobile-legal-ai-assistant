import { estimateTokens, buildBudgetedContext } from '../../../../LegalAI/src/services/contextBudget';

describe('contextBudget', () => {
  describe('estimateTokens', () => {
    test('should return 0 for empty or null inputs', () => {
      expect(estimateTokens(null)).toBe(0);
      expect(estimateTokens(undefined)).toBe(0);
      expect(estimateTokens('')).toBe(0);
    });

    test('should approximate 4 characters per token', () => {
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('abcdefgh')).toBe(2);
      expect(estimateTokens('a')).toBe(1);
    });
  });

  describe('buildBudgetedContext', () => {
    const systemPrompt = 'System Prompt';
    const chunks = [
      { chunk: 'This is the first chunk of text that has some details.', index: 0 },
      { chunk: 'Here is another piece of details for retrieval.', index: 1 },
      { chunk: 'A third chunk of data to fill the budget context window.', index: 2 }
    ];

    test('should pack chunks that fit the available token budget', () => {
      // Small context budget that fits only 1-2 chunks
      const result = buildBudgetedContext(systemPrompt, chunks, 'query', 200, 100);
      expect(result.usedChunks.length).toBeLessThan(3);
      expect(result.contextText).toContain('[Chunk');
      expect(result.estimatedTokens).toBeLessThanOrEqual(200 - 100);
    });

    test('should handle string array as chunks input input', () => {
      const stringChunks = ['First string chunk', 'Second string chunk'];
      const result = buildBudgetedContext(systemPrompt, stringChunks, 'query', 300, 100);
      expect(result.usedChunks.length).toBe(2);
      expect(result.usedChunks[0].chunk).toBe('First string chunk');
    });

    test('should return empty context if budget is too small for baseline', () => {
      const result = buildBudgetedContext(systemPrompt, chunks, 'query', 50, 40);
      expect(result.usedChunks.length).toBe(0);
      expect(result.contextText).toBe('');
    });
  });
});
