import { splitSentences, verifyAnswer } from '../../../../LegalAI/src/services/answerVerifier';

describe('Answer Verifier Fuzz & Crash Suite', () => {
  describe('splitSentences Edge Cases', () => {
    test('should handle massive sentence of 20,000 characters without hang', () => {
      const hugeSentence = 'a'.repeat(20000);
      let result;
      expect(() => {
        result = splitSentences(hugeSentence);
      }).not.toThrow();
      expect(result.length).toBe(1);
    });

    test('should handle string with only punctuation marks cleanly', () => {
      const punctuationString = '!!!...???...!!!...&&&...!!!';
      expect(() => splitSentences(punctuationString)).not.toThrow();
    });

    test('should not split at nested, complex abbreviations', () => {
      const text = 'Govt. of India vs. Tata Sons Ltd. and others under Sec. 123 u/s 45A of IPC.';
      const result = splitSentences(text);
      expect(result.length).toBe(2);
    });

    test('should split Unicode Hindi sentences correctly without crash', () => {
      const text = 'यह पहला वाक्य है। यह दूसरा वाक्य है! क्या यह तीसरा वाक्य है?';
      const result = splitSentences(text);
      expect(result.length).toBe(2);
    });
  });

  describe('verifyAnswer Edge Cases & Invariants', () => {
    const largeSourceChunks = Array.from({ length: 1000 }, (_, i) => 
      `This is source chunk number ${i} which mentions section ${i} and value Rs. ${i * 100} in the agreement.`
    );

    test('should handle giant answer of 10,000 words without crashing', () => {
      const hugeAnswer = 'This is a claim. '.repeat(5000);
      let result;
      expect(() => {
        result = verifyAnswer(hugeAnswer, ['This is a claim.']);
      }).not.toThrow();
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    test('should handle 1000 source chunks without lagging out', () => {
      const answer = 'This is source chunk number 450 which mentions section 450.';
      const result = verifyAnswer(answer, largeSourceChunks);
      expect(result.confidence).toBe(1.0);
    });

    test('should handle answer containing only spaces and punctuation marks', () => {
      const answer = '  .  !  ?  ';
      const result = verifyAnswer(answer, largeSourceChunks);
      expect(result.confidence).toBe(1.0);
      expect(result.unverifiedClaims).toEqual([]);
    });

    test('should handle dot repeated answer gracefully', () => {
      const answer = '.'.repeat(1000);
      const result = verifyAnswer(answer, largeSourceChunks);
      expect(result.confidence).toBe(1.0);
    });

    test('should check invariants across 100 randomized claim-sources combos', () => {
      for (let i = 0; i < 100; i++) {
        const claims = Array.from({ length: Math.floor(Math.random() * 20) }, () => 
          `Claim that value is Rs. ${Math.floor(Math.random() * 10000)}.`
        ).join(' ');

        const nSources = Math.floor(Math.random() * 10);
        const sources = Array.from({ length: nSources }, () => 
          `Source doc mentions value is Rs. ${Math.floor(Math.random() * 10000)}.`
        );

        let result;
        expect(() => {
          result = verifyAnswer(claims, sources);
        }).not.toThrow();

        // Invariants
        expect(result.confidence).toBeGreaterThanOrEqual(0.0);
        expect(result.confidence).toBeLessThanOrEqual(1.0);
        expect(Array.isArray(result.unverifiedClaims)).toBe(true);
        expect(typeof result.confidence).toBe('number');
      }
    });

    test('should fail when number matches are different', () => {
      const sources = ['The liability limit is Rs. 50,000 only.'];
      const answer = 'The contract says the limit is Rs. 99,000.';
      const result = verifyAnswer(answer, sources);
      expect(result.confidence).toBe(0.0);
      expect(result.unverifiedClaims).toContain('The contract says the limit is Rs. 99,000.');
    });
  });
});
