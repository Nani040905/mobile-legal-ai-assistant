/*
 * useChatStore.ts — Zustand store for managing chat messages.
 *
 * PURPOSE: Centralizes all chat state and actions in a single store.
 * Uses Zustand for state management because:
 * 1. No boilerplate — unlike Redux, no action types, reducers, or dispatchers.
 * 2. Hook-based API — components simply call useChatStore() to access state.
 * 3. Built-in persistence — the persist middleware saves state to AsyncStorage.
 * 4. Tiny bundle — ~1KB vs Redux's ~10KB+.
 *
 * STATE:
 * - messages[] — Array of all chat messages (both user and AI).
 * - isLoading — Whether the AI is currently generating a response.
 *
 * ACTIONS:
 * - addMessage() — Adds a new message to the array.
 * - sendMessage() — Sends a user message and gets an AI response.
 * - clearMessages() — Deletes all messages (used in Settings > Clear).
 *
 * PERSISTENCE:
 * Zustand's persist middleware automatically saves the messages array
 * to AsyncStorage whenever it changes, and rehydrates it on app launch.
 */

/* Import the create function from Zustand — this is how you create a store */
import { create } from 'zustand';

/* Import the persist middleware — enables automatic state persistence */
import { persist, createJSONStorage } from 'zustand/middleware';

/* Import secureStorage — AES encrypted storage adapter */
import { secureStorage } from '../services/secureStorage';

import { generateResponse, isModelReady } from '../services/llmService';
import modelManager from '../services/modelManager';
import { verifyAnswer, VerificationResult } from '../services/answerVerifier';
import { CitationSource } from '../services/retrievalService';

/*
 * Message — TypeScript interface defining the shape of a single chat message.
 *
 * Each message has:
 * - id: Unique identifier (timestamp-based) for React list keys
 * - text: The message content
 * - sender: Either 'user' or 'ai' — determines bubble styling
 * - timestamp: When the message was created (ISO string for serialization)
 * - verification: Optional verification result from hallucination checker
 */
export interface Message {
  id: string;                    // Unique ID — used as key in FlatList
  text: string;                  // The message content
  sender: 'user' | 'ai';        // Union type — only these two values are allowed
  timestamp: string;             // ISO 8601 date string — serializable for persistence
  verification?: VerificationResult; // Hallucination verifier results
  citations?: CitationSource[];  // Grounded citations mapping
}

/*
 * ChatState — TypeScript interface defining the entire store shape.
 *
 * This includes both STATE (data) and ACTIONS (functions that modify data).
 * Zustand stores combine state and actions in a single object — no separate
 * action creators or reducers like Redux.
 */
interface ChatState {
  /* ─── State ─── */
  messages: Message[];           // All chat messages in chronological order
  isLoading: boolean;            // True while the AI is generating a response

  /* ─── Actions ─── */
  addMessage: (text: string, sender: 'user' | 'ai') => void;  // Add a message to the array
  sendMessage: (text: string, sourceChunks?: string[], citations?: CitationSource[]) => Promise<void>; // Send user msg + get AI response
  stopGeneration: () => Promise<void>;                          // Cancel active generation
  clearMessages: () => void;                                    // Delete all messages
}

/*
 * useChatStore — The Zustand store hook.
 *
 * create<ChatState>() creates a hook that components can call to access state.
 * The persist() middleware wraps the store to enable AsyncStorage persistence.
 *
 * Usage in components:
 *   const messages = useChatStore(state => state.messages);
 *   const sendMessage = useChatStore(state => state.sendMessage);
 */
const useChatStore = create<ChatState>()(
  /*
   * persist() — Zustand middleware that automatically saves/loads state.
   *
   * It wraps the store creator function and:
   * 1. On state change → serializes state to JSON → saves to AsyncStorage
   * 2. On app launch → reads from AsyncStorage → deserializes → rehydrates state
   *
   * The second argument configures persistence behavior.
   */
  persist(
    /*
     * Store creator function — receives `set` and `get` from Zustand.
     *
     * `set` — Function to update the store state. Takes a partial state object
     *         or a function that receives current state and returns partial state.
     * `get` — Function to read the current store state (used in async actions).
     */
    (set, get) => ({
      /* ─── Initial State ─── */

      /* Start with an empty messages array — will be populated from AsyncStorage on rehydration */
      messages: [],

      /* Not loading initially — no AI request in progress */
      isLoading: false,

      /* ─── Actions ─── */

      /*
       * addMessage — Creates a new Message object and appends it to the array.
       *
       * @param text — The message content.
       * @param sender — Who sent it: 'user' or 'ai'.
       *
       * Uses set() with a function to access the previous state.
       * The spread operator [...state.messages, newMsg] creates a NEW array
       * (immutability required by React/Zustand for change detection).
       */
      addMessage: (text: string, sender: 'user' | 'ai') => {
        /* Create the message object with a unique ID and current timestamp */
        const message: Message = {
          id: Date.now().toString(),        // Timestamp as string — unique enough for our use case
          text,                             // The message content (shorthand for text: text)
          sender,                           // 'user' or 'ai' (shorthand for sender: sender)
          timestamp: new Date().toISOString(), // ISO string — serializable and sortable
        };

        /*
         * set() updates the store state.
         * We pass a function that receives current state and returns new partial state.
         * The spread [...state.messages, message] appends the new message immutably.
         */
        set(state => ({
          messages: [...state.messages, message], // Append new message to the end
        }));
      },

      /*
       * sendMessage — The main action for sending a chat message.
       *
       * Flow:
       * 1. Add the user's message to the store
       * 2. Set isLoading to true (shows typing indicator in UI)
       * 3. Call the LLM service to generate a response
       * 4. Add the AI's response to the store
       * 5. Set isLoading to false (hides typing indicator)
       *
       * This is async because the LLM call takes time (even the stub has a delay).
       * Error handling wraps the LLM call in try/catch.
       */
      sendMessage: async (text: string, sourceChunks?: string[], citations?: CitationSource[]) => {
        /* Step 1: Add the user's message immediately (instant feedback) */
        get().addMessage(text, 'user'); // get() reads current state to call addMessage

        /* Step 2: Check if the AI model is loaded before attempting inference */
        if (!isModelReady()) {
          /* Model not loaded — inform the user instead of crashing */
          get().addMessage(
            'The AI model is not loaded yet. Please go to Settings and tap "Load Model" first.',
            'ai',
          );
          return; // Early return — no point calling generateResponse without a model
        }

        /* Step 3: Show loading state in the UI */
        set({ isLoading: true });

        /* Generate a unique ID for the streaming AI response bubble */
        const aiMessageId = Date.now().toString() + '_ai';

        try {
          /* Reset cancellation flag in modelManager before starting completion */
          modelManager.resetIsCancelled();

          /* Create and add an initial empty AI response message object to the list */
          const emptyMessage: Message = {
            id: aiMessageId,
            text: '',
            sender: 'ai' as const,
            timestamp: new Date().toISOString(),
          };
          set(state => ({
            messages: [...state.messages, emptyMessage],
          }));

          /* Step 4: Call the LLM service with a streaming token callback */
          const finalAnswer = await generateResponse(text, ({ token }) => {
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId ? { ...msg, text: msg.text + token } : msg
              ),
            }));
          });

          /* Step 5: If sourceChunks are provided, run the hallucination verifier and attach citations */
          if (sourceChunks && sourceChunks.length > 0) {
            const verification = verifyAnswer(finalAnswer, sourceChunks);
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId ? { ...msg, verification, citations } : msg
              ),
            }));
          }
        } catch (error) {
          /* Check if user manually cancelled the completion */
          if (modelManager.getIsCancelled()) {
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, text: msg.text + ' [Generation stopped by user]' }
                  : msg
              ),
            }));
          } else {
            /* If the LLM fails, update the text with an error explanation */
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, text: 'Sorry, I encountered an error processing your request. Please try again.' }
                  : msg
              ),
            }));
          }
        } finally {
          /* Always reset the cancellation flag and hide loading state */
          modelManager.resetIsCancelled();
          set({ isLoading: false });
        }
      },

      /*
       * stopGeneration — Cancels active text generation in the model manager.
       */
      stopGeneration: async () => {
        await modelManager.stopCompletion();
      },

      /*
       * clearMessages — Removes all messages from the store.
       *
       * Used by the Settings screen "Clear All" button.
       * Sets messages to an empty array — the persist middleware
       * will automatically save this to AsyncStorage.
       */
      clearMessages: () => {
        set({ messages: [] }); // Replace messages with empty array
      },
    }),

    /* ─── Persistence Configuration ─── */
    {
      /* name — The AsyncStorage key under which the state is saved */
      name: 'legal-ai-chat-storage',

       /* Use secureStorage as the persistence backend */
      storage: createJSONStorage(() => secureStorage),

      /*
       * partialize — Controls WHICH parts of the state are persisted.
       *
       * We only persist `messages` — not `isLoading`.
       * Persisting `isLoading: true` would be a bug: if the app crashed
       * during loading, it would restart stuck in a loading state forever.
       */
      partialize: (state) => ({
        messages: state.messages, // Only persist messages, not isLoading
      }),
    },
  ),
);

/* Export the hook as default — components import it with: import useChatStore from '...' */
export default useChatStore;
