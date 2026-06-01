/*
 * llmService.ts — Interface for the local LLM (Large Language Model).
 *
 * PURPOSE: Provides a clean API for other parts of the app to interact
 * with the AI model. Currently a STUB that returns simulated responses.
 * In Phase 5, this will be replaced with actual llama.cpp integration.
 *
 * DESIGN DECISIONS:
 * - Async interface (returns Promise) — the real llama.cpp calls will be async,
 *   so using async now means no refactoring needed when we swap in the real model.
 * - Simulated delay (1-2 seconds) — gives the UI a realistic feel during development.
 * - The stub responses are legal-themed — helps test the UI with realistic content.
 *
 * FUTURE (Phase 5):
 * - Load Qwen 2.5 3B GGUF model via llama.cpp native module
 * - Stream tokens for real-time response rendering
 * - Manage model lifecycle (load, unload, memory)
 */

/*
 * SIMULATED_RESPONSES — An array of pre-written legal-themed responses.
 * The stub randomly picks one to make testing feel more realistic.
 * These will be removed when the real LLM is integrated.
 */
const SIMULATED_RESPONSES: string[] = [
  /* General legal advice response */
  'Based on the information provided, I can offer the following analysis. In general legal practice, this type of situation would typically fall under contractual obligations. However, I recommend consulting with a qualified attorney for specific legal advice tailored to your circumstances.',

  /* Document analysis response */
  'After reviewing the context, there are several key points to consider. First, the parties involved should ensure compliance with all applicable regulations. Second, any amendments to the original agreement should be documented in writing. Third, timelines specified in the contract should be strictly adhered to.',

  /* Legal procedure response */
  'This is an important legal question. Generally speaking, the applicable statute of limitations, relevant precedents, and jurisdictional requirements would all play a role in determining the appropriate course of action. I suggest gathering all relevant documentation before proceeding.',

  /* Rights and obligations response */
  'From a legal perspective, both parties have rights and obligations under the agreement. It is essential to review the specific clauses related to this matter, including any indemnification provisions, limitation of liability clauses, and dispute resolution mechanisms outlined in the contract.',

  /* Due diligence response */
  'That is a common concern in legal practice. The standard approach involves conducting thorough due diligence, reviewing all pertinent documents, and ensuring that all parties are in agreement regarding the terms and conditions. Would you like me to elaborate on any specific aspect?',
];

/*
 * generateResponse — The main function other parts of the app call to get AI responses.
 *
 * @param prompt — The user's question or the text to process.
 * @returns A Promise that resolves to the AI's response string.
 *
 * Currently this is a stub that:
 * 1. Waits 1-2 seconds (simulates model inference time)
 * 2. Returns a random pre-written response
 *
 * When llama.cpp is integrated, this function will:
 * 1. Send the prompt to the native llama.cpp module
 * 2. Receive streamed tokens
 * 3. Return the complete response
 */
export const generateResponse = async (prompt: string): Promise<string> => {
  /* Simulate inference delay — random between 1000ms and 2000ms */
  // Math.random() returns 0-1, so this gives us 1000-2000ms
  const delay = 1000 + Math.random() * 1000;

  /*
   * Create a Promise that resolves after the delay.
   * This simulates the time the real model would take to generate a response.
   * We use `new Promise` with `setTimeout` because there's no built-in sleep in JS.
   */
  await new Promise(resolve => setTimeout(resolve, delay));

  /*
   * Pick a random response from our array.
   * Math.random() * length gives a float between 0 and array length.
   * Math.floor() rounds down to get a valid integer index.
   */
  const randomIndex = Math.floor(Math.random() * SIMULATED_RESPONSES.length);

  /* Return the randomly selected response */
  return SIMULATED_RESPONSES[randomIndex];
};

/*
 * generateSummary — Generates a summary of a document's text.
 *
 * @param documentText — The extracted text content of a PDF.
 * @returns A Promise that resolves to a summary string.
 *
 * STUB — Returns a placeholder summary.
 * Phase 6 will implement actual summarization using chunk-based approach.
 */
export const generateSummary = async (documentText: string): Promise<string> => {
  /* Simulate processing time */
  await new Promise(resolve => setTimeout(resolve, 1500));

  /* Return a placeholder summary mentioning the document's length */
  return `Document Summary (${documentText.length} characters analyzed):\n\nThis document appears to contain legal provisions and clauses. Key topics identified include contractual obligations, party responsibilities, and compliance requirements.\n\nNote: This is a simulated summary. Full AI summarization will be available when the Qwen 2.5 3B model is integrated.`;
};

/*
 * answerQuestion — Answers a question about a specific document.
 *
 * @param question — The user's question about the document.
 * @param documentText — The document's text content for context.
 * @returns A Promise that resolves to an answer string.
 *
 * STUB — Returns a placeholder answer.
 * Phase 6 will implement chunk-based Q&A with relevant chunk selection.
 */
export const answerQuestion = async (
  question: string,           // The question the user is asking
  documentText: string,       // The document context to answer from
): Promise<string> => {
  /* Simulate processing time */
  await new Promise(resolve => setTimeout(resolve, 1500));

  /* Return a placeholder answer that references the question */
  return `Regarding your question: "${question}"\n\nBased on the document content (${documentText.length} characters), here is my analysis:\n\nThe document contains relevant information that addresses this query. For a complete and accurate answer, the full AI model integration (Phase 5) is required.\n\nNote: This is a simulated response.`;
};
