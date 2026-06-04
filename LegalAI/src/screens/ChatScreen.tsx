/*
 * ChatScreen.tsx — The AI chat interface screen.
 *
 * PURPOSE: Provides a full chat experience where users can ask legal
 * questions and receive AI-generated responses. Messages are displayed
 * in a scrollable list with the input bar fixed at the bottom.
 *
 * DESIGN DECISIONS:
 * - FlatList (not ScrollView) for the message list — FlatList virtualizes
 *   off-screen items, so it performs well even with hundreds of messages.
 * - inverted={false} + scrollToEnd — messages flow top-to-bottom naturally.
 * - KeyboardAvoidingView — shifts the input bar up when the keyboard opens,
 *   so users can always see what they're typing.
 * - The chat store (Zustand) manages all message state — this screen
 *   only renders and dispatches actions.
 *
 * STATE FLOW:
 * User types → handleSend → useChatStore.sendMessage → addMessage(user) →
 * llmService.generateResponse → addMessage(ai) → FlatList re-renders
 */

/* Import React and useRef for the FlatList scroll reference */
import React, { useRef } from 'react';

/* Import RN components */
import {
  View,                    // Layout container
  Text,                    // Text rendering
  FlatList,                // Virtualized list — only renders visible items
  StyleSheet,              // Optimized styles
  KeyboardAvoidingView,    // Adjusts layout when keyboard opens
  Platform,                // Detects iOS vs Android for platform-specific behavior
  ActivityIndicator,       // Spinning loader for the "AI is typing" indicator
} from 'react-native';

/* SafeAreaView for notch/status bar handling */
import { SafeAreaView } from 'react-native-safe-area-context';

/* Navigation hook for the back button */
import { useNavigation } from '@react-navigation/native';

/* Import our custom components */
import Header from '../components/Header';        // Screen header with back button
import ChatMessage from '../components/ChatMessage'; // Individual message bubble
import ChatInput from '../components/ChatInput';    // Bottom input bar

/* Import the Zustand chat store for state management */
import useChatStore from '../store/useChatStore';

/* Import the Message type for FlatList typing */
import { Message } from '../store/useChatStore';

/* Import theme tokens */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/*
 * ChatScreen — The main chat interface component.
 *
 * Renders:
 * 1. Header with back button and title
 * 2. Message list (FlatList of ChatMessage components)
 * 3. Typing indicator (shown when AI is processing)
 * 4. Input bar (ChatInput component)
 */
const ChatScreen: React.FC = () => {
  /* Navigation hook — used for the back button in the header */
  const navigation = useNavigation();

  /*
   * useRef for the FlatList — allows us to programmatically scroll.
   * We use this to auto-scroll to the bottom when new messages arrive.
   * FlatList<Message> types the ref so TypeScript knows the list item type.
   */
  const flatListRef = useRef<FlatList<Message>>(null);

  /*
   * Access the Zustand store state and actions.
   *
   * useChatStore(state => state.X) — Selector pattern.
   * Each selector creates a subscription to only that piece of state.
   * This means the component only re-renders when the selected value changes,
   * NOT when unrelated state in the store changes. This is a performance optimization.
   */
  const messages = useChatStore(state => state.messages);       // All chat messages
  const isLoading = useChatStore(state => state.isLoading);     // AI processing state
  const sendMessage = useChatStore(state => state.sendMessage); // Action to send a message
  const stopGeneration = useChatStore(state => state.stopGeneration); // Action to stop generation

  /*
   * handleSend — Called when the user submits a message from ChatInput.
   *
   * 1. Calls sendMessage which adds the user message and triggers AI response.
   * 2. After a short delay, scrolls the FlatList to show the new message.
   *
   * The setTimeout delay (100ms) ensures the FlatList has time to render
   * the new message before we try to scroll to it.
   */
  const handleSend = (text: string) => {
    /* Dispatch the sendMessage action to the Zustand store */
    sendMessage(text);

    /*
     * Auto-scroll to the end after a brief delay.
     * The delay gives React time to render the new message item
     * before we try to scroll to it. Without the delay, scrollToEnd
     * might scroll to the second-to-last item.
     */
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true }); // Smooth scroll animation
    }, 100); // 100ms delay — enough for React to render
  };

  /*
   * renderMessage — FlatList's renderItem callback.
   *
   * FlatList calls this for each visible item in the list.
   * The `item` is a Message object from our messages array.
   * We wrap it in a ChatMessage component for display.
   *
   * The { item } destructuring extracts the message from FlatList's
   * ListRenderItemInfo object (which also contains index, separators).
   */
  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} /> // Pass the message to our bubble component
  );

  /*
   * renderEmptyChat — Shown when there are no messages yet.
   *
   * FlatList's ListEmptyComponent prop renders this when data is empty.
   * It provides a welcoming prompt so the screen doesn't feel blank.
   */
  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      {/* Large scales-of-justice emoji — matches the app brand */}
      <Text style={styles.emptyIcon}>⚖️</Text>

      {/* Welcome heading */}
      <Text style={styles.emptyTitle}>Ask Indian Legal AI</Text>

      {/* Suggestion text — helps users know what to type */}
      <Text style={styles.emptySubtitle}>
        Ask legal questions, BNS/IPC sections, or analyze legal documents under Indian jurisdiction.
      </Text>

      {/* Example prompts to inspire the user */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionLabel}>Try asking:</Text>
        <Text style={styles.suggestionText}>• "What are the key changes in Bharatiya Nyaya Sanhita (BNS)?"</Text>
        <Text style={styles.suggestionText}>• "Explain the difference between IPC and BNS"</Text>
        <Text style={styles.suggestionText}>• "What are my rights under the Consumer Protection Act of India?"</Text>
      </View>
    </View>
  );

  return (
    /*
     * SafeAreaView wraps the screen to handle device notches.
     * edges={['top']} only adds padding at the top — the bottom is
     * handled by KeyboardAvoidingView and the input bar.
     */
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button — navigates to Home screen */}
      <Header
        title="Chat"
        subtitle="Ask legal questions"
        showBack={true}
        onBackPress={() => navigation.goBack()} // Pop this screen off the stack
      />

      {/*
       * KeyboardAvoidingView — Automatically adjusts its height/position
       * when the keyboard opens, so the input bar stays visible.
       *
       * behavior="padding" (iOS) — Adds padding at the bottom.
       * behavior={undefined} (Android) — Android handles this natively
       * via android:windowSoftInputMode="adjustResize" in AndroidManifest.xml.
       */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} // Platform-specific behavior
        keyboardVerticalOffset={0} // No additional offset needed
      >
        {/*
         * FlatList — The scrollable message list.
         *
         * Key props:
         * - ref — Allows programmatic scrolling via flatListRef.current
         * - data — The messages array from Zustand store
         * - renderItem — How to render each message
         * - keyExtractor — Unique key for each item (React's reconciliation needs this)
         * - contentContainerStyle — Padding inside the scrollable area
         * - ListEmptyComponent — What to show when there are no messages
         * - onContentSizeChange — Auto-scroll when content grows (new messages)
         * - showsVerticalScrollIndicator — Hide scrollbar for cleaner look
         */}
        <FlatList
          ref={flatListRef}                    // Reference for programmatic scroll
          data={messages}                      // Message array from Zustand store
          renderItem={renderMessage}           // Render each message as a ChatMessage bubble
          keyExtractor={item => item.id}       // Use message ID as the unique key
          contentContainerStyle={styles.messageList} // Padding for the list content
          ListEmptyComponent={renderEmptyChat} // Show welcome screen when no messages
          showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner UI
          onContentSizeChange={() => {
            /*
             * Auto-scroll to bottom whenever content size changes.
             * This fires when new messages are added to the list.
             * scrollToEnd smoothly animates to the last message.
             */
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/*
         * Typing indicator — shown when the AI is generating a response.
         * Displays three animated dots and "AI is thinking..." text.
         * Only renders when isLoading is true (conditional rendering with &&).
         */}
        {isLoading && (
          <View style={styles.typingIndicator}>
            {/* ActivityIndicator — native spinning loader */}
            <ActivityIndicator
              size="small"               // Small spinner
              color={COLORS.primary}     // Gold color — matches the brand
            />
            {/* "AI is thinking..." label */}
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        )}

        {/*
         * ChatInput — The bottom input bar.
         * onSend triggers the handleSend function above.
         * isLoading disables the input while AI is processing.
         * onStop cancels the active model generation.
         */}
        <ChatInput onSend={handleSend} isLoading={isLoading} onStop={stopGeneration} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/*
 * Styles for the chat screen.
 * Organized by: layout, message list, empty state, typing indicator.
 */
const styles = StyleSheet.create({
  /* Main screen container — dark background, fills screen */
  container: {
    flex: 1,                          // Take all available space
    backgroundColor: COLORS.background, // Deep navy
  },

  /* Chat area container — everything below the header */
  chatContainer: {
    flex: 1, // Take all space below the header
  },

  /* Padding inside the FlatList — gives messages breathing room */
  messageList: {
    flexGrow: 1,              // Allow the list to grow to fill space
    paddingVertical: SPACING.md, // 16px top/bottom padding
  },

  /* ─── Empty State Styles ─── */

  /* Container for the empty chat welcome screen */
  emptyContainer: {
    flex: 1,                  // Fill all available space
    justifyContent: 'center', // Center vertically
    alignItems: 'center',    // Center horizontally
    padding: SPACING.xl,     // 32px padding from edges
  },

  /* Large emoji icon for the empty state */
  emptyIcon: {
    fontSize: 64,             // Very large
    marginBottom: SPACING.lg, // 24px gap below
  },

  /* "Ask me anything" heading */
  emptyTitle: {
    fontSize: FONTS.heading,          // 22px
    fontWeight: FONTS.weightBold,     // Bold
    color: COLORS.textPrimary,        // White
    marginBottom: SPACING.sm,        // 8px gap
    textAlign: 'center',
  },

  /* Subtitle description text */
  emptySubtitle: {
    fontSize: FONTS.body,             // 16px
    color: COLORS.textSecondary,      // Muted gray-blue
    textAlign: 'center',
    lineHeight: 22,                   // Comfortable line height
    marginBottom: SPACING.lg,        // 24px gap before suggestions
  },

  /* Suggestions container — background card for example prompts */
  suggestionsContainer: {
    backgroundColor: COLORS.surface,   // Card background
    borderRadius: RADIUS.md,           // 12px rounded
    padding: SPACING.md,              // 16px padding
    width: '100%',                     // Full width of parent
    borderWidth: 1,                    // Subtle border
    borderColor: COLORS.border,        // Dark border
  },

  /* "Try asking:" label */
  suggestionLabel: {
    fontSize: FONTS.caption,           // 14px
    color: COLORS.primary,            // Gold accent
    fontWeight: FONTS.weightSemiBold,
    marginBottom: SPACING.sm,         // 8px gap before examples
  },

  /* Individual suggestion text */
  suggestionText: {
    fontSize: FONTS.body,             // 16px
    color: COLORS.textSecondary,      // Muted gray-blue
    marginBottom: SPACING.xs,        // 4px gap between suggestions
    lineHeight: 24,                   // Generous line height for readability
  },

  /* ─── Typing Indicator Styles ─── */

  /* Container for the "AI is thinking" indicator */
  typingIndicator: {
    flexDirection: 'row',             // Spinner and text side by side
    alignItems: 'center',            // Vertically centered
    paddingHorizontal: SPACING.lg,   // 24px left/right padding
    paddingVertical: SPACING.sm,     // 8px top/bottom padding
  },

  /* "AI is thinking..." text */
  typingText: {
    fontSize: FONTS.caption,          // 14px
    color: COLORS.textMuted,         // Very subtle gray
    marginLeft: SPACING.sm,          // 8px gap from spinner
    fontStyle: 'italic',              // Italic — indicates transient state
  },
});



/* Export for use in AppNavigator */
export default ChatScreen;
