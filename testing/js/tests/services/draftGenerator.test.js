import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { generateLegalDraft } from '../../../../LegalAI/src/services/draftGenerator';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Draft Generator Service', () => {
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

  it('should generate a legal draft successfully', async () => {
    mockContext.completion.mockResolvedValueOnce({
      text: 'FORMAL LEGAL NOTICE:\nTo whom it may concern...'
    });

    const progressCallback = jest.fn();
    const result = await generateLegalDraft(
      null,
      'legal_notice',
      {
        clientName: 'Rajesh',
        opponentName: 'Suresh',
        court: 'Delhi',
        facts: 'Breach of lease agreement.'
      },
      progressCallback
    );

    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(result).toContain('FORMAL LEGAL NOTICE');
  });
});
