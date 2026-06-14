import { splitSentences, verifyAnswer } from '../../../../LegalAI/src/services/answerVerifier';

describe('answerVerifier', () => {
  describe('splitSentences', () => {
    test('should segment simple sentences by punctuation', () => {
      const text = 'The contract was signed. The payment is due in 30 days!';
      expect(splitSentences(text)).toEqual([
        'The contract was signed',
        'The payment is due in 30 days!'
      ]);
    });

    test('should not split at known abbreviations like Rs. and Sec. and Ltd.', () => {
      const text = 'The fine is Rs. 5000 under Sec. 420. The company Ltd. paid it.';
      expect(splitSentences(text)).toEqual([
        'The fine is Rs. 5000 under Sec. 420',
        'The company Ltd. paid it.'
      ]);
    });

    test('should handle empty string', () => {
      expect(splitSentences('')).toEqual([]);
    });
  });

  describe('verifyAnswer', () => {
    const sourceChunks = [
      'The contractor agrees to complete construction by December 2026 for a sum of Rs. 50,000.',
      'The contract is governed under the Laws of India and subject to Delhi High Court.'
    ];

    test('should return 1.0 confidence for empty answer', () => {
      const result = verifyAnswer('', sourceChunks);
      expect(result.confidence).toBe(1.0);
      expect(result.unverifiedClaims).toEqual([]);
    });

    test('should return 1.0 confidence if no source chunks are provided', () => {
      const result = verifyAnswer('Any answer here', []);
      expect(result.confidence).toBe(1.0);
    });

    test('should verify grounded answers with high overlap', () => {
      const answer = 'The contractor will complete by December 2026. The price is Rs. 50,000.';
      const result = verifyAnswer(answer, sourceChunks);
      expect(result.confidence).toBe(1.0);
      expect(result.unverifiedClaims).toEqual([]);
      expect(result.warning).toBeUndefined();
    });

    test('should flag ungrounded claims and set a warning', () => {
      const answer = 'The payment is Rs. 80,000. It must be completed by January 2027.';
      const result = verifyAnswer(answer, sourceChunks);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.unverifiedClaims.length).toBeGreaterThan(0);
      expect(result.warning).toBeDefined();
    });

    test('should bypass numeric check when numbers match but flag when they do not', () => {
      const answer = 'The price is Rs. 45,000.'; // Mismatched number
      const result = verifyAnswer(answer, sourceChunks);
      expect(result.confidence).toBe(0);
      expect(result.unverifiedClaims).toContain('The price is Rs. 45,000.');
    });

    test('should ignore common disclaimers and meta responses', () => {
      const answer = 'The details are not mentioned in the text. Disclaimer: This is info only.';
      const result = verifyAnswer(answer, sourceChunks);
      expect(result.confidence).toBe(1.0);
      expect(result.unverifiedClaims).toEqual([]);
    });
  });
});
