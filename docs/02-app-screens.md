# App Screens Reference

> **Branch:** `javascript` — React Native implementation
> All screens are JSX components using React Navigation Native Stack.

---

## Navigation Route Map

```
App.jsx
  └── AppNavigator.jsx (NavigationContainer)
        ├── Home
        ├── Cases
        ├── CaseDetails (params: caseId)
        ├── Chat (params: caseId)
        ├── Documents
        ├── DocumentDetails (params: docId, docName)
        ├── Settings
        ├── Benchmark
        ├── DebugRetrieval
        ├── RiskReport (params: caseId)
        ├── Strategy (params: caseId)
        ├── PerspectiveComparison (params: caseId)
        ├── Timeline (params: caseId)
        ├── Contradiction (params: caseId)
        ├── EntityTracker (params: caseId)
        ├── EvidenceChain (params: caseId)
        ├── MissingDocs (params: caseId)
        ├── HearingPrep (params: caseId)
        ├── OpponentPredictor (params: caseId)
        ├── ClientQuestions (params: caseId)
        ├── DraftGenerator (params: caseId)
        └── SectionExtractor (params: caseId)
```

---

## 1. HomeScreen

**File:** `src/screens/HomeScreen.jsx` (19.9 KB)

**Purpose:** App landing dashboard with navigation tiles.

**Features:**
- Displays model status badge (loading / ready / error) at the top
- Grid of action tiles navigating to key areas
- Case count badge shown on the Cases tile
- Model not ready warning banner with Settings deep link
- Dynamic gold/navy dark theme consistent with brand colors

**Navigates to:** Cases, Chat (general), Documents, Settings, Benchmark, DebugRetrieval

---

## 2. CasesScreen

**File:** `src/screens/CasesScreen.jsx` (21.2 KB)

**Purpose:** List of all case folders — the workspace manager.

**Features:**
- Create new cases with name, client name, case type, and description
- Filter cases by status (`Active`, `Closed`, `On Hold`)
- Filter cases by custom tags (color-coded)
- Sort cases by date or name
- Swipe-to-delete case folders
- Case cards show: name, client, case type, document count, status badge, last updated timestamp
- Search/filter bar at top

**State:** `useCaseStore`
**Navigates to:** CaseDetails

---

## 3. CaseDetailsScreen

**File:** `src/screens/CaseDetailsScreen.jsx` (25.0 KB)

**Purpose:** Central workspace hub for a single case folder.

**Features:**
- Header showing case name, client, and case type
- Case status selector (Active / Closed / On Hold)
- Next hearing date picker
- Custom case notes (add / delete)
- Custom tags (toggle from preset tag list)
- Linked documents list with quick-add from document store
- Tool grid to launch all AI analysis screens for this case:
  - Chat, Timeline, Contradiction Scanner, Entity Tracker
  - Evidence Chain, Missing Documents, Hearing Prep
  - Opponent Predictor, Client Questions, Draft Generator
  - Section Extractor, Risk Report, Strategy, Perspective Comparison

**State:** `useCaseStore`, `useDocumentStore`

---

## 4. ChatScreen

**File:** `src/screens/ChatScreen.jsx` (13.7 KB)

**Purpose:** AI conversation interface grounded in Indian law.

**Features:**
- Streaming token display — words appear in real-time as the model generates them
- Stop/cancel button to abort mid-generation
- Chat history persisted per case via `useChatStore`
- Perspective mode selector (neutral / prosecution / defense / plaintiff / defendant / investigator / mediator)
- Case type selector affecting LLM context focus
- Clear chat button
- Typing indicator during generation
- Scroll-to-bottom auto-scroll on new messages

**Services:** `llmService.generateResponse()` with ChatML format history

---

## 5. DocumentsScreen

**File:** `src/screens/DocumentsScreen.jsx` (13.6 KB)

**Purpose:** Upload and manage PDF legal documents.

**Features:**
- Import PDF files via React Native Document Picker
- Extract text offline using native `PdfExtractorModule` (Kotlin + PDFBox)
- Display document list with name, size, date, word count
- Delete documents
- Link/unlink documents to cases
- Sort by date or name
- Long-press for bulk actions

**State:** `useDocumentStore`
**Native:** `PdfExtractorModule.extractText(filePath)`

---

## 6. DocumentDetailsScreen

**File:** `src/screens/DocumentDetailsScreen.jsx` (28.7 KB)

**Purpose:** Single document analysis workspace — the largest screen in the app.

**Features:**
- **Summarize** — AI generates a structured plain-text summary
- **Ask Document (RAG)** — BM25 retrieval finds relevant chunks, LLM answers with citations
- **Chunk Viewer** — Browse all extracted text chunks with their BM25 relevance scores
- **Citation Panel** — Shows which chunks were used to answer a question
- **Perspective Mode** — Switch between legal perspectives to reframe analysis
- **Case Type Mode** — Focus analysis on a specific case type
- Streaming token display for all AI operations
- Copy-to-clipboard for answers
- Share document text

**Services:** `llmService.generateSummary()`, `llmService.answerQuestion()`, `retrievalService.rankChunks()`

---

## 7. SettingsScreen

**File:** `src/screens/SettingsScreen.jsx` (35.0 KB) — Largest screen file.

**Purpose:** Full app configuration, model management, and privacy controls.

**Features:**
- **Model Management:**
  - Download GGUF models directly from HuggingFace URLs
  - Download progress bar with byte-level tracking
  - Switch active model
  - Load / Unload model manually
  - Auto-load toggle (restores last model on app launch)
  - Model status badge
  - Delete downloaded model to free storage
- **Performance Dashboard:**
  - Total inferences run, average tokens/sec, average latency
  - Session vs. all-time metrics
  - Reset telemetry button
- **Privacy & Security:**
  - Encryption toggle for stored data (AES-256 via crypto-js)
  - Clear all chat histories
  - Clear all documents
  - Clear all cases
  - Export data (planned)
- **About:** version info, model info, open-source credits

**Services:** `modelManager`, `telemetry`, `secureStorage`

---

## 8. TimelineScreen

**File:** `src/screens/TimelineScreen.jsx` (11.1 KB)

**Purpose:** Chronological event timeline generated from case documents.

**Features:**
- Runs `timelineGenerator.generateTimeline(caseDocTexts)` using the LLM
- Displays sorted timeline events with dates, descriptions, and source doc references
- Cached per-case in `useCaseStore.setTimeline()`
- Regenerate button
- Streaming generation display

---

## 9. ContradictionScreen

**File:** `src/screens/ContradictionScreen.jsx` (12.6 KB)

**Purpose:** Scans all documents in a case for factual contradictions.

**Features:**
- Runs `contradictionDetector.detectContradictions(allTexts)` across all linked documents
- Displays contradiction pairs with:
  - Source document A and B
  - Conflicting statements
  - Contradiction type label
  - Severity level (High / Medium / Low)
- Cached per-case in `useCaseStore.setContradictionReport()`
- JSON parse with fallback for model output variations

---

## 10. EntityTrackerScreen

**File:** `src/screens/EntityTrackerScreen.jsx` (15.6 KB)

**Purpose:** Cross-document named entity index.

**Features:**
- Runs `entityTracker.buildEntityIndex(allDocTexts, allDocNames)` using the LLM
- Extracts: Persons, Organizations, Locations, Dates, Legal Provisions, Amounts
- Grouped entity cards by category with document source references
- Filter by entity type
- Cached per-case in `useCaseStore.setEntityIndex()`

---

## 11. EvidenceChainScreen

**File:** `src/screens/EvidenceChainScreen.jsx` (13.0 KB)

**Purpose:** Evidence chain validity analyzer across case documents.

**Features:**
- Runs `evidenceChainTracker.analyzeEvidenceChain(caseDocTexts)` using the LLM
- Shows each piece of evidence and its logical connections to related evidence
- Identifies gaps or weaknesses in the evidence chain
- Cached per-case in `useCaseStore.setEvidenceChainReport()`

---

## 12. MissingDocsScreen

**File:** `src/screens/MissingDocsScreen.jsx` (11.5 KB)

**Purpose:** Detects which critical documents are absent from a case.

**Features:**
- Runs `missingDocDetector.detectMissingDocuments(caseDocTexts, caseType)` using the LLM
- Lists missing document categories with importance level (Critical / Important / Optional)
- Context-aware by case type (Criminal / Civil / Contract / etc.)
- Cached per-case in `useCaseStore.setMissingDocsReport()`

---

## 13. HearingPrepScreen

**File:** `src/screens/HearingPrepScreen.jsx` (16.8 KB)

**Purpose:** Generates a structured hearing preparation brief.

**Features:**
- Runs `hearingPrep.generateHearingBrief(caseDocTexts, nextHearingDate)` using the LLM
- Brief includes: key arguments, supporting evidence, anticipated counterarguments, procedural checklist
- Hearing date shown at top
- Cached per-case in `useCaseStore.setHearingBrief()`

---

## 14. OpponentPredictorScreen

**File:** `src/screens/OpponentPredictorScreen.jsx` (12.9 KB)

**Purpose:** Predicts likely opponent arguments for a given case.

**Features:**
- Runs `opponentPredictor.predictOpponentArguments(caseDocTexts, caseType, perspective)` using the LLM
- Displays predicted arguments ranked by likelihood
- Suggests counter-strategy for each predicted argument
- Cached per-case in `useCaseStore.setOpponentPrediction()`

---

## 15. ClientQuestionsScreen

**File:** `src/screens/ClientQuestionsScreen.jsx` (9.6 KB)

**Purpose:** Auto-generates client interview questions from case documents.

**Features:**
- Runs `clientQuestionGenerator.generateClientQuestions(caseDocTexts, caseType)` using the LLM
- Generates categorized questions: Factual, Procedural, Evidence, Witness, Financial
- Displays questions in a checklist format
- Cached per-case in `useCaseStore.setClientQuestions()`

---

## 16. DraftGeneratorScreen

**File:** `src/screens/DraftGeneratorScreen.jsx` (11.0 KB)

**Purpose:** Generates draft legal documents from Indian legal templates.

**Features:**
- Runs `draftGenerator.generateDraft(templateType, caseContext)` using the LLM
- Template types: Legal Notice, Reply to Notice, Bail Application, Petition, Affidavit, Plaint, Written Statement
- Accepts custom parameters per template type
- Streaming output with copy-to-clipboard

---

## 17. SectionExtractorScreen

**File:** `src/screens/SectionExtractorScreen.jsx` (14.8 KB)

**Purpose:** Identifies and explains Indian legal sections cited in documents.

**Features:**
- Runs `sectionExtractor.extractSections(docText, caseType)` using the LLM
- Extracts cited sections: IPC/BNS sections, CrPC/BNSS, CPC, Evidence Act, Constitution articles
- For each section: section number, act name, plain-text description, applicability note
- Groups sections by act

---

## 18. RiskReportScreen

**File:** `src/screens/RiskReportScreen.jsx` (20.1 KB)

**Purpose:** Full legal risk audit report for a case.

**Features:**
- Runs `riskAnalyzer.analyzeRisk(caseDocTexts, caseType)` using the LLM
- Risk items with: description, severity (Critical/High/Medium/Low), category, recommendation
- Overall risk score (0–100)
- Grouped by risk category

---

## 19. StrategyScreen

**File:** `src/screens/StrategyScreen.jsx` (15.4 KB)

**Purpose:** Generates a legal strategy recommendation report.

**Features:**
- Runs `strategyGenerator.generateStrategy(caseDocTexts, caseType, perspective)` using the LLM
- Produces: recommended strategy, key strengths, weaknesses, immediate actions, long-term actions
- Perspective-aware (shifts framing based on defense / prosecution / plaintiff / etc.)

---

## 20. PerspectiveComparisonScreen

**File:** `src/screens/PerspectiveComparisonScreen.jsx` (15.2 KB)

**Purpose:** Side-by-side analysis of the same case from multiple legal perspectives.

**Features:**
- Runs `perspectiveComparison.comparePerspectives(caseDocTexts, caseType)` using the LLM
- Generates summaries for: Prosecution, Defense, Plaintiff, Defendant, Judge, Mediator perspectives
- Side-by-side card layout
- Shows key argument differences per perspective

---

## 21. BenchmarkScreen

**File:** `src/screens/BenchmarkScreen.jsx` (26.0 KB)

**Purpose:** In-app performance and recall evaluation tool for the local LLM.

**Features:**
- Runs benchmark questions against 54 real Indian legal documents
- Reports: recall@k scores, average BM25 retrieval scores, token/sec, latency
- Compares results across model versions
- Exports benchmark report as JSON

---

## 22. DebugRetrievalScreen

**File:** `src/screens/DebugRetrievalScreen.jsx` (11.1 KB)

**Purpose:** Developer diagnostic tool for BM25 retrieval debugging.

**Features:**
- Enter a query and a document text manually
- Shows top-K ranked chunks with their raw BM25 scores
- Displays token breakdown of each chunk
- Useful for tuning K1 and B parameters
