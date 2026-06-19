/*
 * ChatInput.tsx — The text input bar at the bottom of the chat screen.
 *
 * PURPOSE: Provides a text input field and send button for the user
 * to type and submit messages to the AI. Positioned at the bottom
 * of the screen with a fixed layout (doesn't scroll with messages).
 *
 * DESIGN DECISIONS:
 * - TextInput with multiline support — users can write longer questions.
 * - Send button disables when input is empty or AI is loading — prevents spam.
 * - Uses local state for the input value — no need to put this in Zustand.
 * - onSubmitEditing handles keyboard "send" action on Android.
 * - The input clears after sending — ready for the next message.
 *
 * PROPS:
 * - onSend: (text: string) => void — Callback when user sends a message.
 * - isLoading: boolean — Whether the AI is generating a response.
 */

/* Import React and useState hook for managing the input text locally */
import React, { useState } from 'react';

/* Import RN components */
import {
  View, // Layout container
  TextInput, // Text input field — the only way to get text input in RN
  TouchableOpacity, // Touchable send button with opacity feedback
  StyleSheet, // Optimized styles
  Text, // For the send button icon/text
  ActivityIndicator // Spinning loader shown while AI is processing
} from 'react-native';

/* Import theme tokens */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/*
 * Props interface — defines the component's API.
 */






/*
 * ChatInput — The bottom input bar component.
 *
 * Contains a TextInput for typing and a circular send button.
 * The send button shows a loading spinner when the AI is processing,
 * or a stop button when generating.
 */
const ChatInput = ({ onSend, isLoading, onStop }) => {
  /*
   * useState('') — Local state for the text input value.
   *
   * We use local state (not Zustand) because:
   * 1. The draft text doesn't need to persist — it's transient.
   * 2. It doesn't need to be shared with other components.
   * 3. Local state updates are the fastest (no middleware/persistence overhead).
   */
  const [text, setText] = useState(''); // Empty string initially

  /*
   * handleSend — Called when the user taps the send button or presses enter.
   *
   * Flow:
   * 1. Trim whitespace from the input (prevents sending "   " as a message).
   * 2. If empty after trimming, do nothing (early return).
   * 3. Call the onSend callback with the trimmed text.
   * 4. Clear the input field for the next message.
   */
  const handleSend = () => {
    /* Remove leading/trailing whitespace */
    const trimmedText = text.trim();

    /* Don't send empty messages */
    if (!trimmedText) {
      return; // Early return — nothing to send
    }

    /* Call the parent's onSend callback with the cleaned text */
    onSend(trimmedText);

    /* Clear the input field — ready for the next message */
    setText('');
  };

  /*
   * Determine if the send button should be disabled.
   * Disabled when: input is empty AND AI is not currently loading.
   * If AI is loading, the button is used as a Stop button, so it remains active.
   */
  const isDisabled = !text.trim() && !isLoading;

  /*
   * handlePress — Handles either sending the message or stopping the generation.
   */
  const handlePress = () => {
    if (isLoading) {
      if (onStop) {
        onStop();
      }
    } else {
      handleSend();
    }
  };

  return (
    /* Container — horizontal row with input field and send button */
    <View style={styles.container}>
      {/*
        * TextInput — The text input field.
        *
        * Key props:
        * - value + onChangeText — Controlled component pattern (React manages the value)
        * - placeholder — Gray hint text shown when empty
        * - placeholderTextColor — Color of the hint text
        * - multiline — Allows the input to grow vertically for longer text
        * - maxLength — Prevents extremely long messages
        * - editable={!isLoading} — Disables typing while AI is processing
        * - returnKeyType="send" — Shows "Send" on the keyboard's return key (Android)
        * - onSubmitEditing — Fires when user taps the keyboard's send/return key
        * - blurOnSubmit={false} — Keeps the keyboard open after sending (don't dismiss)
        */}
      <TextInput
        style={styles.input}
        value={text} // Controlled value from local state
        onChangeText={setText} // Update state on every keystroke
        placeholder="Ask a legal question..." // Hint text when empty
        placeholderTextColor={COLORS.textMuted} // Subtle gray for the hint
        multiline={true} // Allow multiple lines of text
        maxLength={2000} // Limit message length
        editable={!isLoading} // Disable input while AI is working
        returnKeyType="send" // Show "Send" button on keyboard
        onSubmitEditing={handlePress} // Trigger handlePress (handles send or stop)
        blurOnSubmit={false} // Keep keyboard open after sending
      />

      {/*
        * Send button — Circular button.
        * Shows a red Stop button (■) if loading and onStop is provided.
        * Shows an ActivityIndicator (spinner) when loading without stop option,
        * or a gold send button (↑) when ready to send.
        */}
      <TouchableOpacity
        style={[
        styles.sendButton,
        isLoading && onStop ? styles.stopButton : isDisabled && styles.sendButtonDisabled]
        }
        onPress={handlePress} // Fire action on tap
        disabled={isLoading ? !onStop : isDisabled} // Only disable if loading and no stop callback
        activeOpacity={0.7} // Slight dim on press
      >
        {isLoading && onStop ? (
        /* Show white stop square when generation is running */
        <Text style={styles.stopIcon}>■</Text>) :
        isLoading ? (
        /* Show a spinning loader while AI is processing */
        <ActivityIndicator
          size="small" // Small spinner fits inside the button
          color={COLORS.background} // Dark color on gold background
        />) : (

        /* Show an up-arrow icon when ready to send */
        <Text style={styles.sendIcon}>↑</Text>)
        }
      </TouchableOpacity>
    </View>);

};

/*
 * Styles for the input bar.
 * The container sits at the bottom of the screen with a top border.
 */
const styles = StyleSheet.create({
  /* Main container — horizontal row with top border */
  container: {
    flexDirection: 'row', // Input and button side by side
    alignItems: 'flex-end', // Align to bottom (important for multiline input)
    padding: SPACING.md, // 16px padding all around
    backgroundColor: COLORS.surface, // Slightly lighter than screen background
    borderTopWidth: 1, // Thin line separating input from chat messages
    borderTopColor: COLORS.border // Subtle dark border
  },

  /* Text input field — takes most of the horizontal space */
  input: {
    flex: 1, // Take all space except the send button
    backgroundColor: COLORS.surfaceVariant, // Darker input field background
    borderRadius: RADIUS.xl, // 24px — pill-shaped input field
    paddingHorizontal: SPACING.md, // 16px left/right padding inside the input
    paddingVertical: SPACING.sm, // 8px top/bottom padding
    fontSize: FONTS.body, // 16px body text
    color: COLORS.textPrimary, // White text
    maxHeight: 100, // Limit height for multiline (about 4 lines)
    marginRight: SPACING.sm // 8px gap before the send button
  },

  /* Send button — circular gold button */
  sendButton: {
    width: 44, // Fixed width for perfect circle
    height: 44, // Fixed height matching width
    borderRadius: RADIUS.full, // Fully circular (999px)
    backgroundColor: COLORS.primary, // Gold accent color
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center' // Center the icon horizontally
  },

  /* Disabled state for the send button */
  sendButtonDisabled: {
    opacity: 0.4 // 40% opacity — clearly indicates it's not tappable
  },

  /* Send arrow icon */
  sendIcon: {
    fontSize: 20, // Medium size
    color: COLORS.background, // Dark color on gold background
    fontWeight: FONTS.weightBold // Bold for visibility
  },
  /* Stop button styling — red background for cancel action */
  stopButton: {
    backgroundColor: '#ff4d4f' // Red/Coral accent
  },
  /* Stop square icon styling */
  stopIcon: {
    fontSize: 16,
    color: '#ffffff', // White square
    fontWeight: FONTS.weightBold
  }
});

/* Export for use in ChatScreen */
export default ChatInput;