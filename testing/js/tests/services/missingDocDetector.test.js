import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { detectMissingDocuments } from '../../../../LegalAI/src/services/missingDocDetector';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Missing Document Detector Service', () => {
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

  it('should return all missing if no documents are linked to a criminal case', async () => {
    useCaseStore.getState().addCase({
      title: 'State vs Rajesh',
      caseType: 'criminal'
    });
    const caseObj = useCaseStore.getState().cases[0];

    const result = await detectMissingDocuments(caseObj.id);

    expect(result.summary).toBe('0 of 5 required documents present');
    expect(result.checklist).toHaveLength(5);
    expect(result.checklist.every(c => c.required && !c.present)).toBe(true);
  });

  it('should match document by name directly', async () => {
    useDocumentStore.getState().addDocument({
      name: 'Delhi_FIR_123.pdf',
      uri: 'file://fir.pdf',
      size: 1024,
      extractedText: '',
      chunks: []
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({
      title: 'State vs Rajesh',
      caseType: 'criminal'
    });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    const result = await detectMissingDocuments(caseObj.id);

    // Fast name match should identify Delhi_FIR_123.pdf as 'FIR'
    const firItem = result.checklist.find(c => c.type === 'FIR');
    expect(firItem.present).toBe(true);
    expect(firItem.matchedDocId).toBe(doc.id);
    expect(result.summary).toBe('1 of 5 required documents present');
  });

  it('should fallback to LLM classification if name match fails', async () => {
    useDocumentStore.getState().addDocument({
      name: 'Scanned_Doc_Page2.pdf',
      uri: 'file://scanned.pdf',
      size: 1024,
      extractedText: 'IN THE COURT OF THE METROPOLITAN MAGISTRATE. CHARGE SHEET UNDER SECTION 173 CrPC...',
      chunks: ['IN THE COURT OF THE METROPOLITAN MAGISTRATE. CHARGE SHEET UNDER SECTION 173 CrPC...']
    });

    const doc = useDocumentStore.getState().documents[0];

    useCaseStore.getState().addCase({
      title: 'State vs Rajesh',
      caseType: 'criminal'
    });
    const caseObj = useCaseStore.getState().cases[0];
    useCaseStore.getState().addDocumentToCase(caseObj.id, doc.id);

    // Mock LLM classification returning Charge Sheet
    mockContext.completion.mockResolvedValueOnce({
      text: JSON.stringify({
        classifiedType: 'Charge Sheet'
      })
    });

    const progressCallback = jest.fn();
    const result = await detectMissingDocuments(caseObj.id, progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(1);
    const chargeItem = result.checklist.find(c => c.type === 'Charge Sheet');
    expect(chargeItem.present).toBe(true);
    expect(chargeItem.matchedDocId).toBe(doc.id);
    expect(result.summary).toBe('1 of 5 required documents present');
  });
});
