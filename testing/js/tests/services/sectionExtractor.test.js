import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { extractSectionsFromCase, explainSection } from '../../../../LegalAI/src/services/sectionExtractor';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Section Extractor Service', () => {
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

  it('should extract sections from case documents', async () => {
    useDocumentStore.getState().addDocument({
      name: 'charge.pdf',
      uri: 'file://charge.pdf',
      size: 1024,
      extractedText: 'Charged under Section 302 of the IPC.',
      chunks: ['Charged under Section 302 of the IPC.']
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
        sections: [
          { sectionCode: 'Section 302', actName: 'Indian Penal Code' }
        ]
      })
    });

    const result = await extractSectionsFromCase(caseObj.id);
    expect(result).toEqual([
      { sectionCode: 'Section 302', actName: 'Indian Penal Code' }
    ]);
  });

  it('should generate explanation for a legal section', async () => {
    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        sectionCode: 'Section 420',
        actName: 'Indian Penal Code',
        ingredients: ['Cheating', 'Dishonest inducement'],
        burden: 'On prosecution beyond doubt',
        penalty: 'Up to 7 years imprisonment and fine',
        defenses: ['No dishonest intention at inception'],
        commonMistakes: ['Failing to prove deception at inception'],
        relatedSections: ['Section 415']
      })
    });

    const result = await explainSection('Section 420', 'Indian Penal Code');

    expect(result.ingredients).toContain('Cheating');
    expect(result.commonMistakes).toContain('Failing to prove deception at inception');
    expect(result.penalty).toBe('Up to 7 years imprisonment and fine');
  });
});
