import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { generateClientQuestions } from '../../../../LegalAI/src/services/clientQuestionGenerator';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Client Question Generator Service', () => {
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

  it('should generate clarifying questions, evidence needed list, and urgent actions', async () => {
    useDocumentStore.getState().addDocument({
      name: 'Deposition.pdf',
      uri: 'file://deposition.pdf',
      size: 1024,
      extractedText: 'Inconsistent dates mentioned.',
      chunks: ['Inconsistent dates mentioned.']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({
      title: 'State vs Rajesh',
      clientName: 'Rajesh',
      court: 'District Court',
      caseType: 'criminal',
      status: 'active'
    });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        questions: ['Question A'],
        evidenceNeeded: ['Evidence A'],
        urgentItems: ['Urgent A']
      })
    });

    const progressCallback = jest.fn();
    const result = await generateClientQuestions(caseObj.id, progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(result.questions).toEqual(['Question A']);
    expect(result.evidenceNeeded).toEqual(['Evidence A']);
    expect(result.urgentItems).toEqual(['Urgent A']);
  });
});
