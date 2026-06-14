import { splitIntoChunks } from '../../../../LegalAI/src/services/pdfService';
import { search, getRelevantContext } from '../../../../LegalAI/src/services/retrievalService';
import { buildBudgetedContext } from '../../../../LegalAI/src/services/contextBudget';
import { verifyAnswer } from '../../../../LegalAI/src/services/answerVerifier';

describe('Retrieval Pipeline Integration Test', () => {
  const sampleDocument = `
LEGAL AGREEMENT - PAYMENT AND TERMINATION DETAILS

This is Section 1 regarding payment obligations. The client agrees to pay a fixed retainer sum of Rs. 25,000 every month on or before the 5th day of the calendar month. Late payments shall attract interest at 10% per annum.

This is Section 2 regarding confidentiality. The parties shall not disclose any proprietary codebase or client information. This obligation shall survive for three (3) years after termination.

This is Section 3 regarding termination. Either party may terminate this agreement by providing thirty (30) days prior written notice. If either party breaches, the other party can terminate with 7 days notice.
  `;

  test('should run the end-to-end chunking, indexing, retrieval, budgeting, and verification pipeline', () => {
    // 1. Chunking
    const chunks = splitIntoChunks(sampleDocument, 200);
    expect(chunks.length).toBeGreaterThan(1);

    // 2. Retrieval Search
    const query = 'notice period for termination of agreement';
    const searchResults = search(query, chunks, 2);
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].chunk).toContain('termination');

    // 3. Relevant context formatting
    const formattedContext = getRelevantContext(query, chunks, 2);
    expect(formattedContext).toContain('[Chunk');

    // 4. Budgeting context
    const budgetResult = buildBudgetedContext(
      'System instructions',
      searchResults,
      query,
      1000,
      200
    );
    expect(budgetResult.usedChunks.length).toBeGreaterThan(0);
    expect(budgetResult.contextText).toContain('[Chunk');

    // 5. Verification
    const simulatedAnswer = 'Either party may terminate the agreement by giving thirty (30) days prior written notice.';
    const verification = verifyAnswer(simulatedAnswer, [budgetResult.contextText]);
    expect(verification.confidence).toBe(1.0);
    expect(verification.unverifiedClaims).toEqual([]);
  });
});
