/*
 * contextBudget.ts — Budget manager for LLM prompt context window.
 *
 * PURPOSE: Prevents out-of-memory crashes by calculating estimated token budgets and
 * packing the most relevant text chunks into the prompt dynamically, rather than
 * relying on arbitrary character limits.
 *
 * DESIGN DECISIONS:
 * - estimateTokens: Qwen/Llama tokenizers average ~4 characters per token. So, length / 4 is a safe approximation.
 * - Greedy packing: Chunks are pre-sorted by relevance. We add them one-by-one from highest score
 *   downwards until the context budget is exhausted.
 */

export interface ScoredChunk {
  chunk: string;
  score?: number;
  index: number;
}

export interface BudgetResult {
  contextText: string;
  usedChunks: ScoredChunk[];
  estimatedTokens: number;
}

/**
 * Approximates the token count of a given string.
 * On average, 1 token is ~4 characters in English.
 */
export const estimateTokens = (text: string): number => {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
};

/**
 * Greedily selects the highest-scoring chunks that fit within the context window budget.
 *
 * @param systemPrompt - The system instructions sent to the LLM.
 * @param chunks - All candidate document chunks (typically pre-scored/sorted).
 * @param question - Optional user query.
 * @param maxContext - Maximum context window size in tokens (default: 1800).
 * @param reserveAnswer - Tokens reserved for the model's generated answer (default: 200).
 */
export const buildBudgetedContext = (
  systemPrompt: string,
  chunks: (string | ScoredChunk)[],
  question: string = '',
  maxContext: number = 1800,
  reserveAnswer: number = 200
): BudgetResult => {
  const systemTokens = estimateTokens(systemPrompt);
  const questionTokens = estimateTokens(question);
  
  // Extra framing tokens for prompt template structure (ChatML tags, instructions)
  const templateOverheadTokens = 50; 
  
  const baselineTokens = systemTokens + questionTokens + templateOverheadTokens;
  const availableBudget = maxContext - reserveAnswer - baselineTokens;
  
  let currentTokens = 0;
  const usedChunks: ScoredChunk[] = [];
  const selectedTextChunks: string[] = [];

  // Convert all chunks to standardized ScoredChunk objects
  const standardizedChunks: ScoredChunk[] = chunks.map((item, idx) => {
    if (typeof item === 'string') {
      return { chunk: item, index: idx };
    }
    return item;
  });

  for (const item of standardizedChunks) {
    // Format chunk just like retrievalService.getRelevantContext does:
    const formattedChunk = `[Chunk ${item.index + 1}]:\n${item.chunk}`;
    const chunkTokens = estimateTokens(formattedChunk);
    
    // Check if adding this chunk exceeds our available budget
    const separatorOverhead = selectedTextChunks.length > 0 ? estimateTokens('\n\n---\n\n') : 0;
    if (currentTokens + chunkTokens + separatorOverhead <= availableBudget) {
      selectedTextChunks.push(formattedChunk);
      usedChunks.push(item);
      currentTokens += chunkTokens + separatorOverhead;
    } else {
      // Budget is exhausted, stop packing further chunks
      break;
    }
  }

  const contextText = selectedTextChunks.join('\n\n---\n\n');
  const totalEstimatedTokens = baselineTokens + currentTokens;

  return {
    contextText,
    usedChunks,
    estimatedTokens: totalEstimatedTokens,
  };
};
