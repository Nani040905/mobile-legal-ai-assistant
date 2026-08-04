# All AI Analysis Services

> **Branch:** `javascript`
> All services are in `LegalAI/src/services/`. All use `llmService` for LLM inference.

---

## 1. `llmService.js` — Core LLM Inference API

**Size:** 14.2 KB  
**Purpose:** Provides clean API for all LLM operations. The only service that calls `modelManager.getContext()`.

**Key functions:**

| Function | Description | n_predict | Temperature |
|---|---|---|---|
| `isModelReady()` | Returns true if model is loaded | — | — |
| `getModelStatus()` | Returns status string | — | — |
| `generateResponse(prompt, onToken, history, perspective, caseType)` | General chat | 1024 | 0.7 |
| `generateSummary(documentText, onToken, perspective, caseType)` | Document summarize | 2048 | 0.3 |
| `answerQuestion(question, contextText, onToken, perspective, caseType)` | RAG Q&A | 1024 | 0.3 |
| `getPerspectiveCaseTypePromptPrefix(perspective, caseType)` | Build context prefix | — | — |

**Error handling:** All functions catch errors and call `modelManager.handleCrash(error)` for auto-recovery before re-throwing with user-friendly message.

**Telemetry:** All inference calls record to `telemetry.recordInference(tokens, durationMs)`.

---

## 2. `modelManager.js` — LLM Lifecycle Singleton

**Size:** 20.0 KB  
**Purpose:** Single source of truth for the loaded LLM context. Prevents duplicate model loading (each model = ~2 GB RAM).

**Available models:**

```javascript
MODELS = [
  {
    id: 'qwen-2.5-3b',
    filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/...',
    sizeLabel: '1.96 GB',
    description: 'Best quality & reasoning. Ideal for devices with 6GB+ RAM.'
  },
  {
    id: 'qwen-2.5-1.5b',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/Qwen/...',
    sizeLabel: '1.13 GB'
  },
  {
    id: 'llama-3.2-1b',
    filename: 'llama-3.2-1b-instruct-q4_k_m.gguf',
    downloadUrl: 'https://huggingface.co/hugging-quants/...',
    sizeLabel: '0.81 GB'
  }
]
```

**Model storage paths:**
- Primary: `RNFS.ExternalDirectoryPath` (external storage, user-accessible)
- Fallback: `/sdcard/Download`
- Secondary: `RNFS.DocumentDirectoryPath`

**Status lifecycle:** `not_downloaded → idle → loading → ready → error`

**Key methods:** `initializeModel(id)`, `releaseModel()`, `getContext()`, `getStatus()`, `checkModelFile(id)`, `downloadModel(id, onProgress)`, `handleCrash(error)`, `setGenerating(bool)`, `addStatusListener(cb)`, `removeStatusListener(cb)`

**Persistence:** Active model ID and auto-load preference saved in `AsyncStorage` (`legal-ai-active-model-id`, `legal-ai-model-should-load`).

---

## 3. `retrievalService.js` — BM25 Retrieval Engine

**Size:** 14.2 KB  
**Purpose:** Ranks document chunks by relevance to a query. Used in RAG pipeline and the `DebugRetrievalScreen`.

**API:**
```javascript
rankChunks(query: string, chunks: string[], topK: number = 3)
// Returns: [{ chunk, score }] sorted descending by BM25 score
```

**Algorithm:** Okapi BM25 (K1=1.5, B=0.75)  
**Dependencies:** Zero — pure JavaScript

---

## 4. `pdfService.js` — Document Text Processing

**Size:** 8.8 KB  
**Purpose:** Extract text from files via native module, split into chunks.

**API:**
```javascript
extractText(fileUri)      // → Promise<string>  (calls PdfExtractorModule.kt)
splitIntoChunks(text, chunkSize=1000) // → string[]
getFileInfo(uri, name)    // → { name, uri, size, pageCount, extractedAt }
```

---

## 5. `storageService.js` — Filesystem Helpers

**Size:** 5.3 KB  
**Purpose:** Abstracts RNFS file operations for model files and document storage.

**API:**
```javascript
fileExists(path)          // → Promise<boolean>
readFile(path)            // → Promise<string>
writeFile(path, content)  // → Promise<void>
deleteFile(path)          // → Promise<void>
getDirectoryFiles(dir)    // → Promise<string[]>
getFileSize(path)         // → Promise<number>
```

---

## 6. `secureStorage.js` — Encrypted Storage Adapter

**Size:** 4.7 KB  
**Purpose:** Zustand `createJSONStorage` compatible adapter that AES-256 encrypts all data before writing to AsyncStorage.

**API (matches AsyncStorage):**
```javascript
getItem(key)              // → decrypt → JSON.parse
setItem(key, value)       // → JSON.stringify → AES256 encrypt → store
removeItem(key)
```

**Key:** Derived from device-specific UUID (set once on first app launch, stored in plain AsyncStorage).  
**Library:** `crypto-js` v4.2.0

---

## 7. `contextBudget.js` — Token Budget Manager

**Size:** 3.1 KB  
**Purpose:** Ensures prompt never exceeds model's context window by greedily fitting chunks.

**API:**
```javascript
buildBudgetedContext(
  systemPrompt,         // system message string
  chunks,               // string[] ranked by relevance
  userQuery,            // user question string
  maxContextTokens,     // 1800 (default)
  reservedOutputTokens  // 512 (default)
)
// Returns: { contextText, droppedCount, estimatedTokens }
```

**Token estimation:** `text.length / 4` (rough approximation)

---

## 8. `telemetry.js` — Performance Tracker

**Size:** 2.0 KB  
**Purpose:** In-memory (session-only) inference performance tracking.

**API:**
```javascript
recordInference(tokensGenerated, durationMs)
recordModelLoad(durationMs)
getTelemetryReport()
// → { inferenceCount, avgTokensPerSecond, avgLatencyMs, modelLoadTimeMs }
resetTelemetry()
```

---

## 9. `riskAnalyzer.js` — Legal Risk Audit

**Size:** 7.6 KB  
**Purpose:** Generates a comprehensive legal risk report from all case documents.

**API:**
```javascript
analyzeRisk(caseDocTexts: string[], caseType: string, onToken?)
// → Promise<RiskReport>
// RiskReport: { overallRisk: number, riskItems: RiskItem[], summary: string }
// RiskItem: { description, severity: 'Critical'|'High'|'Medium'|'Low', category, recommendation }
```

**LLM prompt:** Instructs model to identify legal risks with JSON output format. Falls back to regex parsing if JSON is malformed.

---

## 10. `strategyGenerator.js` — Legal Strategy Report

**Size:** 8.6 KB  
**Purpose:** Generates a legal strategy recommendation considering case type and perspective.

**API:**
```javascript
generateStrategy(caseDocTexts, caseType, perspective, onToken?)
// → Promise<StrategyReport>
// StrategyReport: { recommendedStrategy, keyStrengths, keyWeaknesses, immediateActions, longTermActions }
```

---

## 11. `timelineGenerator.js` — Chronological Event Extractor

**Size:** 10.1 KB  
**Purpose:** Extracts and sorts all dates/events mentioned across case documents into a timeline.

**API:**
```javascript
generateTimeline(caseDocTexts: string[], onToken?)
// → Promise<TimelineEvent[]>
// TimelineEvent: { date, description, sourceDocument, eventType }
```

**Output sorting:** Events sorted by parsed date ascending.

---

## 12. `contradictionDetector.js` — Cross-Document Contradiction Scanner

**Size:** 7.9 KB  
**Purpose:** Finds factual contradictions between multiple documents in a case.

**API:**
```javascript
detectContradictions(allDocTexts: string[], allDocNames: string[], onToken?)
// → Promise<ContradictionReport>
// ContradictionReport: { contradictions: Contradiction[], summary }
// Contradiction: { statementA, sourceA, statementB, sourceB, contradictionType, severity }
```

**JSON parsing:** Uses robust parsing with multiple fallback regex patterns to handle model output variations.

---

## 13. `entityTracker.js` — Named Entity Index Builder

**Size:** 8.2 KB  
**Purpose:** Builds a cross-document index of named entities.

**API:**
```javascript
buildEntityIndex(allDocTexts, allDocNames, onToken?)
// → Promise<EntityIndex>
// EntityIndex: {
//   persons: Entity[], organizations: Entity[], locations: Entity[],
//   dates: Entity[], legalProvisions: Entity[], amounts: Entity[]
// }
// Entity: { name, type, mentions: [{ docName, context }] }
```

---

## 14. `evidenceChainTracker.js` — Evidence Chain Analyzer

**Size:** 7.0 KB  
**Purpose:** Analyzes the logical chain of evidence across case documents.

**API:**
```javascript
analyzeEvidenceChain(caseDocTexts, allDocNames, onToken?)
// → Promise<EvidenceChainReport>
// EvidenceChainReport: { evidenceItems, chainStrength, gaps, recommendations }
// EvidenceItem: { description, sourceDoc, linkedEvidence, strength }
```

---

## 15. `evidenceAnalyzer.js` — Single Document Evidence Analyzer

**Size:** 2.3 KB  
**Purpose:** Extracts key evidence and findings from a single document (simpler than evidenceChainTracker).

**API:**
```javascript
analyzeEvidence(documentText, onToken?)
// → Promise<string>  (plain text analysis)
```

---

## 16. `missingDocDetector.js` — Missing Document Detector

**Size:** 7.0 KB  
**Purpose:** Identifies document types typically needed for a case type that are absent.

**API:**
```javascript
detectMissingDocuments(caseDocTexts, caseType, existingDocNames, onToken?)
// → Promise<MissingDocsReport>
// MissingDocsReport: { missingDocs: MissingDoc[], completenessScore }
// MissingDoc: { documentType, importance: 'Critical'|'Important'|'Optional', reason, suggestion }
```

---

## 17. `hearingPrep.js` — Hearing Preparation Brief Generator

**Size:** 6.1 KB  
**Purpose:** Generates a structured brief for an upcoming court hearing.

**API:**
```javascript
generateHearingBrief(caseDocTexts, nextHearingDate, caseType, perspective, onToken?)
// → Promise<HearingBrief>
// HearingBrief: { keyArguments, supportingEvidence, anticipatedCounterArguments, proceduralChecklist }
```

---

## 18. `opponentPredictor.js` — Opponent Argument Predictor

**Size:** 5.0 KB  
**Purpose:** Predicts the opposing side's likely legal arguments.

**API:**
```javascript
predictOpponentArguments(caseDocTexts, caseType, perspective, onToken?)
// → Promise<OpponentPrediction>
// OpponentPrediction: { arguments: PredictedArgument[], overallStrategy }
// PredictedArgument: { argument, likelihood, counterStrategy }
```

---

## 19. `clientQuestionGenerator.js` — Client Interview Question Generator

**Size:** 4.6 KB  
**Purpose:** Generates categorized questions for a client intake interview.

**API:**
```javascript
generateClientQuestions(caseDocTexts, caseType, onToken?)
// → Promise<ClientQuestions>
// ClientQuestions: { factual, procedural, evidence, witness, financial }  // string[][] per category
```

---

## 20. `draftGenerator.js` — Legal Document Draft Generator

**Size:** 3.7 KB  
**Purpose:** Generates draft legal documents from Indian law templates.

**Supported template types:**
- `legal_notice` — Legal notice for breach/non-compliance
- `reply_to_notice` — Reply to received legal notice
- `bail_application` — Bail application under BNSS/CrPC
- `petition` — Petition (writ, civil, or other)
- `affidavit` — Sworn affidavit
- `plaint` — Civil suit plaint
- `written_statement` — Written statement of defense

**API:**
```javascript
generateDraft(templateType, caseContext: { caseType, clientName, opponentName, facts }, onToken?)
// → Promise<string>  (formatted draft text)
```

---

## 21. `sectionExtractor.js` — Indian Law Section Identifier

**Size:** 7.8 KB  
**Purpose:** Identifies and explains Indian legal sections/provisions cited in documents.

**API:**
```javascript
extractSections(docText, caseType, onToken?)
// → Promise<SectionReport>
// SectionReport: { sections: ExtractedSection[] }
// ExtractedSection: { sectionNumber, actName, description, applicability }
```

**Supported acts:** IPC/BNS, CrPC/BNSS, CPC, Evidence Act/BSA, Constitution of India, RTI Act, Companies Act, and others.

---

## 22. `perspectiveComparison.js` — Multi-Perspective Analyzer

**Size:** 5.7 KB  
**Purpose:** Runs the same case through multiple legal perspective lenses.

**API:**
```javascript
comparePerspectives(caseDocTexts, caseType, onToken?)
// → Promise<PerspectiveComparison>
// PerspectiveComparison: { perspectives: { [perspective: string]: string } }
// perspectives analyzed: prosecution, defense, plaintiff, defendant, judge, mediator
```

---

## 23. `answerVerifier.js` — Hallucination Checker

**Size:** 6.0 KB  
**Purpose:** Verifies LLM answers against source context to detect potential hallucinations.

**API:**
```javascript
verifyAnswer(question, answer, sourceContext, onToken?)
// → Promise<VerificationResult>
// VerificationResult: { isSupported: boolean, confidence: 0-1, reasoning, flags: string[] }
```

---

## 24. `corpusManager.js` — Indian Law Corpus

**Size:** 1.5 KB  
**Purpose:** Manages the built-in Indian legal knowledge base (constitutional provisions, acts).

**API:**
```javascript
getCorpusChunks(topic?)
// → string[]  (relevant corpus text chunks)
```

---

## 25. `unifiedAnalyzer.js` — Orchestration Service

**Size:** 9.7 KB  
**Purpose:** Orchestrates multiple analyzers in sequence for a full case analysis run.

**API:**
```javascript
runFullCaseAnalysis(caseId, caseDocTexts, caseType, perspective, onProgress?)
// → Promise<FullCaseAnalysis>
// Runs: risk, strategy, timeline, contradictions, entities, evidence chain, missing docs
// Updates useCaseStore with each result as it completes
```

---

## 26. `precedentService.js` — Precedent Case Lookup (Phase 26 Stubs)

**Size:** 3.4 KB  
**Purpose:** Stubs for searching relevant Indian legal precedents from an offline database.

**Status:** Phase 26 — stubs implemented, full precedent database integration pending.

**API:**
```javascript
searchPrecedents(query, caseType)   // → Promise<Precedent[]>  (stub returns empty)
getPrecedentById(id)                // → Promise<Precedent | null>
```

---

## Type Definitions

### `legalPerspective.js`

```javascript
PERSPECTIVES = ['neutral', 'prosecution', 'defense', 'plaintiff', 'defendant', 'investigator', 'mediator']

PERSPECTIVE_FOCUS = {
  prosecution: 'Focus on building the strongest case for the prosecution, identifying evidence that supports guilt...',
  defense: 'Focus on identifying weaknesses in the prosecution case, constitutional rights under Article 21, bail provisions...',
  plaintiff: 'Focus on establishing the plaintiff\'s legal claims, damages, and relief sought under Indian civil law...',
  // etc.
}
```

### `caseType.js`

```javascript
CASE_TYPES = ['criminal', 'civil', 'contract', 'property', 'corporate', 'family', 'constitutional', 'consumer', 'labour', 'tax', 'ip', 'unknown']

CASE_TYPE_FOCUS = {
  criminal: ['IPC/BNS sections applicable', 'Bail provisions under BNSS/CrPC', 'Evidence admissibility under BSA/IEA', ...],
  civil:    ['CPC procedures', 'Limitation periods', 'Burden of proof standards', ...],
  contract: ['Contract Act 1872 provisions', 'Specific Relief Act remedies', 'Arbitration clauses', ...],
  // etc.
}
```
