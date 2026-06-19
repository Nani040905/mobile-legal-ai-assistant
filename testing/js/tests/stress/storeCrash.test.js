import useCaseStore from '../../../../LegalAI/src/store/useCaseStore';
import useChatStore from '../../../../LegalAI/src/store/useChatStore';
import useDocumentStore from '../../../../LegalAI/src/store/useDocumentStore';

describe('Zustand Stores Concurrency & Mutation Stress Suite', () => {
  beforeEach(() => {
    useCaseStore.getState().clearAllCases();
    useChatStore.getState().clearMessages();
    useDocumentStore.getState().clearAll();
  });

  describe('useCaseStore Stress & Crash', () => {
    test('should add 1000 cases sequentially and verify ID uniqueness', () => {
      const state = useCaseStore.getState();
      for (let i = 0; i < 1000; i++) {
        state.addCase({ title: `Case ${i}`, description: `Description ${i}` });
      }

      const cases = useCaseStore.getState().cases;
      expect(cases.length).toBe(1000);

      // Check uniqueness of IDs
      const idSet = new Set(cases.map(c => c.id));
      expect(idSet.size).toBe(1000);
    });

    test('should delete 500 cases from 1000 cleanly without dangling references', () => {
      const state = useCaseStore.getState();
      for (let i = 0; i < 1000; i++) {
        state.addCase({ title: `Case ${i}` });
      }
      
      const casesBefore = [...useCaseStore.getState().cases];
      for (let i = 0; i < 500; i++) {
        state.deleteCase(casesBefore[i].id);
      }

      const casesAfter = useCaseStore.getState().cases;
      expect(casesAfter.length).toBe(500);
    });

    test('should handle updating the same case 1000 times rapidly', () => {
      const state = useCaseStore.getState();
      state.addCase({ title: 'Original Case' });
      const added = useCaseStore.getState().cases[0];

      for (let i = 0; i < 1000; i++) {
        state.updateCase(added.id, { title: `Updated Title ${i}` });
      }

      const updated = state.getCaseById(added.id);
      expect(updated.title).toBe('Updated Title 999');
    });

    test('should handle giant case descriptions of 50,000 characters', () => {
      const state = useCaseStore.getState();
      const giantText = 'a'.repeat(50000);
      expect(() => {
        state.addCase({ title: 'Giant Case', description: giantText });
      }).not.toThrow();
      const added = useCaseStore.getState().cases[0];
      expect(added.description).toBe(giantText);
    });

    test('getCaseById should return undefined and not crash for nonexistent IDs', () => {
      expect(useCaseStore.getState().getCaseById('nonexistent-id')).toBeUndefined();
    });
  });

  describe('useChatStore Stress & Crash', () => {
    test('should append 5000 messages in a loop and preserve ordering', () => {
      const state = useChatStore.getState();
      for (let i = 0; i < 5000; i++) {
        state.addMessage(`Message content ${i}`, i % 2 === 0 ? 'user' : 'ai');
      }

      const messages = useChatStore.getState().messages;
      expect(messages.length).toBe(5000);
      for (let i = 0; i < 100; i++) {
        expect(messages[i].text).toBe(`Message content ${i}`);
      }
    });

    test('should handle giant message content of 100,000 characters', () => {
      const state = useChatStore.getState();
      const giantText = 'm'.repeat(100000);
      expect(() => {
        state.addMessage(giantText, 'ai');
      }).not.toThrow();
      expect(useChatStore.getState().messages[0].text).toBe(giantText);
    });

    test('should toggle loading state rapidly 1000 times', () => {
      const state = useChatStore.getState();
      for (let i = 0; i < 1000; i++) {
        useChatStore.setState({ isLoading: i % 2 === 0 });
      }
      expect(typeof state.isLoading).toBe('boolean');
    });
  });

  describe('useDocumentStore Stress & Crash', () => {
    test('should append 500 documents and handle 20,000 chunks for one document', () => {
      const state = useDocumentStore.getState();
      for (let i = 0; i < 500; i++) {
        state.addDocument({ name: `doc_${i}.pdf`, uri: `/path/doc_${i}.pdf` });
      }

      const docs = useDocumentStore.getState().documents;
      expect(docs.length).toBe(500);

      const targetDoc = docs[250];
      const hugeChunks = Array.from({ length: 20000 }, (_, i) => `This is chunk number ${i}`);
      expect(() => {
        state.updateDocumentText(targetDoc.id, 'Full text content', hugeChunks);
      }).not.toThrow();

      const updated = state.getDocumentById(targetDoc.id);
      expect(updated.chunks.length).toBe(20000);
    });

    test('getDocumentById should return undefined and not crash for nonexistent IDs', () => {
      expect(useDocumentStore.getState().getDocumentById('nonexistent-id')).toBeUndefined();
    });
  });
});
