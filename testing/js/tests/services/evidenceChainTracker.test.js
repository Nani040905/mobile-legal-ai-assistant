import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { buildEvidenceChain } from '../../../../LegalAI/src/services/evidenceChainTracker';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Evidence Chain Tracker Service', () => {
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseStore.getState().clearAllCases();
    useDocumentStore.getState().clearAll();

    mockContext = {
      clearCache: jest.fn().mockResolvedValue(undefined),
      completion: jest.fn()
    };
    modelManager.getContext.mockReturnValue(mockContext);
  });

  it('should throw an error if model is not loaded', async () => {
    modelManager.getContext.mockReturnValue(null);
    await expect(buildEvidenceChain('somecase')).rejects.toThrow(
      'AI model is not loaded.'
    );
  });

  it('should return empty items if no documents are linked', async () => {
    useCaseStore.getState().addCase({ title: 'Mock Case' });
    const caseObj = useCaseStore.getState().cases[0];

    const result = await buildEvidenceChain(caseObj.id);
    expect(result.items).toEqual([]);
    expect(result.confidence).toBe(50);
  });

  it('should analyze chunks and build evidence chain mapping successfully', async () => {
    // 1. Add mock doc & case
    useDocumentStore.getState().addDocument({
      name: 'FIR.pdf',
      uri: 'file://fir.pdf',
      size: 1024,
      extractedText: 'Delhi police arrested Rajesh Yadav with 100g drugs.',
      chunks: ['Delhi police arrested Rajesh Yadav with 100g drugs.']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({ title: 'Mock Case' });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    // 2. Mock LLM response
    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        items: [
          {
            fact: 'Rajesh Yadav was arrested at Delhi.',
            supportingEvidence: 'Arrest memo reference.',
            missingEvidence: 'CCTV footage of arrest scene.',
            status: 'STRONG'
          }
        ]
      })
    });

    const progressCallback = jest.fn();
    const result = await buildEvidenceChain(caseObj.id, progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].fact).toBe('Rajesh Yadav was arrested at Delhi.');
    expect(result.items[0].status).toBe('STRONG');
    expect(result.confidence).toBe(95);
  });

  it('should fallback to regex parsing if LLM output is malformed', async () => {
    useDocumentStore.getState().addDocument({
      name: 'FIR.pdf',
      uri: 'file://fir.pdf',
      size: 1024,
      extractedText: 'Fact claim.',
      chunks: ['Fact claim.']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({ title: 'Mock Case' });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    // Malformed JSON wrapping or conversational junk
    mockContext.completion.mockResolvedValueOnce({
      text: `Sure, here is the fact:
      {
        "fact": "Suspect had a weapon.",
        "supportingEvidence": "Officer verbal statement.",
        "missingEvidence": "Weapon recovery memo.",
        "status": "WEAK"
      }
      Let me know if you need more.`
    });

    const result = await buildEvidenceChain(caseObj.id);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].fact).toBe('Suspect had a weapon.');
    expect(result.items[0].status).toBe('WEAK');
  });
});
