import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';

describe('useCaseStore', () => {
  beforeEach(() => {
    useCaseStore.getState().clearAllCases();
  });

  test('should initially have empty cases', () => {
    expect(useCaseStore.getState().cases).toEqual([]);
  });

  test('addCase should append a case with correct properties', () => {
    const caseData = { title: 'Murder trial Rajesh Yadav', description: 'IPC 302 charge' };
    useCaseStore.getState().addCase(caseData);

    const cases = useCaseStore.getState().cases;
    expect(cases.length).toBe(1);
    expect(cases[0].title).toBe('Murder trial Rajesh Yadav');
    expect(cases[0].id).toBeDefined();
    expect(cases[0].createdAt).toBeDefined();
  });

  test('deleteCase should remove a case by ID', () => {
    useCaseStore.getState().addCase({ title: 'Case A' });
    const addedCase = useCaseStore.getState().cases[0];
    
    useCaseStore.getState().deleteCase(addedCase.id);
    expect(useCaseStore.getState().cases.length).toBe(0);
  });

  test('updateCase should modify specific fields only', () => {
    useCaseStore.getState().addCase({ title: 'Case A', status: 'active' });
    const addedCase = useCaseStore.getState().cases[0];

    useCaseStore.getState().updateCase(addedCase.id, { title: 'Updated Case A' });
    const updated = useCaseStore.getState().getCaseById(addedCase.id);
    expect(updated.title).toBe('Updated Case A');
    expect(updated.status).toBe('active');
  });

  test('addDocumentToCase should associate a document ID', () => {
    useCaseStore.getState().addCase({ title: 'Case A' });
    const addedCase = useCaseStore.getState().cases[0];

    useCaseStore.getState().addDocumentToCase(addedCase.id, 'doc123');
    const updated = useCaseStore.getState().getCaseById(addedCase.id);
    expect(updated.documents).toContain('doc123');
  });
});
