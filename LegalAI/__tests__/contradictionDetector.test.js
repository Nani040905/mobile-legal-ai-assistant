import modelManager from '../src/services/modelManager';
import { detectContradictions } from '../src/services/contradictionDetector';

jest.mock('../src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Contradiction Detector Service', () => {
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      clearCache: jest.fn().mockResolvedValue(undefined),
      completion: jest.fn()
    };
    modelManager.getContext.mockReturnValue(mockContext);
  });

  it('should throw an error if model is not loaded', async () => {
    modelManager.getContext.mockReturnValue(null);
    await expect(detectContradictions([])).rejects.toThrow(
      'AI model is not loaded. Go to Settings → Load Model first.'
    );
  });

  it('should throw an error if less than 2 documents are linked', async () => {
    const docs = [{ id: '1', name: 'FIR.pdf', chunks: [] }];
    await expect(detectContradictions(docs)).rejects.toThrow(
      'Please link at least two documents to compare for contradictions.'
    );
  });

  it('should return empty contradictions if no text chunks exist', async () => {
    const docs = [
      { id: '1', name: 'FIR.pdf', chunks: [] },
      { id: '2', name: 'Statement.pdf', chunks: [] }
    ];
    const result = await detectContradictions(docs);
    expect(result.contradictions).toEqual([]);
    expect(result.confidence).toBe(50);
  });

  it('should extract facts and detect contradictions correctly', async () => {
    const docs = [
      { id: '1', name: 'FIR.pdf', chunks: ['Incident time 9:30 PM. Red sedan.'] },
      { id: '2', name: 'Statement.pdf', chunks: ['Happened at 10:15 PM. Blue SUV.'] }
    ];

    mockContext.completion
      // First call: Fact extraction for FIR.pdf
      .mockResolvedValueOnce({
        text: '- Factual Claim: Incident occurred at 9:30 PM.\n- Factual Claim: Suspect vehicle was a red sedan.'
      })
      // Second call: Fact extraction for Statement.pdf
      .mockResolvedValueOnce({
        text: '- Factual Claim: Incident was at 10:15 PM.\n- Factual Claim: Suspect vehicle was a blue SUV.'
      })
      // Third call: Contradiction check
      .mockResolvedValueOnce({
        text: JSON.stringify({
          contradictions: [
            {
              topic: 'Suspect vehicle mismatch',
              statementA: 'Suspect vehicle was a red sedan.',
              docSourceA: 'FIR.pdf',
              statementB: 'Suspect vehicle was a blue SUV.',
              docSourceB: 'Statement.pdf',
              severity: 'HIGH'
            }
          ]
        })
      });

    const progressCallback = jest.fn();
    const result = await detectContradictions(docs, progressCallback);

    expect(mockContext.clearCache).toHaveBeenCalledTimes(3);
    expect(mockContext.completion).toHaveBeenCalledTimes(3);
    
    // Check progress reporting
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining('Extracting facts'),
      expect.any(Number),
      expect.any(Number)
    );
    expect(progressCallback).toHaveBeenLastCalledWith(
      'Comparing facts cross-document to detect contradictions...',
      2,
      2
    );

    // Verify report format
    expect(result.confidence).toBeGreaterThan(60);
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0]).toEqual({
      topic: 'Suspect vehicle mismatch',
      statementA: 'Suspect vehicle was a red sedan.',
      docSourceA: 'FIR.pdf',
      statementB: 'Suspect vehicle was a blue SUV.',
      docSourceB: 'Statement.pdf',
      severity: 'HIGH'
    });
  });

  it('should fallback to regex parsing if LLM output is malformed JSON', async () => {
    const docs = [
      { id: '1', name: 'FIR.pdf', chunks: ['Fact A'] },
      { id: '2', name: 'Statement.pdf', chunks: ['Fact B'] }
    ];

    mockContext.completion
      .mockResolvedValueOnce({ text: '- Factual Claim: A' })
      .mockResolvedValueOnce({ text: '- Factual Claim: B' })
      .mockResolvedValueOnce({
        // Malformed JSON wrapping or garbage text
        text: `Here is the analysis results:
        {
          "topic": "Conflict of facts",
          "statementA": "A",
          "docSourceA": "FIR.pdf",
          "statementB": "B",
          "docSourceB": "Statement.pdf",
          "severity": "MEDIUM"
        }
        Hope this is useful.`
      });

    const result = await detectContradictions(docs);
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0].topic).toBe('Conflict of facts');
  });
});
