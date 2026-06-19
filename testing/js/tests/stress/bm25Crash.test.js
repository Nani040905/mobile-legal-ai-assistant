import { tokenize, search } from '../../../../LegalAI/src/services/retrievalService';

describe('BM25 Crash & Stress Suite', () => {
  const largeCorpus = Array.from({ length: 1000 }, (_, i) => 
    `This is legal clause number ${i} which discusses liability, indemnification, and termination obligations.`
  );

  test('should handle corpus of 1000 identical chunks without crash or division by zero', () => {
    const identicalCorpus = Array.from({ length: 1000 }, () => 
      'All parties shall indemnify and hold harmless the other party from liability.'
    );
    expect(() => search('liability indemnification', identicalCorpus)).not.toThrow();
    const results = search('liability indemnification', identicalCorpus);
    expect(results.length).toBeGreaterThan(0);
    // IDF check: since they are identical, IDF math shouldn't produce NaN or infinity
    results.forEach(r => {
      expect(Number.isNaN(r.score)).toBe(false);
      expect(Number.isFinite(r.score)).toBe(true);
    });
  });

  test('should return empty array when query matches 0 chunks in 1000-chunk corpus', () => {
    const results = search('banana apple orange strawberry', largeCorpus);
    expect(results).toEqual([]);
  });

  test('should process query with 50 identical terms repeated without overflow', () => {
    const query = Array(50).fill('indemnification').join(' ');
    expect(() => search(query, largeCorpus)).not.toThrow();
    const results = search(query, largeCorpus);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should work correctly with corpus where chunks are very small (1 character)', () => {
    const tinyCorpus = ['a', 'b', 'c', 'd', 'e', 'x'];
    expect(() => search('x', tinyCorpus)).not.toThrow();
    const results = search('x', tinyCorpus);
    expect(results).toEqual([]); // 'x' gets filtered out because length < 3
  });

  test('should handle all-empty or nullish strings in corpus gracefully', () => {
    const badCorpus = ['', '   ', '\n\n', null, undefined, 'valid chunk content'];
    expect(() => search('content', badCorpus)).not.toThrow();
    const results = search('content', badCorpus);
    expect(results.length).toBe(1);
    expect(results[0].chunk).toBe('valid chunk content');
  });

  test('should respect extreme topK boundary parameters', () => {
    expect(search('liability', largeCorpus, 0)).toEqual([]);
    expect(() => search('liability', largeCorpus, Number.MAX_SAFE_INTEGER)).not.toThrow();
    const allResults = search('liability', largeCorpus, Number.MAX_SAFE_INTEGER);
    expect(allResults.length).toBeLessThanOrEqual(largeCorpus.length);
  });

  test('should handle Unicode scripts in corpus and query without crash', () => {
    const unicodeCorpus = [
      'सभी पक्ष देयता और क्षतिपूर्ति दायित्वों पर चर्चा करेंगे।',
      'keep confidential 契約書 अनुबंध',
      'governing law is Indian law'
    ];
    expect(() => search('अनुबंध', unicodeCorpus)).not.toThrow();
    expect(() => search('契約書', unicodeCorpus)).not.toThrow();
  });

  test('should handle extremely large query strings (10,000 chars)', () => {
    const hugeQuery = 'indemnification '.repeat(600); // ~10,000 chars
    expect(() => search(hugeQuery, largeCorpus)).not.toThrow();
    const results = search(hugeQuery, largeCorpus);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should stable sort even when all scores are equal', () => {
    const corpus = ['liability clause', 'liability clause', 'liability clause'];
    const results = search('liability', corpus);
    expect(results.length).toBe(3);
    expect(results[0].index).toBe(0);
    expect(results[1].index).toBe(1);
    expect(results[2].index).toBe(2);
  });
});
