import useChatStore from '../../../../LegalAI/src/store/useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  test('should initially have empty messages', () => {
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  test('addMessage should append a message object with timestamps', () => {
    useChatStore.getState().addMessage('Hello User', 'ai');
    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(1);
    expect(messages[0].text).toBe('Hello User');
    expect(messages[0].sender).toBe('ai');
    expect(messages[0].id).toBeDefined();
    expect(messages[0].timestamp).toBeDefined();
  });

  test('clearMessages should remove all messages', () => {
    useChatStore.getState().addMessage('Hello', 'user');
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  test('setPerspective and setCaseType should update values', () => {
    useChatStore.getState().setPerspective('prosecution');
    useChatStore.getState().setCaseType('criminal');
    expect(useChatStore.getState().selectedPerspective).toBe('prosecution');
    expect(useChatStore.getState().selectedCaseType).toBe('criminal');
  });
});
