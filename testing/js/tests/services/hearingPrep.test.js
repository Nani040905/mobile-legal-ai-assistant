import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { prepareHearingBrief } from '../../../../LegalAI/src/services/hearingPrep';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Hearing Prep Service', () => {
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

  it('should generate structured brief successfully', async () => {
    useDocumentStore.getState().addDocument({
      name: 'FIR.pdf',
      uri: 'file://fir.pdf',
      size: 1024,
      extractedText: 'Crime scene details.',
      chunks: ['Crime scene details.']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({
      title: 'Mock Case',
      clientName: 'Rajesh',
      court: 'Delhi Court',
      caseType: 'criminal',
      status: 'active'
    });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        keyFacts: ['Fact A', 'Fact B'],
        importantDates: ['2026-06-30: Event'],
        strongestArguments: ['Argument 1'],
        weakestPoints: ['Weak point 1'],
        questionsOpponentMayAsk: ['Q1'],
        questionsCourtMayAsk: ['Q2'],
        likelyJudgeQuestions: ['Q3'],
        documentsToCarry: ['Doc 1'],
        confidence: 88
      })
    });

    const progressCallback = jest.fn();
    const result = await prepareHearingBrief(caseObj.id, 'defense', progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(result.keyFacts).toEqual(['Fact A', 'Fact B']);
    expect(result.confidence).toBe(88);
  });
});
