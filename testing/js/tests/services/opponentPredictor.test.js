import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { predictOpponentArguments } from '../../../../LegalAI/src/services/opponentPredictor';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Opponent Predictor Service', () => {
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

  it('should predict opponent strategy and legal arguments', async () => {
    useDocumentStore.getState().addDocument({
      name: 'Complaint.pdf',
      uri: 'file://complaint.pdf',
      size: 1024,
      extractedText: 'Civil breach claim.',
      chunks: ['Civil breach claim.']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({
      title: 'Breach of Contract Rajesh',
      clientName: 'Rajesh',
      court: 'Delhi High Court',
      caseType: 'civil',
      status: 'active'
    });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        likelyArguments: ['Argument A'],
        counterarguments: ['Counter A'],
        vulnerabilities: ['Vuln A'],
        confidence: 82
      })
    });

    const progressCallback = jest.fn();
    const result = await predictOpponentArguments(caseObj.id, 'plaintiff', progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(result.likelyArguments).toEqual(['Argument A']);
    expect(result.counterarguments).toEqual(['Counter A']);
    expect(result.vulnerabilities).toEqual(['Vuln A']);
    expect(result.confidence).toBe(82);
  });
});
