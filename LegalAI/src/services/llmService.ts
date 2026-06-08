/*
 * llmService.ts — Service for interacting with the local LLM.
 *
 * PURPOSE: Provides a clean API for the rest of the app to generate AI responses,
 * document summaries, and question answers using the on-device Qwen 2.5 3B model
 * running via llama.rn (React Native bindings for llama.cpp).
 *
 * DESIGN DECISIONS:
 * - All functions check modelManager.getStatus() before attempting inference.
 *   If the model is not loaded, they throw a clear error message.
 * - Prompt templates use the Qwen 2.5 ChatML format (<|im_start|>/<|im_end|>).
 * - n_predict is set conservatively (256-512 tokens) to keep response times
 *   reasonable on mobile hardware (~10-60 seconds per response on CPU).
 * - Stop tokens include both the ChatML end token and common EOS markers
 *   to prevent the model from running past its intended response.
 * - Streaming callbacks are supported for real-time token display in the UI.
 *
 * ARCHITECTURE:
 * This service sits between the UI screens and the modelManager:
 *
 *   Screen → llmService.generateResponse() → modelManager.getContext()
 *         → context.completion() → streamed tokens → final response
 */

/* Import the model manager singleton to access the loaded LLM context */
import modelManager from './modelManager';
import { buildBudgetedContext } from './contextBudget';
import { splitIntoChunks } from './pdfService';

/*
 * STOP_WORDS — Tokens that signal the model to stop generating.
 *
 * These are the special tokens that Qwen 2.5 uses to mark the end of a response.
 * Without these, the model might continue generating indefinitely or start
 * hallucinating new conversation turns.
 *
 * <|im_end|> — ChatML format end-of-message marker (primary)
 * <|endoftext|> — General end-of-text marker (fallback)
 * </s> — Legacy sentence-end marker (some GGUF quantizations use this)
 */
const STOP_WORDS: string[] = [
  '<|im_end|>',     // ChatML end-of-message — the primary stop token for Qwen 2.5
  '<|endoftext|>',  // End-of-text — fallback for different quantization variants
  '</s>',           // Legacy EOS — some older GGUF files use this
];

/*
 * StreamCallback — Type for the streaming token callback function.
 *
 * @param data — Object containing the partial token text.
 *
 * When set, the completion function calls this callback for EACH token
 * as it's generated, enabling real-time "typing" animation in the UI.
 * If null/undefined, tokens are collected silently and returned as a batch.
 */
type StreamCallback = (data: { token: string }) => void;

/*
 * isModelReady — Quick check if the model is loaded and ready for inference.
 *
 * @returns true if the model is loaded and ready, false otherwise.
 *
 * UI components call this to decide whether to enable/disable buttons
 * (e.g., graying out "Send" button if the model isn't loaded).
 */
export const isModelReady = (): boolean => {
  /* Compare the current model status string against 'ready' */
  return modelManager.getStatus() === 'ready';
};

/*
 * getModelStatus — Returns the current model lifecycle status string.
 *
 * @returns The ModelStatus string (not_downloaded, idle, loading, ready, error).
 *
 * Used by the SettingsScreen to show the model status badge.
 */
export const getModelStatus = (): string => {
  /* Delegate to the model manager singleton */
  return modelManager.getStatus();
};

/*
 * generateResponse — Generates a free-form AI response to a user prompt.
 *
 * @param prompt — The user's message or question.
 * @param onToken — Optional streaming callback for real-time token display.
 * @returns A Promise resolving to the complete response text.
 *
 * This is the main function used by the Chat screen for general conversation.
 * It wraps the prompt in Qwen 2.5's ChatML format with a legal assistant
 * system prompt to keep responses focused and professional.
 *
 * Inference settings:
 * - n_predict: 512 — max tokens to generate (keeps response time under 60s)
 * - temperature: 0.7 — moderate creativity (not too random, not too rigid)
 * - top_p: 0.9 — nucleus sampling (considers top 90% probability mass)
 * - top_k: 40 — limits token selection to top 40 candidates
 */
export const generateResponse = async (
  prompt: string,                  // The user's message text
  onToken?: StreamCallback,        // Optional: called for each generated token
): Promise<string> => {
  /* Get the active llama.rn context from the model manager */
  const context = modelManager.getContext();

  /* If no context, the model is not loaded — throw a clear error */
  if (!context) {
    throw new Error(
      'AI model is not loaded. Go to Settings → Load Model first.'
    );
  }

  try {
    modelManager.setGenerating(true);
    /*
     * context.completion() — The core inference function from llama.rn.
     *
     * First argument: configuration object with the prompt and parameters.
     *   - messages: Array of ChatML-format messages (system + user)
     *   - n_predict: Maximum number of tokens to generate
     *   - stop: Array of stop tokens — model stops when any of these appear
     *   - temperature: Controls randomness (0 = deterministic, 1 = very random)
     *   - top_p: Nucleus sampling — only consider tokens in top P probability
     *   - top_k: Only consider the K most probable next tokens
     *
     * Second argument: streaming callback (optional).
     *   - Called for each token as it's generated
     *   - Enables real-time "typing" animation in the UI
     */
    const result = await context.completion(
      {
        messages: [
          {
            role: 'system',  // System prompt sets the AI's behavior
            content: 'You are a helpful legal AI assistant specialized in Indian Law, running offline on a mobile device. Provide clear, concise, and professional responses to legal questions based specifically on the Indian legal framework, including the Constitution of India, Bharatiya Nyaya Sanhita (BNS) / Indian Penal Code (IPC), Code of Criminal Procedure (CrPC) / Bharatiya Nagarik Suraksha Sanhita (BNSS), Indian Evidence Act (IEA) / Bharatiya Sakshya Adhiniyam (BSA), Code of Civil Procedure (CPC), and other Indian acts. Ground all answers and citations in the Indian legal context. Always note that your responses are for informational purposes only and do not constitute legal advice.',
          },
          {
            role: 'user',    // The actual user message
            content: prompt,
          },
        ],
        n_predict: 1024,      // Maximum tokens to generate (keeps response time ~30-60s)
        stop: STOP_WORDS,    // Stop generating when any of these tokens appear
        temperature: 0.7,    // Moderate creativity — balanced for legal content
        top_p: 0.9,          // Nucleus sampling — consider top 90% probability mass
        top_k: 40,           // Only consider top 40 most probable next tokens
      },
      onToken,               // Pass through the streaming callback
    );

    /* Return the complete generated text */
    return result.text.trim();
  } catch (error) {
    /* Log the error for debugging */
    console.error('[LlmService] generateResponse error:', error);
    /* Attempt auto-recovery of model engine context */
    await modelManager.handleCrash(error);
    /* Re-throw with a user-friendly message */
    throw new Error(`AI generation failed: ${(error as any)?.message || 'Unknown error'}`);
  } finally {
    modelManager.setGenerating(false);
  }
};

/*
 * generateSummary — Generates a summary of document text using the LLM.
 *
 * @param documentText — The full extracted text from a PDF document.
 * @param onToken — Optional streaming callback for real-time token display.
 * @returns A Promise resolving to the summary text.
 *
 * For short documents (under 3000 characters), the entire text is sent as context.
 * For longer documents, only the first 3000 characters are used to fit within
 * the 2048-token context window (~8K characters). Phase 6 will implement
 * map-reduce summarization for full-length documents.
 *
 * The prompt instructs the model to produce a structured summary with:
 * - Document type identification
 * - Key parties involved
 * - Main terms and conditions
 * - Important dates and deadlines
 * - Notable clauses or provisions
 */
export const generateSummary = async (
  documentText: string,            // The extracted PDF text
  onToken?: StreamCallback,        // Optional streaming callback
): Promise<string> => {
  /* Get the active llama.rn context */
  const context = modelManager.getContext();

  /* If no context, model is not loaded */
  if (!context) {
    throw new Error(
      'AI model is not loaded. Go to Settings → Load Model first.'
    );
  }

  /*
   * Segment the document text into smaller, token-friendly chunks of 1000 characters.
   * This prevents large paragraphs/documents from blowing the context budget and being ignored.
   */
  const chunks = splitIntoChunks(documentText, 1000);
  const systemPrompt = 'You are a legal document analyst specialized in Indian Law. Provide a clear, detailed, and structured plain-text summary of the following legal document. Do not use markdown formatting. Include details on: document type, key parties, main terms, important dates, and notable clauses.';

  const budgetResult = buildBudgetedContext(
    systemPrompt,
    chunks,
    '',
    1800,
    768
  );

  try {
    modelManager.setGenerating(true);
    /* Run the summarization prompt through the model */
    const result = await context.completion(
      {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please summarize the following legal document:\n\n${budgetResult.contextText}`,
          },
        ],
        n_predict: 2048,      // Increased prediction budget for detailed summaries
        stop: STOP_WORDS,
        temperature: 0.3,    // Low temperature — summaries should be factual, not creative
        top_p: 0.9,
        top_k: 40,
      },
      onToken,
    );

    /* Return the generated summary text */
    return result.text.trim();
  } catch (error) {
    console.error('[LlmService] generateSummary error:', error);
    await modelManager.handleCrash(error);
    throw new Error(`Summary generation failed: ${(error as any)?.message || 'Unknown error'}`);
  } finally {
    modelManager.setGenerating(false);
  }
};

/*
 * answerQuestion — Answers a question about a document using provided context chunks.
 *
 * @param question — The user's question about the document.
 * @param contextText — The relevant text context (chunks) to answer from.
 * @param onToken — Optional streaming callback for real-time token display.
 * @returns A Promise resolving to the answer text.
 *
 * This function receives PRE-SELECTED relevant chunks from the retrieval layer
 * (retrievalService.ts). It does NOT do its own chunk selection — that's handled
 * by the caller (DocumentDetailsScreen or a higher-level orchestrator).
 *
 * The prompt instructs the model to:
 * - Answer ONLY based on the provided context
 * - Say "not found in the document" if the context doesn't contain the answer
 * - Cite specific parts of the context when possible
 */
export const answerQuestion = async (
  question: string,                // The user's question
  contextText: string,             // The relevant document chunks (pre-selected)
  onToken?: StreamCallback,        // Optional streaming callback
): Promise<string> => {
  /* Get the active llama.rn context */
  const context = modelManager.getContext();

  /* If no context, model is not loaded */
  if (!context) {
    throw new Error(
      'AI model is not loaded. Go to Settings → Load Model first.'
    );
  }

  /*
   * Use context budget manager to select as many chunks as possible
   * while reserving 512 tokens for the output answer.
   */
  const contextChunks = contextText.split('\n\n---\n\n').filter(c => c.trim().length > 0);
  const systemPrompt = 'You are a legal document assistant specialized in Indian Law. Answer the question based ONLY on the provided document context, interpreting it under Indian legal standards. If the answer is not found in the context, say so clearly. Be specific and cite relevant parts of the document.';

  const budgetResult = buildBudgetedContext(
    systemPrompt,
    contextChunks,
    question,
    1800,
    512
  );

  try {
    modelManager.setGenerating(true);
    /* Run the Q&A prompt through the model */
    const result = await context.completion(
      {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Document context:\n${budgetResult.contextText}\n\nQuestion: ${question}`,
          },
        ],
        n_predict: 1024,      // Answers can be longer than summaries
        stop: STOP_WORDS,
        temperature: 0.3,    // Low temperature for factual accuracy
        top_p: 0.9,
        top_k: 40,
      },
      onToken,
    );

    /* Return the generated answer text */
    return result.text.trim();
  } catch (error) {
    console.error('[LlmService] answerQuestion error:', error);
    await modelManager.handleCrash(error);
    throw new Error(`Question answering failed: ${(error as any)?.message || 'Unknown error'}`);
  } finally {
    modelManager.setGenerating(false);
  }
};
