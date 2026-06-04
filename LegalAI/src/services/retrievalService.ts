/*
 * retrievalService.ts — Lightweight BM25-based text retrieval engine.
 *
 * PURPOSE: Finds the most relevant text chunks from a document for a given query.
 * This is the "Retrieval" step in our RAG (Retrieval-Augmented Generation) pipeline:
 *
 *   PDF → Extraction → Chunking → **Retrieval** → LLM → Answer
 *
 * DESIGN DECISIONS:
 * - Pure TypeScript — zero external dependencies. Runs instantly on any device.
 * - BM25 algorithm — the industry-standard keyword-based ranking algorithm.
 *   More effective than simple keyword counting because it accounts for:
 *   1. Term frequency saturation (diminishing returns for repeated terms)
 *   2. Document length normalization (short chunks aren't unfairly penalized)
 *   3. Inverse document frequency (rare terms are more important than common ones)
 * - No embedding model needed — saves ~500 MB RAM vs vector-based retrieval.
 * - Deterministic results — same query always returns same chunks (explainable).
 * - Optimized for legal text — stop words list includes common legal filler words.
 *
 * WHY BM25 INSTEAD OF VECTOR EMBEDDINGS?
 * 1. Zero additional memory — no embedding model to load (saves ~500 MB RAM)
 * 2. Instant scoring — no neural network forward pass needed
 * 3. Legal text relies on exact terminology ("indemnification", "force majeure")
 *    where keyword matching outperforms semantic similarity
 * 4. For a 3B model with 2048 context window, we only need 2-3 relevant chunks
 *
 * BM25 FORMULA:
 *   score(D, Q) = Σ IDF(qi) * [f(qi, D) * (k1 + 1)] / [f(qi, D) + k1 * (1 - b + b * |D|/avgdl)]
 *
 * Where:
 *   qi = query term i
 *   f(qi, D) = frequency of qi in document D
 *   |D| = length of document D (in tokens)
 *   avgdl = average document length across all chunks
 *   k1 = term frequency saturation parameter (1.5)
 *   b = document length normalization parameter (0.75)
 *   IDF(qi) = inverse document frequency of qi
 */

/*
 * BM25 Tuning Parameters.
 *
 * These values are the standard defaults used in most information retrieval
 * systems (e.g., Elasticsearch, Lucene). They work well for legal documents.
 */

/*
 * K1 — Term frequency saturation constant.
 *
 * Controls how much a term's frequency in a document contributes to its score.
 * Higher values = higher sensitivity to repeated terms.
 * 1.5 is the standard default — a good balance for most text types.
 * Lower (0.5-1.0) would reduce the importance of term repetition.
 */
const K1 = 1.5;

/*
 * B — Document length normalization constant.
 *
 * Controls how much document length affects the score.
 * 0 = no length normalization (long and short docs treated equally)
 * 1 = full normalization (long docs are penalized more heavily)
 * 0.75 is the standard default — some normalization but not too aggressive.
 */
const B = 0.75;

/*
 * STOP_WORDS — Common English words that add noise to keyword matching.
 *
 * These words appear in almost every document and carry little meaning
 * for retrieval purposes. Removing them improves relevance by focusing
 * on content-bearing terms like "indemnification" or "termination".
 *
 * This list is kept small intentionally — aggressive stop word removal
 * can hurt retrieval for queries like "what is the term" where "term"
 * has legal meaning but "the" and "is" don't.
 */
const STOP_WORDS = new Set([
  /* Articles */
  'a', 'an', 'the',
  /* Prepositions */
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
  /* Conjunctions */
  'and', 'or', 'but', 'nor', 'so', 'yet',
  /* Pronouns */
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'his', 'her', 'its', 'their', 'this', 'that', 'these', 'those',
  /* Common verbs */
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could',
  /* Other common words */
  'not', 'no', 'if', 'then', 'else', 'when', 'where', 'how', 'what', 'which', 'who',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'than', 'too', 'very',
]);

/*
 * tokenize — Splits text into an array of normalized, meaningful tokens.
 *
 * @param text — The raw text string to tokenize.
 * @returns An array of lowercase, cleaned tokens with stop words removed.
 *
 * Processing steps:
 * 1. Convert to lowercase (case-insensitive matching)
 * 2. Remove all punctuation and special characters
 * 3. Split on whitespace into individual words
 * 4. Filter out empty strings and stop words
 * 5. Filter out very short tokens (1-2 characters) — usually not meaningful
 *
 * Note: This is a simple whitespace tokenizer. A more sophisticated version
 * could use stemming (e.g., "terminating" → "terminat") or lemmatization
 * (e.g., "agreements" → "agreement"), but for legal text with precise
 * terminology, exact matching works well enough.
 */
export const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()                           // Step 1: case-insensitive
    .replace(/[^\w\s]/g, ' ')                // Step 2: replace punctuation with spaces
    .split(/\s+/)                            // Step 3: split on whitespace
    .filter(token =>                         // Step 4 & 5: remove empties, stop words, short tokens
      token.length > 2 &&                    // Skip tokens shorter than 3 characters
      !STOP_WORDS.has(token)                 // Skip common stop words
    );
};

/*
 * ScoredChunk — Represents a chunk with its BM25 relevance score.
 *
 * Used as the return type for the search() function so callers can
 * see both the chunk text and how relevant it was scored.
 */
interface ScoredChunk {
  chunk: string;   // The original chunk text
  score: number;   // The BM25 relevance score (higher = more relevant)
  index: number;   // The index of this chunk in the original chunks array
}

/*
 * search — Finds the most relevant chunks for a query using BM25 scoring.
 *
 * @param query — The user's question or search terms.
 * @param chunks — The array of text chunks from the document.
 * @param topK — How many top-scoring chunks to return (default: 3).
 * @returns An array of ScoredChunk objects, sorted by relevance (highest first).
 *
 * This is the main function called by llmService.answerFromChunks().
 *
 * BM25 Algorithm Steps:
 * 1. Tokenize all chunks and the query
 * 2. Compute average document length across all chunks
 * 3. Compute IDF (Inverse Document Frequency) for each query term
 * 4. For each chunk, compute BM25 score by summing term-level scores
 * 5. Sort chunks by score (descending) and return top K
 *
 * Time complexity: O(n * m) where n = number of chunks, m = query terms
 * For typical legal documents (50-200 chunks, 5-10 query terms), this
 * runs in under 1 millisecond — essentially instant.
 */
export const search = (
  query: string,                   // The user's question
  chunks: string[],                // All document chunks
  topK: number = 3,                // Number of results to return
): ScoredChunk[] => {
  /* Edge case: no chunks to search — return empty results */
  if (chunks.length === 0) {
    return [];
  }

  /* Step 1: Tokenize the query into search terms */
  const queryTokens = tokenize(query);

  /* Edge case: query is all stop words or empty — return empty results */
  if (queryTokens.length === 0) {
    return [];
  }

  /* Step 1b: Tokenize all chunks (pre-compute for reuse in scoring) */
  const tokenizedChunks = chunks.map(chunk => tokenize(chunk));

  /*
   * Step 2: Compute average document length.
   *
   * This is used in the BM25 formula to normalize scores by document length.
   * Shorter chunks get a slight boost because they're more focused.
   * Longer chunks get a slight penalty because relevant terms may be diluted.
   */
  const avgDocLength = tokenizedChunks.reduce(
    (sum, tokens) => sum + tokens.length,  // Sum up all token counts
    0,                                      // Start from 0
  ) / tokenizedChunks.length;              // Divide by number of chunks

  /*
   * Step 3: Compute IDF (Inverse Document Frequency) for each query term.
   *
   * IDF measures how "rare" a term is across all chunks.
   * Common terms (appearing in many chunks) get LOW IDF scores.
   * Rare terms (appearing in few chunks) get HIGH IDF scores.
   *
   * Formula: IDF(qi) = ln((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
   * Where: N = total chunks, n(qi) = chunks containing qi
   *
   * The +0.5 and +1 prevent division by zero and negative values.
   */
  const N = tokenizedChunks.length; // Total number of chunks (documents)
  const idfMap = new Map<string, number>(); // Cache IDF values per term

  /* Compute IDF for each unique query term */
  for (const term of queryTokens) {
    /* Skip if already computed (query might have duplicate terms) */
    if (idfMap.has(term)) {
      continue;
    }

    /*
     * Count how many chunks contain this term.
     * We check if the tokenized chunk array includes the term.
     */
    const docsWithTerm = tokenizedChunks.filter(
      tokens => tokens.includes(term)  // Does this chunk contain the query term?
    ).length;

    /*
     * Compute IDF using the standard BM25 formula.
     * Math.log is the natural logarithm (ln).
     * The formula ensures that:
     * - Terms in ALL chunks get IDF ≈ 0 (not useful for ranking)
     * - Terms in NO chunks get IDF ≈ ln(N) (maximum importance)
     * - Terms in SOME chunks get intermediate values
     */
    const idf = Math.log(
      (N - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1
    );

    /* Store the computed IDF value */
    idfMap.set(term, idf);
  }

  /*
   * Step 4: Score each chunk using the full BM25 formula.
   *
   * For each chunk, we sum the BM25 contribution of each query term.
   * A term's contribution depends on:
   * - Its IDF (rare terms contribute more)
   * - Its frequency in the chunk (more occurrences = higher score, with saturation)
   * - The chunk's length relative to the average (shorter = slight boost)
   */
  const scoredChunks: ScoredChunk[] = tokenizedChunks.map(
    (tokens, index) => {
      let score = 0; // Initialize chunk score to 0

      /* For each query term, compute its BM25 contribution to this chunk's score */
      for (const term of queryTokens) {
        /* Get the pre-computed IDF value for this term */
        const idf = idfMap.get(term) || 0;

        /*
         * Compute term frequency (f) — how many times the query term
         * appears in this chunk's tokenized text.
         * Array.filter().length is used to count occurrences.
         */
        const termFrequency = tokens.filter(t => t === term).length;

        /* If the term doesn't appear in this chunk, skip it (no contribution) */
        if (termFrequency === 0) {
          continue;
        }

        /*
         * Compute the BM25 score for this term in this chunk.
         *
         * Formula: IDF(qi) * [f(qi, D) * (k1 + 1)] / [f(qi, D) + k1 * (1 - b + b * |D|/avgdl)]
         *
         * Numerator: f * (k1 + 1) — scales with term frequency
         * Denominator: f + k1 * (1 - b + b * docLength / avgDocLength) — saturation factor
         *
         * When f is high, the numerator grows but the denominator grows too,
         * creating a saturation effect (diminishing returns for repeated terms).
         *
         * When docLength > avgDocLength, the denominator increases,
         * reducing the score (length normalization penalty).
         */
        const numerator = termFrequency * (K1 + 1);
        const denominator = termFrequency + K1 * (
          1 - B + B * (tokens.length / avgDocLength)
        );

        /* Add this term's BM25 contribution to the chunk's total score */
        score += idf * (numerator / denominator);
      }

      /* Return the scored chunk with its original text and index */
      return {
        chunk: chunks[index],  // Original chunk text (not tokenized)
        score,                 // Computed BM25 relevance score
        index,                 // Position in the original chunks array
      };
    }
  );

  /*
   * Step 5: Sort by score (descending) and return top K results.
   *
   * sort() with (a, b) => b.score - a.score puts highest scores first.
   * slice(0, topK) returns only the first topK results.
   *
   * We also filter out chunks with score === 0, as they have
   * no matching terms and would add noise to the LLM context.
   */
  return scoredChunks
    .filter(sc => sc.score > 0)       // Remove chunks with no matching terms
    .sort((a, b) => b.score - a.score) // Sort by score, highest first
    .slice(0, topK);                   // Take only the top K results
};

/*
 * getRelevantContext — Convenience function that returns chunks as a single text block.
 *
 * @param query — The user's question.
 * @param chunks — The document's text chunks.
 * @param topK — Number of top chunks to include (default: 3).
 * @returns A single string with the relevant chunks joined by separators.
 *
 * This is the function called by DocumentDetailsScreen's handleAskQuestion.
 * It combines search (BM25 retrieval) with formatting (joining chunks)
 * into a single call that returns ready-to-use LLM context.
 *
 * Each chunk is prefixed with a label like "[Chunk 5]:" so the LLM
 * can reference specific parts in its answer.
 */
export const getRelevantContext = (
  query: string,                   // The user's question
  chunks: string[],                // All document chunks
  topK: number = 3,                // Number of chunks to retrieve
): string => {
  /* Run BM25 search to find the most relevant chunks */
  const results = search(query, chunks, topK);

  /* If no relevant chunks found, return an informative message */
  if (results.length === 0) {
    return 'No relevant information found in the document for this query.';
  }

  /*
   * Join the retrieved chunks with labels and separators.
   * Each chunk is prefixed with its original position in the document
   * so the LLM can say things like "According to section 5 (Chunk 5)..."
   */
  return results
    .map(r => `[Chunk ${r.index + 1}]:\n${r.chunk}`) // Label each chunk
    .join('\n\n---\n\n');                               // Separate with horizontal rules
};
