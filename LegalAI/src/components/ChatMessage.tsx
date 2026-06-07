/*
 * ChatMessage.tsx — A single chat message bubble component.
 *
 * PURPOSE: Renders one message in the chat conversation.
 * User messages appear on the RIGHT with a gold accent.
 * AI messages appear on the LEFT with a surface background.
 * This visual distinction makes conversations easy to follow.
 *
 * DESIGN DECISIONS:
 * - Bubble layout (not full-width rows) — familiar chat UX pattern.
 * - maxWidth: 80% — prevents bubbles from spanning the full screen width.
 * - Timestamp shown below each message — provides context for conversation flow.
 * - Emoji avatar for AI messages (🤖) — quick visual identifier.
 *
 * PROPS:
 * - message: Message — The message object from the chat store.
 */

/* Import React — required for JSX */
import React from 'react';

/* Import RN components for layout and text */
import {
  View,       // Layout container
  Text,       // Text rendering
  StyleSheet, // Optimized styles
} from 'react-native';

/* Import the Message type from our store for type safety */
import { Message } from '../store/useChatStore';

/* Import theme tokens */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/* Import CitationSource type and CitationPanel component */
import { CitationSource } from '../services/retrievalService';
import { CitationPanel } from './CitationPanel';

/*
 * Props interface — defines what this component accepts.
 * Accepts the message object and an optional citation press handler.
 */
interface ChatMessageProps {
  message: Message; // The full message object (id, text, sender, timestamp)
  onCitationPress?: (citation: CitationSource) => void; // Optional citation click handler
}

/*
 * ChatMessage — Renders a single chat bubble.
 *
 * The component checks message.sender to determine:
 * - Alignment (left for AI, right for user)
 * - Background color (surface for AI, primary for user)
 * - Text color (white for both, but different backgrounds create contrast)
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCitationPress }) => {
  /* Determine if this message is from the user (vs the AI) */
  const isUser = message.sender === 'user'; // Boolean — true for user, false for AI

  /*
   * Format the timestamp for display.
   * new Date(message.timestamp) parses the ISO string back to a Date object.
   * toLocaleTimeString() formats it in the user's locale (e.g., "3:45 PM").
   * The options object removes seconds for cleaner display.
   */
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',   // Two-digit hour (e.g., "03" or "15")
    minute: '2-digit', // Two-digit minute (e.g., "45")
  });

  return (
    /*
     * Outer container — controls horizontal alignment.
     * User messages align to the right (flex-end).
     * AI messages align to the left (flex-start).
     */
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer, // Conditional alignment
      ]}
    >
      {/* Show a robot emoji avatar for AI messages (not for user messages) */}
      {!isUser && <Text style={styles.avatar}>🤖</Text>}

      {/* The actual message bubble */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble, // Conditional background color
        ]}
      >
        {/* Message text content */}
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText, // Conditional text color
          ]}
        >
          {message.text}
        </Text>

        {/* Hallucination warning banner */}
        {!isUser && message.verification && message.verification.confidence < 0.5 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠ Unable to fully verify answer from uploaded documents
            </Text>
          </View>
        )}

        {/* Citation Sources Panel */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationPanel citations={message.citations} onCitationPress={onCitationPress} />
        )}

        {/* Timestamp below the message text */}
        <Text style={styles.timestamp}>{formattedTime}</Text>
      </View>
    </View>
  );
};

/*
 * Styles for the chat message bubble.
 * Organized by: container, bubble, text, avatar.
 */
const styles = StyleSheet.create({
  /* Outer container — full width, provides margin between messages */
  container: {
    marginVertical: SPACING.xs,    // 4px vertical gap between messages
    paddingHorizontal: SPACING.md, // 16px horizontal padding from screen edges
  },

  /* AI messages — aligned to the left */
  aiContainer: {
    flexDirection: 'row',   // Robot emoji + bubble side by side
    alignItems: 'flex-end', // Align avatar to bottom of bubble
    justifyContent: 'flex-start', // Push content to the left
  },

  /* User messages — aligned to the right */
  userContainer: {
    flexDirection: 'row',     // Row layout for consistency
    justifyContent: 'flex-end', // Push content to the right
  },

  /* Robot emoji avatar for AI messages */
  avatar: {
    fontSize: 20,             // Small emoji
    marginRight: SPACING.sm,  // 8px gap between avatar and bubble
    marginBottom: SPACING.xs, // Align with bottom of bubble
  },

  /* Message bubble — the rounded container holding the text */
  bubble: {
    maxWidth: '80%',           // Never wider than 80% of screen — prevents giant bubbles
    padding: SPACING.md,       // 16px internal padding
    borderRadius: RADIUS.lg,   // 16px rounded corners
  },

  /* AI bubble — dark surface background, square top-left corner */
  aiBubble: {
    backgroundColor: COLORS.surface,    // Slightly lighter navy
    borderTopLeftRadius: RADIUS.sm,     // 8px — smaller radius on the "tail" corner
    borderWidth: 1,                      // Subtle border for definition
    borderColor: COLORS.border,          // Dark navy border
  },

  /* User bubble — gold background, square top-right corner */
  userBubble: {
    backgroundColor: COLORS.primary,     // Gold accent color
    borderTopRightRadius: RADIUS.sm,     // 8px — smaller radius on the "tail" corner
  },

  /* Message text — base styles shared by user and AI */
  messageText: {
    fontSize: FONTS.body,        // 16px — readable body text
    lineHeight: 22,              // 22px line height — comfortable reading
  },

  /* AI text color — white on dark surface background */
  aiText: {
    color: COLORS.textPrimary, // White
  },

  /* User text color — dark text on gold background for readability */
  userText: {
    color: '#1A1A2E', // Very dark navy — high contrast against gold
  },

  /* Timestamp text below the message */
  timestamp: {
    fontSize: FONTS.small,        // 12px — very small, unobtrusive
    color: COLORS.textMuted,      // Muted gray
    marginTop: SPACING.xs,       // 4px gap from message text
    alignSelf: 'flex-end',        // Right-aligned within the bubble
  },

  /* Hallucination warning banner container */
  warningBanner: {
    backgroundColor: 'rgba(246, 173, 85, 0.12)', // Subtle transparent warning color
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },

  /* Warning text formatting */
  warningText: {
    color: COLORS.warning,
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
  },
});

/* Export for use in ChatScreen */
export default ChatMessage;
