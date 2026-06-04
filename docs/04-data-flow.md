# Data Flow

## Chat Flow

```
User Question
    ↓
useChatStore.sendMessage()
    ↓
llmService.generateResponse()
    ↓
modelManager.getContext()
    ↓
context.completion() [llama.rn]
    ↓
Streaming tokens via callback
    ↓
Chat Screen (real-time display)
```

---

## PDF Upload Flow

```
User selects PDF (document picker)
    ↓
File copied locally (keepLocalCopy)
    ↓
PdfExtractor native module (PDFBox)
    ↓
Extract raw text
    ↓
pdfService.splitIntoChunks()
    ↓
useDocumentStore (Zustand + AsyncStorage)
```

---

## PDF Summary Flow

```
Document chunks
    ↓
Truncate to context window budget
    ↓
llmService.generateSummary()
    ↓
context.completion() [llama.rn]
    ↓
Streaming summary tokens
    ↓
Document Details Screen
```

---

## PDF Question Answering Flow (RAG)

```
User question
    ↓
retrievalService.search() [BM25]
    ↓
Top K relevant chunks (ranked)
    ↓
retrievalService.getRelevantContext()
    ↓
llmService.answerQuestion()
    ↓
context.completion() [llama.rn]
    ↓
Answer displayed on Document Details Screen
```

---

## Model Lifecycle Flow

```
App startup
    ↓
modelManager.loadSavedModelPreference() [AsyncStorage]
    ↓
Check if model file exists on device
    ↓
If exists + shouldLoad=true → initializeModel()
    ↓
initLlama({ model, n_ctx:2048, n_threads:4 })
    ↓
Status: READY
    ↓
User taps Unload → releaseModel() → Status: IDLE
```

---

## Model Download Flow

```
User taps Download in Settings
    ↓
RNFS.downloadFile() from Hugging Face CDN
    ↓
Progress callback → UI progress bar
    ↓
File saved to DocumentDirectoryPath
    ↓
Status: IDLE (ready to load)
```

---

## Model Switching Flow

```
User selects different model in Settings
    ↓
If current model loaded → releaseModel()
    ↓
Update activeModel + persist to AsyncStorage
    ↓
checkModelExists() for new model file
    ↓
Status: IDLE or NOT_DOWNLOADED
```

---

## Crash Recovery Flow (Phase 8 — Planned)

```
Inference or loading fails
    ↓
Exception caught in try/catch
    ↓
Release context (modelContext = null)
    ↓
Free memory
    ↓
Status: ERROR
    ↓
User shown error + "Reload" button
```

---

## Hallucination Verification Flow (Phase 8.6 — Planned)

```
Generated answer
    ↓
answerVerifier.verifyAnswer()
    ↓
Cross-reference claims against source chunks
    ↓
If confidence < 0.5 → show warning banner
```

---

## Risk Analysis Flow (Phase 13 — Planned)

```
Document chunks
    ↓
riskAnalyzer.analyzeRisk()
    ↓
LLM classifies clauses
    ↓
High / Medium / Low / Missing
    ↓
Risk Report Screen
```

---

## Conversation Memory Flow (Phase 11.5 — Planned)

```
User sends follow-up question
    ↓
Last 5 exchanges condensed into history
    ↓
History injected as context in system prompt
    ↓
LLM generates answer with conversational awareness
```
