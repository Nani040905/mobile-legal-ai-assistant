# Development Roadmap

## Progress Overview

```mermaid
pie title Phase Completion Status
    "Complete" : 24
    "Remaining" : 14
```

## Execution Timeline (Revised)

```mermaid
gantt
    title Mobile Legal AI Assistant — Development Phases
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Foundation (Done)
    Phase 1 - Setup             :done, p1, 2026-05-20, 1d
    Phase 2 - UI                :done, p2, after p1, 2d
    Phase 3 - Storage           :done, p3, after p2, 1d
    Phase 4 - PDF Processing    :done, p4, after p3, 2d

    section AI Core (Done)
    Phase 5 - Local AI          :done, p5, after p4, 2d
    Phase 6 - Doc Intelligence  :done, p6, after p5, 2d
    Phase 7 - Polish            :done, p7, after p6, 2d

    section Hardening (Done)
    Phase 8 - Production        :done, p8, after p7, 3d
    Phase 8.5 - Retrieval Eval  :done, p85, after p8, 1d
    Phase 8.6 - Hallucination   :done, p86, after p85, 1d
    Phase 8.7 - Citations       :done, p87, after p86, 1d

    section Evaluation (Done)
    Phase 9 - Benchmarks        :done, p9, after p87, 2d
    Phase 9.5 - Debug Screen    :done, p95, after p9, 1d
    Phase 9.6 - Model Comparison :done, p96, after p95, 1d

    section Security (Done)
    Phase 17 Part 1 - Encryption :done, p17a, after p96, 1d

    section Memory (Done)
    Phase 11.5 - Conv Memory    :done, p115, after p17a, 1d

    section Legal Pipeline (Done)
    Phase 13 - Risk Analyzer    :done, p13, after p115, 3d
    Phase 13.5 - Perspective    :done, p135, after p13, 1d
    Phase 13.6 - Strategy       :done, p136, after p135, 1d
    Phase 13.7 - Comparison     :done, p137, after p136, 1d

    section Case Workspace (Done)
    Phase 18 - Case Workspace   :done, p18, after p137, 2d
    Phase 19 - Timeline         :done, p19, after p18, 1d
    Phase 19.5 - Docs Reader    :done, p195, after p19, 1d

    section Advanced Features (Next)
    Phase 18.5 - Notes & Tags   :active, p185, after p195, 1d
    Phase 20 - Contradictions   :p20, after p185, 2d
    Phase 21 - Entity Tracker   :p21, after p20, 2d
    Phase 21.5 - Evidence Chain :p215, after p21, 2d
    Phase 22 - Missing Docs     :p22, after p215, 1d
    Phase 24 - Hearing Prep     :p24, after p22, 2d
    Phase 24.5 - Opponent Pred  :p245, after p24, 1d
    Phase 24.6 - Client Qns     :p246, after p245, 1d
    Phase 23 - Draft Generator  :p23, after p246, 2d
    Phase 25 - Section Extractor :p25, after p23, 2d

    section Infrastructure
    Phase 10.5 - Corpus Infra   :p105, after p25, 1d
    Phase 17 Part 2 - Privacy   :p17b, after p105, 1d
    Phase 16 - Perf Dashboard   :p16, after p17b, 1d
    Phase 26 - Precedent Arch   :p26, after p16, 1d
```

---

## Phase 1 ✅

**Project Setup**

- Install Android Studio and Android SDK
- Create React Native App (TypeScript)
- Run App Successfully on Emulator

---

## Phase 2 ✅

**UI**

- Home Screen with quick-action cards
- Chat Screen with message bubbles
- Documents Screen with upload and list
- Document Details Screen with summary and Q&A
- Settings Screen with model info

---

## Phase 3 ✅

**Local Storage**

- Save documents with Zustand + AsyncStorage
- List documents with metadata
- Delete documents with confirmation

---

## Phase 4 ✅

**PDF Processing**

- Upload PDF via native document picker (SAF-compatible)
- Extract text with custom PdfExtractor native module (PDFBox)
- Split into chunks (1000 chars, smart break points)

---

## Phase 5 ✅

**Local AI**

- Integrate llama.rn (React Native bindings for llama.cpp)
- Download and load Qwen 2.5 3B GGUF model
- Chat functionality with streaming token display

---

## Phase 6 ✅

**Document Intelligence**

- Summarization with LLM
- Question answering with BM25 retrieval (RAG)
- Relevant chunk selection and labeling

---

## Phase 7 ✅

**Polish & Model Management**

- Multi-model support (Qwen 3B, Qwen 1.5B, Llama 1B)
- Model download with progress bar
- Model switching with persistent preferences
- Auto-load on startup, Stop/cancel generation button
- Indian Law specialization in system prompts

---

## Phase 8 ✅

**Production Hardening**

- Model crash recovery (auto-release + reload)
- Token-based context budget manager
- Fixed document summarization (increased token limit, PDF artifact cleaning)

---

## Phase 8.5 ✅

**Retrieval Quality Evaluation**

- Retrieval benchmark suite (Recall@5, Recall@10, MRR, Precision)
- 10 benchmark documents + 50 benchmark questions
- Automated scoring scripts in `src/evaluation/retrievalBenchmark.ts`

---

## Phase 8.6 ✅

**Hallucination Detection**

- `answerVerifier.ts` — cross-references answer claims against source chunks
- Warning banner displayed when confidence is low

---

## Phase 8.7 ✅

**Source Citation Engine**

- Interactive citation panel below AI answers
- Tap source → view chunk → highlight paragraph
- Structured `CitationSource` data type

---

## Phase 9 ✅

**Evaluation Framework**

- `performanceBenchmark.ts` — measures model load time, inference latency (ms/token), peak RAM
- `retrievalBenchmark.ts` — runs full 50-question suite with orchestrator

---

## Phase 9.5 ✅

**Retrieval Debug Screen**

- `DebugRetrievalScreen.tsx` — freeform query + document selector
- Output table: top 10 BM25 results with rank, chunk index, score, and expandable chunk preview
- Accessible from Settings → Developer Tools (dev builds only)

---

## Phase 9.6 ✅

**Model Comparison Benchmark**

- `modelComparison.ts` — `runModelComparison(modelIds[])` across all loaded models
- Collects: loadTimeMs, tokensPerSecond, peakRamMb, hallucinationScore, accuracyScore
- "Compare Models" tab in BenchmarkScreen

---

## Phase 11.5 ✅

**Conversation Memory**

- Last 10 messages (5 exchanges) retrieved and passed as history to `generateResponse()`
- History prepended as ChatML messages before current user message
- Persisted in `useChatStore` via Zustand middleware

---

## Phase 13 ✅

**Legal Audit & Risk Analyzer**

- `riskAnalyzer.ts` — chunk-by-chunk audit with `confidence`, `confidenceReason`, `lawyerQuestions[]`
- `evidenceAnalyzer.ts` — classifies Strong / Weak / Missing evidence per chunk
- `RiskReportScreen.tsx` — risk cards, evidence section, confidence banner, lawyer questions
- `interface RiskReport { highRisk, mediumRisk, missing, recommendations, confidence, lawyerQuestions }`

---

## Phase 13.5 ✅

**Perspective-Aware Legal Analysis**

- `LegalPerspective` type: neutral, plaintiff, defendant, accused, tenant, employer, consumer, etc.
- `CaseType` type: criminal, civil, consumer, employment, property, family, contract, tax, constitutional
- Global `selectedPerspective` + `selectedCaseType` state in `useChatStore` with Zustand persist
- `PerspectiveSelector.tsx` — horizontal chip rows for Perspective + CaseType
- `CASE_TYPE_FOCUS_MAP` injects perspective + case-type-specific legal focus into system prompt

---

## Phase 13.6 ✅

**Legal Strategy Generator**

- `strategyGenerator.ts` — `generateStrategy(chunks[], perspective, caseType): Promise<LegalStrategy>`
- `interface LegalStrategy { strengths, weaknesses, evidenceNeeded, possibleArguments, recommendedActions, confidence, lawyerQuestions }`
- `StrategyScreen.tsx` — structured strategy cards + confidence banner + lawyer questions

---

## Phase 13.7 ✅

**Multi-Perspective Comparison**

- `perspectiveComparison.ts` — runs strategy for two perspectives, merges into `ComparisonMatrix`
- Per-perspective confidence scores
- `PerspectiveComparisonScreen.tsx` — two-column comparison layout with shared lawyer questions

---

## Phase 17 Part 1 ✅

**Encrypted Storage**

- `secureStorage.ts` — wrapper around AES-encrypted AsyncStorage
- `secureSet()`, `secureGet()`, `secureDelete()` API
- `useCaseStore` and `storageService` migrated to `secureStorage` backend

---

## Phase 18 ✅

**Case File Workspace**

- `CaseFolder` schema: title, caseNumber, court, judgeName, clientName, caseType, status, nextHearingDate, documents[]
- `CaseStatus` type: consultation, notice_sent, filing, pending, evidence, arguments, disposed
- `useCaseStore.ts` — full CRUD with secureStorage persistence
- `CasesScreen.tsx` — case list sorted by upcoming hearing date
- `CaseDetailsScreen.tsx` — inline editable metadata, status chip selector, document link/unlink, workspace tools hub

---

## Phase 19 ✅

**Timeline Generator**

- `timelineGenerator.ts` — chunk-by-chunk date + event extraction with deduplication and contradiction flagging
- `TimelineScreen.tsx` — vertical timeline card list sorted by date, source document badge, red highlight on contradictions
- Accessible from Case Details workspace tools hub

---

## Phase 19.5 ✅

**Docs Reader (Docx & Text Extractor)**

- `DocumentExtractorModule` — Native thread-safe parsing of Word `.docx` documents (parsing zip structure and `w:t` XML tags).
- Exposes `extractDocxText()` and `extractTxtText()` to React Native.
- File picker configuration in `DocumentsScreen.tsx` expanded to include `.docx` and `.txt` MIME types.

---

## Phase 18.5 🔲 ← Next

**Case Notes & Tags (No AI)**

- Update `CaseFolder` schema to support custom tags and text notes list.
- Display tags on case cards and add filter support in `CasesScreen.tsx`.
- Add collapsible tag chip selector and notes creation/deletion layout to `CaseDetailsScreen.tsx`.

---

## Phase 20 🔲

**Contradiction Detector (Whole Case)**

- `contradictionDetector.ts` — detects factual conflicts across all linked documents (FIR, Charge Sheet, Witness Statement, Medical Report).
- `ContradictionScreen.tsx` — full-case contradiction scanner UI showing side-by-side conflict cards with source badges and severity ratings.

---

## Phase 21 🔲

**Cross-Document Entity Tracker**

- `entityTracker.ts` — extracts and indexes persons, dates, amounts, case numbers across all case docs.
- `EntityTrackerScreen.tsx` — grouped entity list, tap → see which documents the entity appears in.

---

## Phase 21.5 🔲

**Evidence Chain Tracker**

- `evidenceChainTracker.ts` — links key facts/assertions to supporting evidence found in documents vs. missing evidence gaps.
- `EvidenceChainScreen.tsx` — visualization rendering facts with checkmarked supporting items and red-crossed missing items.

---

## Phase 22 🔲

**Missing Document Detector**

- `missingDocDetector.ts` — CaseType-specific static checklists vs. uploaded documents.
- `MissingDocsScreen.tsx` — ✅ Present / ❌ Missing view per CaseType.

---

## Phase 24 🔲

**Hearing Preparation Mode (with Export & Judge Qs)**

- `hearingPrep.ts` — synthesizes all case docs into a detailed `HearingBrief` including practical `likelyJudgeQuestions` alongside formal court questions.
- `HearingPrepScreen.tsx` — full structured brief display with a prominent export action to PDF, DOCX, and TXT using native share.

---

## Phase 24.5 🔲

**Opponent Argument Predictor**

- `opponentPredictor.ts` — predicts likely opposing arguments and generates counterarguments.
- `OpponentPredictorScreen.tsx` — two sections: Likely Arguments vs. Your Counterarguments.
- No win prediction — litigation prep only.

---

## Phase 24.6 🔲

**Questions for Client**

- `clientQuestionGenerator.ts` — generates CaseType-specific client interview questions from doc gaps.
- `ClientQuestionsScreen.tsx` — numbered questions (copyable), Evidence Needed, Urgent Items sections.

---

## Phase 23 🔲

**Draft Generator Templates**

- `draftGenerator.ts` — structured prompt templates for 7 Indian legal document types.
- `DraftGeneratorScreen.tsx` — template picker, context form, generated draft with copy-to-clipboard.
- Templates: Legal Notice, Consumer Complaint, Reply Notice, RTI Application, Affidavit, Bail Petition Skeleton, Written Statement Skeleton.

---

## Phase 25 🔲

**Section Extractor (Indian Law & Common Mistakes)**

- `sectionExtractor.ts` — regex + LLM hybrid extraction of IPC/BNS/BNSS/CPC/BSA sections.
- Update `explainSection()` to include standard filing errors and warning banners for `commonMistakes`.
- `SectionExtractorScreen.tsx` — grouped by Act, tap → expand for ingredients and common mistakes warning card.

---

## Phase 10.5 🔲

**Legal Corpus Infrastructure** (no ingestion)

- `assets/legal/` directory structure with per-law `metadata.json` and README placeholders.
- `corpusManager.ts` — `listCorpusModules()`, `loadCorpusModule()`, `searchCorpus()`.
- No corpus text ingested yet — interface only. Ingestion deferred to Phase 10.

---

## Phase 17 Part 2 🔲

**Privacy Controls UI**

- `SettingsScreen.tsx` — Privacy & Security card.
- Local-Only Processing toggle (informational, always ON).
- Export All Data (JSON metadata export).
- Delete All Data (double-confirm, must type "DELETE").

---

## Phase 16 🔲

**Performance Dashboard**

- `telemetry.ts` — singleton tracking modelLoadTimeMs, lastInferenceTimeMs, tokensPerSecond, peakRamMb.
- Updated by `modelManager` and `llmService` after each operation, persisted to AsyncStorage.
- `SettingsScreen.tsx` — Performance card showing all 7 metrics.

---

## Phase 26 🔲

**Precedent Architecture Placeholder**

- `precedentService.ts` — interface-only stub, returns empty arrays.
- Hook points documented for future Indian Kanoon API or offline corpus integration.
- `interface Precedent { caseName, court, year, sections[], summary, url? }`

---

## Deferred / Dropped Features ⛔

| Feature | Reason |
|---|---|
| Phase 11 — Hybrid Retrieval | BM25 sufficient for single-lawyer app. +80–100 MB. Revisit post-production. |
| Phase 12 — Voice Mode | High complexity, marginal value for lawyers |
| Phase 14 — Document Comparison | Low priority vs. evidence and strategy pipeline |
| Phase 15 — ELI5 Mode | Targeting working lawyers — legal language is required |
| Court/Win/Judgment Prediction | Legally irresponsible — permanently banned |
| Success / Probability Scores | Legally irresponsible — permanently banned |
| Sentence duration prediction | Legally irresponsible — permanently banned |
