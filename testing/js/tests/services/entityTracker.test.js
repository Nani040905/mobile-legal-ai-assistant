import modelManager from '../../../../LegalAI/src/services/modelManager';
import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';
import { extractEntitiesFromDoc, buildEntityIndex } from '../../../../LegalAI/src/services/entityTracker';

jest.mock('../../../../LegalAI/src/services/modelManager', () => ({
  __esModule: true,
  default: {
    getContext: jest.fn()
  }
}));

describe('Entity Tracker Service', () => {
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

  describe('extractEntitiesFromDoc', () => {
    it('should throw an error if model is not loaded', async () => {
      modelManager.getContext.mockReturnValue(null);
      await expect(extractEntitiesFromDoc(['test'], 'doc1', 'FIR.pdf')).rejects.toThrow(
        'AI model is not loaded.'
      );
    });

    it('should extract entities from a chunk successfully', async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: JSON.stringify({
          entities: [
            { value: 'Rajesh Yadav', type: 'person' },
            { value: '2026-06-30', type: 'date' },
            { value: '50000', type: 'amount' }
          ]
        })
      });

      const progressCallback = jest.fn();
      const result = await extractEntitiesFromDoc(
        ['Rajesh Yadav paid 50000 on 2026-06-30.'],
        'doc1',
        'FIR.pdf',
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        value: 'Rajesh Yadav',
        type: 'person',
        docId: 'doc1',
        docName: 'FIR.pdf',
        chunkIndex: 0,
        preview: 'Rajesh Yadav paid 50000 on 2026-06-30.'
      });
    });

    it('should fallback to regex parsing if JSON is invalid', async () => {
      mockContext.completion.mockResolvedValueOnce({
        text: `Here is the JSON:
        {
          "value": "Manohar",
          "type": "person"
        }
        and that is all.`
      });

      const result = await extractEntitiesFromDoc(
        ['Manohar was there.'],
        'doc1',
        'Statement.pdf'
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Manohar');
      expect(result[0].type).toBe('person');
    });
  });

  describe('buildEntityIndex', () => {
    it('should build a grouped, cross-referenced entity index', async () => {
      // 1. Add mock documents to store
      useDocumentStore.getState().addDocument({
        name: 'FIR.pdf',
        uri: 'file://fir.pdf',
        size: 1024,
        extractedText: 'Suspect Rajesh Yadav was seen near Delhi court.',
        chunks: ['Suspect Rajesh Yadav was seen near Delhi court.']
      });
      useDocumentStore.getState().addDocument({
        name: 'Statement.pdf',
        uri: 'file://statement.pdf',
        size: 512,
        extractedText: 'Witness saw Rajesh Yadav pay 10000 rupees.',
        chunks: ['Witness saw Rajesh Yadav pay 10000 rupees.']
      });

      const docs = useDocumentStore.getState().documents;
      const firDoc = docs.find(d => d.name === 'FIR.pdf');
      const statementDoc = docs.find(d => d.name === 'Statement.pdf');

      // 2. Add mock case to store linking the documents
      useCaseStore.getState().addCase({
        title: 'Mock Case',
        caseType: 'criminal',
        caseNumber: '123/2026'
      });
      const caseObj = useCaseStore.getState().cases[0];
      useCaseStore.getState().addDocumentToCase(caseObj.id, firDoc.id);
      useCaseStore.getState().addDocumentToCase(caseObj.id, statementDoc.id);

      // 3. Mock LLM completions for each document
      mockContext.completion
        // First doc: FIR.pdf
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              { value: 'Rajesh Yadav', type: 'person' },
              { value: 'Delhi Court', type: 'address' }
            ]
          })
        })
        // Second doc: Statement.pdf
        .mockResolvedValueOnce({
          text: JSON.stringify({
            entities: [
              { value: 'Rajesh Yadav', type: 'person' },
              { value: '10000', type: 'amount' }
            ]
          })
        });

      const progressCallback = jest.fn();
      const index = await buildEntityIndex(caseObj.id, progressCallback);

      // Expect progress updates
      expect(progressCallback).toHaveBeenCalledTimes(2);

      // Expect merged, deduplicated entities grouped by type
      expect(index.person).toHaveLength(1); // Rajesh Yadav is merged
      expect(index.person[0].value).toBe('Rajesh Yadav');
      expect(index.person[0].appearances).toHaveLength(2); // Appears in both docs

      expect(index.address).toHaveLength(1);
      expect(index.address[0].value).toBe('Delhi Court');

      expect(index.amount).toHaveLength(1);
      expect(index.amount[0].value).toBe('10000');
    });
  });
});
