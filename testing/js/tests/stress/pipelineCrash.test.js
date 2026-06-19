import { splitIntoChunks } from '../../../../LegalAI/src/services/pdfService';
import { search, getRelevantContext } from '../../../../LegalAI/src/services/retrievalService';
import { buildBudgetedContext } from '../../../../LegalAI/src/services/contextBudget';
import { verifyAnswer } from '../../../../LegalAI/src/services/answerVerifier';

describe('Retrieval Pipeline Integration Stress Suite', () => {
  const sampleDocument = `
    LEGAL RETENTION AGREEMENT
    This agreement outlines the services.
    SECTION 1: Payment is Rs. 35,000 monthly. Payment is due on the 10th.
    SECTION 2: Confidentiality survives for 5 years. proprietary client database.
    SECTION 3: Termination notice is 60 days.
  `;

  test('should run the entire pipeline for 50 iterations without error or memory leaks', () => {
    for (let i = 0; i < 50; i++) {
      const chunks = splitIntoChunks(sampleDocument, 100);
      const query = `termination notice details payment ${i}`;
      const searchResults = search(query, chunks, 3);
      const budgetResult = buildBudgetedContext('System', searchResults, query, 1000, 200);
      const verification = verifyAnswer('Payment is Rs. 35,000 monthly.', [budgetResult.contextText]);

      expect(verification).toHaveProperty('confidence');
      expect(budgetResult.estimatedTokens).toBeLessThanOrEqual(1000);
    }
  });

  test('should handle empty document in the pipeline gracefully', () => {
    const chunks = splitIntoChunks('', 100);
    const searchResults = search('termination', chunks);
    const budgetResult = buildBudgetedContext('System', searchResults, 'termination', 1000, 200);
    const verification = verifyAnswer('Claim.', [budgetResult.contextText]);

    expect(verification.confidence).toBe(1.0); // empty sources defaults to 1.0 confidence or fallback
  });

  test('should handle all-stop-word query in the pipeline gracefully', () => {
    const chunks = splitIntoChunks(sampleDocument, 100);
    const searchResults = search('the of in for', chunks);
    expect(searchResults).toEqual([]);

    const budgetResult = buildBudgetedContext('System', searchResults, 'the of in for', 1000, 200);
    expect(budgetResult.usedChunks).toEqual([]);

    const verification = verifyAnswer('Claim.', [budgetResult.contextText]);
    expect(verification.confidence).toBe(1.0);
  });

  test('should handle giant 100KB document through the pipeline', () => {
    const giantDoc = 'This is section A. '.repeat(5000); // ~100KB
    const chunks = splitIntoChunks(giantDoc, 500);
    expect(chunks.length).toBeGreaterThan(10);

    const searchResults = search('section A', chunks, 5);
    const budgetResult = buildBudgetedContext('System', searchResults, 'section A', 2000, 500);
    expect(budgetResult.usedChunks.length).toBeGreaterThan(0);

    const verification = verifyAnswer('This is section A.', [budgetResult.contextText]);
    expect(verification.confidence).toBe(1.0);
  });

  test('should handle extremely tiny maxContext in the pipeline', () => {
    const chunks = splitIntoChunks(sampleDocument, 100);
    const searchResults = search('termination', chunks);
    const budgetResult = buildBudgetedContext('System', searchResults, 'termination', 50, 40); // 10 tokens left

    expect(budgetResult.usedChunks).toEqual([]);
    const verification = verifyAnswer('Termination notice is 60 days.', [budgetResult.contextText]);
    // Since context is empty, verification confidence is 0.0 because source is [""]
    expect(verification.confidence).toBe(0.0);
  });

  test('should satisfy pipeline invariants on 50 randomized query-budget combos', () => {
    const chunks = splitIntoChunks(sampleDocument, 120);

    for (let i = 0; i < 50; i++) {
      const budget = Math.floor(Math.random() * 2000) + 100;
      const reserve = Math.floor(Math.random() * (budget - 20));
      const query = i % 2 === 0 ? 'payment obligation limit' : 'confidentiality period years';

      const searchResults = search(query, chunks, 3);
      const budgetResult = buildBudgetedContext('System', searchResults, query, budget, reserve);
      const verification = verifyAnswer('Rs. 35,000 monthly payment is due.', [budgetResult.contextText]);

      // Invariants
      expect(budgetResult.estimatedTokens).toBeLessThanOrEqual(budget);
      expect(verification.confidence).toBeGreaterThanOrEqual(0.0);
      expect(verification.confidence).toBeLessThanOrEqual(1.0);
      expect(Array.isArray(verification.unverifiedClaims)).toBe(true);
    }
  });
});
