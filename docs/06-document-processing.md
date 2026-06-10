# Document Processing Strategy

## Problem

Large legal documents can exceed the model context window.

Examples:

- 50 page agreement
- 100 page case file
- 200 page legal notice collection

Sending the entire document to the model is not practical. Qwen 2.5 3B has a 2048-token context window configured (n_ctx), which is approximately 8,000 characters.

---

## Processing Pipeline Overview

```mermaid
flowchart LR
    A["📄 PDF File"] --> B["PdfExtractor\n(Native Module)"]
    B --> C["Raw Text"]
    C --> D["Text Cleaner\n(Planned)"]
    D --> E["Chunking\n(1000 chars)"]
    E --> F["Chunk Storage\n(AsyncStorage)"]
    F --> G{"User Action"}
    G -->|"Summarize"| H["Summary Pipeline"]
    G -->|"Ask Question"| I["RAG Pipeline"]
    G -->|"Audit"| J["Risk & Evidence Pipeline"]
    G -->|"Strategy"| K["Strategy Pipeline"]
    G -->|"Compare"| L["Comparison Pipeline"]
```

---

## Upload Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Picker as DocumentPicker
    participant Native as PdfExtractor (Kotlin)
    participant Service as pdfService
    participant Store as useDocumentStore

    User->>Picker: Select PDF
    Picker-->>Native: File URI (local copy)
    Native->>Native: PDFBox: Load & parse PDF
    Native-->>Service: Raw text string
    Service->>Service: splitIntoChunks(text, 1000)
    Note over Service: Smart break points:<br/>1. Paragraph (\\n\\n)<br/>2. Line (\\n)<br/>3. Sentence (. )<br/>4. Hard limit
    Service-->>Store: Document + Chunks[]
    Store->>Store: Persist to AsyncStorage
```

### Chunking Strategy

```mermaid
flowchart TD
    A["Full Document Text"] --> B{"Length > 1000 chars?"}
    B -->|No| C["Return as single chunk"]
    B -->|Yes| D["Extract 1000-char candidate"]
    D --> E{"Paragraph break\nin last 50%?"}
    E -->|Yes| F["Break at \\n\\n"]
    E -->|No| G{"Line break\nin last 50%?"}
    G -->|Yes| H["Break at \\n"]
    G -->|No| I{"Sentence end\nin last 50%?"}
    I -->|Yes| J["Break at '. '"]
    I -->|No| K["Hard break at 1000"]
    F --> L["Add chunk to array"]
    H --> L
    J --> L
    K --> L
    L --> M{"More text remaining?"}
    M -->|Yes| D
    M -->|No| N["Return all chunks"]
```

---

## Summarization Pipeline

### Current Implementation

```mermaid
flowchart LR
    A["Document Text"] --> B["Truncate to\n3000 chars"]
    B --> C["System Prompt:\nSummarize this legal doc"]
    C --> D["LLM Inference\n(n_predict: 256)"]
    D --> E["Summary\n(10-15 lines)"]

    style E fill:#ff9800,color:#000
```

### Known Issues

- Only 10–15 lines of summary generated (token limit too low)
- Raw markdown/PDF formatting artifacts in output
- Large documents lose content beyond 3,000 characters

### Planned Fix (Phase 8 Part 3)

```mermaid
flowchart LR
    A["Document Text"] --> B["cleanPdfText()\nStrip artifacts"]
    B --> C["Context Budget\nManager"]
    C --> D["System Prompt:\nSummarize in plain text"]
    D --> E["LLM Inference\n(n_predict: 768)"]
    E --> F["Full Summary\n(30+ lines)"]

    style F fill:#4caf50,color:#fff
```

Future: Map-Reduce summarization:

```mermaid
flowchart TD
    A["Chunk 1"] --> S1["Summary 1"]
    B["Chunk 2"] --> S2["Summary 2"]
    C["Chunk 3"] --> S3["Summary 3"]
    D["Chunk N"] --> SN["Summary N"]
    S1 --> COMBINE["Combine All Summaries"]
    S2 --> COMBINE
    S3 --> COMBINE
    SN --> COMBINE
    COMBINE --> FINAL["Final Summary\n(LLM pass)"]
```

---

## Question Answering Pipeline (RAG)

### BM25 Retrieval Algorithm

```mermaid
flowchart TD
    A["User Question"] --> B["tokenize(query)\nLowercase, remove stops"]
    B --> C["For each query term:\nCompute IDF"]
    C --> D["For each chunk:\nBM25 score = Σ IDF × TF-saturation"]
    D --> E["Sort chunks by score\n(descending)"]
    E --> F["Filter score > 0"]
    F --> G["Return Top K chunks"]

    subgraph BM25["BM25 Formula"]
        H["score = IDF × f(k1+1) / f+k1×(1-b+b×docLen/avgLen)"]
        I["k1=1.5  b=0.75"]
    end
```

### Full RAG Flow

```mermaid
sequenceDiagram
    participant User
    participant BM25 as retrievalService
    participant Budget as contextBudget (Planned)
    participant LLM as llmService
    participant Model as llama.rn

    User->>BM25: Question + Document Chunks
    BM25->>BM25: Tokenize query
    BM25->>BM25: Compute IDF scores
    BM25->>BM25: Score all chunks
    BM25-->>Budget: Top K ScoredChunks

    Budget->>Budget: estimateTokens(systemPrompt)
    Budget->>Budget: estimateTokens(question)
    loop Add chunks until budget full
        Budget->>Budget: estimateTokens(nextChunk)
        Budget->>Budget: Check total < 1800
    end
    Budget-->>LLM: Budgeted prompt

    LLM->>Model: completion(system + context + question)
    Model-->>User: Streamed answer
```

---

## Legal Audit Pipeline (Risk & Evidence)

### Risk Analysis

1. Scans document chunks contextually.
2. Identifies high-risk, medium-risk, and missing standard clauses based on `CaseType` and `LegalPerspective`.
3. Produces a Risk Confidence Score and specific questions to ask an attorney.

### Evidence Extractor

1. Identifies and categorizes evidentiary references within the text.
2. Classifies evidence into:
   - **Strong Evidence**: Signed documents, formal correspondence, timestamps.
   - **Weak Evidence**: Verbal assertions, unsigned annexures.
   - **Missing Evidence**: Items referred to but not included.

---

## Legal Strategy Pipeline

### SWOT Generator

1. Uses `strategyGenerator.ts` to build context.
2. Maps document text into:
   - **Strengths**: Strong claims, clear evidence.
   - **Weaknesses**: Missing clauses, poor formatting, contradictions.
   - **Opportunities**: Legal loopholes, missing opponent evidence.
   - **Threats**: Approaching deadlines, jurisdictional issues.
3. Compiles Legal Arguments and actionable Next Steps.

---

## Benefits

- Faster — only relevant chunks sent to LLM for RAG
- Deep Analysis — chunk-by-chunk iteration for Audit and Strategy
- Lower memory usage — small context window managed dynamically via KV cache clearing (`context.clearCache()`)
- Works with large PDFs — no document size limit
- Fully offline — no internet required
- Deterministic retrieval — same query always returns same chunks
