import { estimateTokens, buildBudgetedContext } from '../../../../LegalAI/src/services/contextBudget';

describe('Context Budget Crash Suite', () => {
  const systemPrompt = 'You are a legal assistant.';
  const normalChunks = [
    { chunk: 'Liability is limited to Rs. 50,000.', index: 0 },
    { chunk: 'Indemnification is covered up to Rs. 1,00,000.', index: 1 },
    { chunk: 'Governing law is governed under the jurisdiction of Delhi courts.', index: 2 }
  ];

  test('should handle maxContext of 0 gracefully', () => {
    const result = buildBudgetedContext(systemPrompt, normalChunks, 'query', 0, 0);
    expect(result.usedChunks).toEqual([]);
    expect(result.contextText).toBe('');
    expect(result.estimatedTokens).toBe(59);
  });

  test('should handle negative maxContext gracefully', () => {
    const result = buildBudgetedContext(systemPrompt, normalChunks, 'query', -100, 50);
    expect(result.usedChunks).toEqual([]);
    expect(result.contextText).toBe('');
    expect(result.estimatedTokens).toBe(59);
  });

  test('should handle reserveAnswer larger than maxContext gracefully', () => {
    const result = buildBudgetedContext(systemPrompt, normalChunks, 'query', 200, 300);
    expect(result.usedChunks).toEqual([]);
    expect(result.contextText).toBe('');
    expect(result.estimatedTokens).toBe(59);
  });

  test('should handle reserveAnswer equal to maxContext gracefully', () => {
    const result = buildBudgetedContext(systemPrompt, normalChunks, 'query', 200, 200);
    expect(result.usedChunks).toEqual([]);
    expect(result.contextText).toBe('');
    expect(result.estimatedTokens).toBe(59);
  });

  test('should handle Number.MAX_SAFE_INTEGER as maxContext without crash or stack overflow', () => {
    const result = buildBudgetedContext(systemPrompt, normalChunks, 'query', Number.MAX_SAFE_INTEGER, 0);
    expect(result.usedChunks.length).toBe(3);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  test('should handle 10,000 chunks with a tiny budget cleanly', () => {
    const hugeChunks = Array.from({ length: 10000 }, (_, i) => ({
      chunk: `This is chunk number ${i} containing some boilerplate legal content.`,
      index: i
    }));
    const result = buildBudgetedContext(systemPrompt, hugeChunks, 'query', 100, 50);
    expect(result.usedChunks.length).toBeLessThan(3);
  });

  test('should handle single chunk of 100,000 characters', () => {
    const giantChunk = [{ chunk: 'a'.repeat(100000), index: 0 }];
    const result = buildBudgetedContext(systemPrompt, giantChunk, 'query', 2000, 500);
    // Since 100K chars is ~25K tokens, it exceeds 2000 - 500 = 1500 tokens, so it should be excluded
    expect(result.usedChunks).toEqual([]);
    expect(result.contextText).toBe('');
  });

  test('should handle empty or null chunks in input gracefully', () => {
    const invalidChunks = [
      { chunk: '', index: 0 },
      { chunk: null, index: 1 },
      { chunk: undefined, index: 2 },
      { chunk: 'Valid chunk content', index: 3 }
    ];
    const result = buildBudgetedContext(systemPrompt, invalidChunks, 'query', 1000, 100);
    expect(result.usedChunks.length).toBe(4);
    expect(result.usedChunks[3].chunk).toBe('Valid chunk content');
  });

  test('should enforce mathematical invariants on 100 randomized inputs', () => {
    for (let i = 0; i < 100; i++) {
      const nChunks = Math.floor(Math.random() * 50);
      const chunks = Array.from({ length: nChunks }, (_, idx) => ({
        chunk: 'a'.repeat(Math.floor(Math.random() * 2000)),
        index: idx
      }));
      const maxCtx = Math.floor(Math.random() * 4096);
      const reserve = Math.floor(Math.random() * (maxCtx + 100));

      const result = buildBudgetedContext(systemPrompt, chunks, 'query', maxCtx, reserve);

      // Invariants
      expect(result.estimatedTokens).toBeLessThanOrEqual(Math.max(maxCtx, 59));
      expect(Array.isArray(result.usedChunks)).toBe(true);
      expect(result.usedChunks.length).toBeLessThanOrEqual(nChunks);
      result.usedChunks.forEach(uc => {
        expect(uc).toHaveProperty('chunk');
        expect(uc).toHaveProperty('index');
      });
    }
  });
});
