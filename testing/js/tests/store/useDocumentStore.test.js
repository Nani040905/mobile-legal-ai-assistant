import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.getState().clearAll();
  });

  test('should initially have empty documents list', () => {
    expect(useDocumentStore.getState().documents).toEqual([]);
  });

  test('addDocument should append a document to the list', () => {
    const docMeta = { name: 'EmploymentAgreement.txt', uri: '/docs/EmploymentAgreement.txt', size: 1024 };
    useDocumentStore.getState().addDocument(docMeta);

    const docs = useDocumentStore.getState().documents;
    expect(docs.length).toBe(1);
    expect(docs[0].name).toBe('EmploymentAgreement.txt');
    expect(docs[0].id).toBeDefined();
    expect(docs[0].uploadedAt).toBeDefined();
  });

  test('removeDocument should remove a document by ID', () => {
    useDocumentStore.getState().addDocument({ name: 'Doc A', uri: '/a.pdf' });
    const added = useDocumentStore.getState().documents[0];

    useDocumentStore.getState().removeDocument(added.id);
    expect(useDocumentStore.getState().documents.length).toBe(0);
  });

  test('updateDocumentText should store extracted text and chunks', () => {
    useDocumentStore.getState().addDocument({ name: 'Doc A', uri: '/a.pdf' });
    const added = useDocumentStore.getState().documents[0];
    const text = 'Full text content';
    const chunks = ['Full text', 'content'];

    useDocumentStore.getState().updateDocumentText(added.id, text, chunks);
    const updated = useDocumentStore.getState().getDocumentById(added.id);
    expect(updated.extractedText).toBe(text);
    expect(updated.chunks).toEqual(chunks);
  });

  test('updateDocumentSummary should store summary', () => {
    useDocumentStore.getState().addDocument({ name: 'Doc A', uri: '/a.pdf' });
    const added = useDocumentStore.getState().documents[0];
    const summary = 'Summary text';

    useDocumentStore.getState().updateDocumentSummary(added.id, summary);
    const updated = useDocumentStore.getState().getDocumentById(added.id);
    expect(updated.summary).toBe(summary);
  });
});
