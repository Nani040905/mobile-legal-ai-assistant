# Data Flow & Service Architecture

> **Branch:** `javascript`

---

## 1. RAG Pipeline (Ask Document)

The core value of the app — answering questions about uploaded PDFs using local LLM.

```
User enters question in DocumentDetailsScreen
               ↓
retrievalService.rankChunks(query, allChunks)
   ┌─────────────────────────────────────────┐
   │  BM25 Algorithm                          │
   │  1. tokenize(query) → remove stop words │
   │  2. tokenize(chunk) → build term freq.  │
   │  3. computeIDF(term, allChunks)          │
   │  4. score = Σ IDF * TF-saturated        │
   │     k1=1.5, b=0.75 (standard defaults)  │
   └─────────────────────────────────────────┘
               ↓
Top-K ranked chunks (default k=3)
               ↓
contextBudget.buildBudgetedContext(
   systemPrompt,
   rankedChunks,
   question,
   maxContextTokens=1800,
   reservedOutputTokens=512
)
   ┌──────────────────────────────────────────┐
   │  Token Budget Manager                     │
   │  1. Estimate tokens: chars / 4           │
   │  2. Fill chunks greedily until budget hit │
   │  3. Return: contextText, droppedCount    │
   └──────────────────────────────────────────┘
               ↓
llmService.answerQuestion(question, budgetedContext, onToken)
   ┌──────────────────────────────────────────┐
   │  LLM Inference (llama.rn)                │
   │  Model: Qwen 2.5 3B (or selected model) │
   │  n_predict: 1024 tokens                  │
   │  temperature: 0.3 (factual accuracy)     │
   │  top_p: 0.9, top_k: 40                  │
   │  stop: ['<|im_end|>', '<|endoftext|>']  │
   └──────────────────────────────────────────┘
               ↓
Streaming tokens → onToken() → UI updates in real-time
               ↓
telemetry.recordInference(tokensGenerated, durationMs)
               ↓
Final answer stored in component state + displayed with citation panel
```

---

## 2. Document Upload & Processing Pipeline

```
User picks PDF via DocumentPicker
               ↓
useDocumentStore.importDocument(file)
               ↓
pdfService.extractText(filePath) [React Native bridge]
   ┌──────────────────────────────────────────────────────┐
   │  PdfExtractorModule.kt (Native Kotlin)               │
   │  1. Reads file from device filesystem                │
   │  2. Passes to Apache PDFBox (Android port)          │
   │  3. Extracts raw text from all pages                 │
   │  4. Returns plain string via React Native Bridge     │
   └──────────────────────────────────────────────────────┘
               ↓
textCleaner.cleanText(rawText)
   - Remove excessive whitespace, control chars
   - Normalize line endings
   - Strip headers/footers heuristically
               ↓
pdfService.splitIntoChunks(cleanedText, chunkSize=1000)
   - Split on paragraph boundaries first
   - Fall back to character count split
   - Each chunk labeled [Chunk 1], [Chunk 2]...
               ↓
Document object stored in useDocumentStore:
{
  id: string,
  name: string,
  uri: string,
  size: number,
  importedAt: number,
  wordCount: number,
  text: string,          // full extracted text
  chunks: string[]       // pre-split chunks
}
               ↓
Persisted to AES-256 encrypted AsyncStorage via secureStorage
```

---

## 3. Model Lifecycle

```
App startup
   ↓
modelManager.checkModelFile(activeModelId)
   ↓ model file exists?
   ├─ YES → status: 'idle'
   └─ NO  → status: 'not_downloaded'

User taps "Load Model"
   ↓
modelManager.initializeModel(modelId)
   ↓ status: 'loading'
   ↓
initLlama({
  model: '/path/to/model.gguf',
  n_ctx: 2048,
  n_gpu_layers: 0,      // CPU only — GPU crashes Adreno
  use_mlock: true,      // Prevent memory paging
})
   ↓ status: 'ready' | 'error'
   ↓
context stored in modelContext singleton

User taps "Unload Model"
   ↓
modelManager.releaseModel()
   ↓ context.release()
   ↓ status: 'idle'

Crash during inference
   ↓
modelManager.handleCrash(error)
   ↓ try: context.release() safely
   ↓ status: 'error'
   ↓ UI shows "model crashed — reload in Settings"
```

---

## 4. Zustand State Stores

### `useCaseStore`

Manages all case folder records. Persisted with `secureStorage` JSON adapter.

```
CaseFolder {
  id: string                // timestamp + random hex
  name: string              // case title
  clientName: string
  caseType: string          // 'criminal' | 'civil' | 'contract' | ...
  description: string
  status: string            // 'Active' | 'Closed' | 'On Hold'
  documents: string[]       // array of document IDs
  tags: string[]            // custom tags
  notes: { id, text, createdAt }[]
  nextHearingDate: string?
  createdAt: number
  updatedAt: number
  // Cached AI reports (set once, re-used):
  timelineEvents: object?
  contradictionReport: object?
  entityIndex: object?
  evidenceChainReport: object?
  missingDocsReport: object?
  hearingBrief: object?
  opponentPrediction: object?
  clientQuestions: object?
}
```

Actions: `addCase`, `updateCase`, `deleteCase`, `addDocumentToCase`, `removeDocumentFromCase`, `addCaseNote`, `deleteCaseNote`, `toggleCaseTag`, `setCaseStatus`, `setNextHearingDate`, `setTimeline`, `setContradictionReport`, `setEntityIndex`, `setEvidenceChainReport`, `setMissingDocsReport`, `setHearingBrief`, `setOpponentPrediction`, `setClientQuestions`, `clearAllCases`

### `useChatStore`

Manages all chat message histories, one thread per `caseId`. Persisted with `secureStorage`.

```
ChatThread {
  caseId: string
  messages: {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    perspective: string
    caseType: string
  }[]
}
```

Actions: `addMessage`, `clearHistory(caseId)`, `clearAll`, `getHistory(caseId)`

### `useDocumentStore`

Manages all uploaded PDF documents and their extracted text. Persisted with `secureStorage`.

```
Document {
  id: string
  name: string
  uri: string
  size: number
  importedAt: number
  wordCount: number
  text: string         // full extracted text (~unlimited)
  chunks: string[]     // pre-chunked (1000 chars each)
}
```

Actions: `addDocument`, `deleteDocument`, `getDocumentById`, `clearAll`

---

## 5. LLM Prompt Construction

All prompts use **Qwen 2.5 ChatML format**:

```
<|im_start|>system
You are a helpful legal AI assistant specialized in Indian Law...

Active Perspective: DEFENSE
Active Case Type: CRIMINAL

Focus on:
- Constitutional rights under Article 21
- Bail provisions under BNSS
...
<|im_end|>
<|im_start|>user
[Prior conversation history injected here]
...
[Current user message]
<|im_end|>
<|im_start|>assistant
```

**Perspective + CaseType prefix** is generated by `getPerspectiveCaseTypePromptPrefix()` from `legalPerspective.js` and `caseType.js` type definitions.

### LLM inference parameters by task:

| Task | n_predict | temperature | Use |
|---|---|---|---|
| Chat (general) | 1024 | 0.7 | Conversational, moderate creativity |
| Summarize document | 2048 | 0.3 | Factual, structured |
| Answer question (RAG) | 1024 | 0.3 | Factual, grounded in context |
| Risk analysis | 1024 | 0.4 | Analytical |
| Strategy / Hearing Prep | 1024 | 0.5 | Balanced |
| Draft generation | 2048 | 0.5 | Template-following |
| Timeline / Entities | 1024 | 0.2 | Highly structured JSON output |
| Contradiction detection | 1024 | 0.2 | Deterministic JSON output |

---

## 6. BM25 Retrieval Engine Details

`retrievalService.js` — zero external dependencies, pure JavaScript.

**Algorithm:** BM25 Okapi

```
score(D, Q) = Σ_i IDF(q_i) × [f(q_i, D) × (k1 + 1)] / [f(q_i, D) + k1 × (1 - b + b × |D|/avgdl)]
```

**Parameters:**
- `K1 = 1.5` — Term frequency saturation (standard default)
- `B = 0.75` — Document length normalization (standard default)

**Stop words removed from both query and chunks:**
- Articles: `a`, `an`, `the`
- Prepositions: `in`, `on`, `at`, `to`, `for`, `of`, `with`, `by`, `from`, `as`
- Conjunctions: `and`, `or`, `but`, `nor`, `so`, `yet`
- Common verbs: `is`, `am`, `are`, `was`, `were`, `have`, `has`, `had`, `do`, `does`, `did`, etc.

**Why BM25 over vector embeddings?**
- Saves ~500 MB RAM (no embedding model needed)
- Instant scoring — no neural network forward pass
- Legal text relies on exact terminology (`indemnification`, `force majeure`) where keyword matching outperforms semantic similarity
- Deterministic and explainable results

---

## 7. Encrypted Storage

`secureStorage.js` wraps `AsyncStorage` with AES-256 encryption via `crypto-js`.

```javascript
// All Zustand persist adapters use secureStorage instead of AsyncStorage directly
storage: createJSONStorage(() => secureStorage)

// secureStorage API matches AsyncStorage:
secureStorage.getItem(key)   // → decrypt(AES256) → JSON.parse()
secureStorage.setItem(key, value)  // → JSON.stringify() → AES256 encrypt
secureStorage.removeItem(key)
```

When encryption is toggled OFF in settings, raw JSON is stored directly.

---

## 8. Telemetry

`telemetry.js` tracks inference performance in memory (not persisted).

```javascript
recordInference(tokensGenerated, durationMs)
// → averageTokensPerSecond = totalTokens / totalDurationMs * 1000
// → averageLatencyMs = totalDurationMs / inferenceCount

recordModelLoad(durationMs)  // tracked separately

getTelemetryReport()  // → { inferenceCount, avgTps, avgLatency, modelLoadTime }
```

Displayed in SettingsScreen performance dashboard.
