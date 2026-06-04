# Document Processing Strategy

## Problem

Large legal documents can exceed the model context window.

Examples:

- 50 page agreement
- 100 page case file
- 200 page legal notice collection

Sending the entire document to the model is not practical. Qwen 2.5 3B has a 2048-token context window configured (n_ctx), which is approximately 8,000 characters.

---

## Solution: Chunk-Based Processing

### Upload Pipeline

```
User selects PDF
    ↓
Document picker (SAF-compatible, keepLocalCopy)
    ↓
PdfExtractor native module (PDFBox)
    ↓
Raw text extraction
    ↓
Text cleaning (strip PDF artifacts) — Phase 8 planned
    ↓
pdfService.splitIntoChunks() (1000 chars per chunk)
    ↓
Store chunks in Zustand + AsyncStorage
```

### Chunking Strategy

- **Chunk size**: 1000 characters (~200–250 tokens)
- **Break points** (priority order):
  1. Paragraph break (`\n\n`)
  2. Line break (`\n`)
  3. Sentence end (`. `)
  4. Hard character limit (fallback)
- Prevents cutting words or sentences in half

---

## Summarization

### Current Implementation

```
Document text
    ↓
Truncate to 3,000 characters (first ~750 tokens)
    ↓
LLM generates summary (n_predict: 256 tokens)
    ↓
Display summary
```

### Known Issues

- Only 10–15 lines of summary generated (token limit too low)
- Raw markdown/PDF formatting artifacts in output
- Large documents lose content beyond 3,000 characters

### Planned Fix (Phase 8 Part 3)

- Increase n_predict to 768 tokens
- Add text cleaning step to strip PDF artifacts
- Future: Map-Reduce summarization (summarize each chunk → combine summaries)

---

## Question Answering (RAG)

### Current Implementation

```
User question
    ↓
tokenize(question) — lowercase, remove stop words, filter short tokens
    ↓
BM25 scoring against all document chunks
    ↓
Top 3 chunks selected (highest BM25 score)
    ↓
Chunks labeled as [Chunk 1], [Chunk 5], etc.
    ↓
Truncate context to 3,000 characters (safety net)
    ↓
LLM answers based ONLY on provided context
    ↓
Display answer
```

### BM25 Algorithm

- Term frequency saturation (K1 = 1.5)
- Document length normalization (B = 0.75)
- Inverse document frequency weighting
- Stop words filtered (articles, prepositions, common verbs)
- Tokens shorter than 3 characters filtered

### Planned Improvements

- **Context Budget Manager** (Phase 8): Token-based budget instead of character truncation
- **Hybrid Retrieval** (Phase 11): BM25 + embedding model for semantic search
- **Citation Engine** (Phase 8.7): Structured source references below answers
- **Hallucination Detection** (Phase 8.6): Verify answer claims against source chunks

---

## Benefits

- Faster — only relevant chunks sent to LLM
- Lower memory usage — small context window
- Works with large PDFs — no document size limit
- Fully offline — no internet required
- Deterministic retrieval — same query always returns same chunks
