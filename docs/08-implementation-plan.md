# Implementation Plan — Phase 8–17 (Revised)

## Goal

Implement the remaining phases from the [analysis_results.md](file:///C:/Users/HP/.gemini/antigravity/brain/5d532570-9d3d-44ab-a2dc-e72b54b029e8/analysis_results.md) audit report. Each phase is broken into atomic commits that can be reviewed independently.

---

## Commit Strategy

Every logical unit of work gets its own commit. Format:

```
Phase X.Y Part Z: <short description>
```

- **Documentation Sync**: Any updates made to this `implementation_plan.md` must be mirrored by copying it to `docs/08-implementation-plan.md` to ensure the repository always has the latest roadmap.

---

## Proposed Changes

### ~~Phase 8 — Production Hardening (3 commits)~~ [Completed]
### ~~Phase 8.5 — Retrieval Quality Evaluation (1 commit)~~ [Completed]
### ~~Phase 8.6 — Hallucination Detection (1 commit)~~ [Completed]
### ~~Phase 8.7 — Source Citation Engine (1 commit)~~ [Completed]

---

### Phase 9 — Evaluation Framework (1 commit) [Completed]

##### [NEW] [src/evaluation/performanceBenchmark.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/evaluation/performanceBenchmark.ts)
- `measureModelLoadTime()` — times `initializeModel()` call
- `measureInferenceLatency(prompt)` — times a single completion, returns ms/token
- `measurePeakMemory()` — reads from Android `Debug.getNativeHeapAllocatedSize()`

##### [MODIFY] [src/evaluation/retrievalBenchmark.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/evaluation/retrievalBenchmark.ts)
- Add `runFullBenchmark()` orchestrator that runs all 50 questions, logs Recall@5/10, MRR, precision, latency, and memory

**Commit**: `Phase 9: Add performance benchmark harness for load time, latency, and memory`

---

### Phase 17 Part 1 — Encrypted Storage [Completed]

> [!IMPORTANT]
> Legal apps store affidavits, FIRs, contracts, and legal conversations. Encrypted storage must be in place before any further feature work.

##### [NEW] [src/services/secureStorage.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/secureStorage.ts)
- Wrapper around `react-native-encrypted-storage` or AES-encrypted AsyncStorage
- `secureSet(key, value)`, `secureGet(key)`, `secureDelete(key)`

##### [MODIFY] [storageService.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/storageService.ts)
- Migrate document metadata storage to use `secureStorage`

**Commit**: `Phase 17 Part 1: Add encrypted storage service for sensitive legal data`

---

### Phase 9.5 — Retrieval Debug Screen [Completed]

> [!NOTE]
> Without this screen, a bad answer could come from BM25 failure, context budget truncation, or model hallucination — and you won't know which. This screen eliminates that ambiguity.

##### [NEW] [src/screens/DebugRetrievalScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/DebugRetrievalScreen.tsx)
- Input: freeform question text field
- Document selector: pick from any indexed document
- Output table: top 10 BM25 results showing rank, chunk index, BM25 score, and expandable chunk text preview
- Accessible from Settings screen under a "Developer Tools" section (dev builds only)

**Commit**: `Phase 9.5: Add retrieval debug screen to diagnose BM25 vs model failures`

---

### Phase 9.6 — Model Comparison Benchmark [Completed]

##### [NEW] [src/evaluation/modelComparison.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/evaluation/modelComparison.ts)
- `runModelComparison(modelIds: string[]): Promise<ComparisonReport>`
- Runs benchmark prompts across all loaded models, collecting:
  - `loadTimeMs`, `tokensPerSecond`, `peakRamMb`, `hallucinationScore`, `accuracyScore`
- Renders comparison table in BenchmarkScreen's new "Compare Models" tab

**Commit**: `Phase 9.6: Add multi-model comparison benchmark with quality and perf metrics`

---

### Phase 11.5 — Conversation Memory [Completed]

##### [MODIFY] [useChatStore.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/store/useChatStore.ts)
- Retrieve last 10 messages (5 exchanges) and pass as history to `generateResponse()`

##### [MODIFY] [llmService.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/llmService.ts)
- Accept optional `history: {role, content}[]` parameter in `generateResponse()`
- Prepend history messages before the current user message in the ChatML messages array

**Commit**: `Phase 11.5: Add conversation memory with 5-exchange history buffer`

---

### Phase 13 — Legal Audit & Risk Analyzer *(2 commits)*

> [!NOTE]
> **This is the phase that completes the Legal Audit Report.** After Phase 13 Part 2, the app can analyze any uploaded legal document end-to-end for issues, risks, evidence quality, and missing clauses — with full confidence scores and recommended consultation questions.

#### Updated Scope — Four Additions to Phase 13

---

#### 13 Addition 1 — CaseType Dimension

Alongside `LegalPerspective`, **every analysis** must also accept a `CaseType`. The same perspective ("Accused") behaves fundamentally differently across case types:

```typescript
// src/types/caseType.ts
export type CaseType =
  | "criminal"
  | "civil"
  | "consumer"
  | "employment"
  | "property"
  | "family"
  | "contract"
  | "tax"
  | "constitutional"
  | "unknown";
```

The prompt injection becomes:

```
Perspective: Accused
Case Type: Criminal

Focus on:
- burden of proof on prosecution
- procedural defects in FIR/charge sheet
- admissibility of evidence
- available defenses under BNS
```

vs.

```
Perspective: Accused
Case Type: Consumer Complaint

Focus on:
- deficiency of service definition
- NCDRC jurisdiction limits
- available remedies under Consumer Protection Act 2019
```

This will improve answer quality more than switching between models.

##### [NEW] [src/types/caseType.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/types/caseType.ts)
- Define `CaseType` union type

##### [MODIFY] [src/types/legalPerspective.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/types/legalPerspective.ts)
- Export `CASE_TYPE_FOCUS_MAP` — maps each `CaseType` to the relevant legal focus points for prompt injection

##### [MODIFY] [useChatStore.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/store/useChatStore.ts)
- Add `selectedCaseType: CaseType` state (default: `'unknown'`)
- Add `setCaseType(c: CaseType): void` action
- Persist via Zustand's `persist` middleware

##### [MODIFY] [llmService.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/llmService.ts)
- Accept `caseType: CaseType` parameter alongside `perspective`
- Inject both into system prompt prefix

---

#### 13 Addition 2 — Evidence Analyzer

Current risk analyzer flags clause risks. Evidence quality is equally important for litigation.

```typescript
interface EvidenceReport {
  strongEvidence: EvidenceItem[];    // Signed agreements, filed FIRs, receipts
  weakEvidence: EvidenceItem[];      // Unsigned annexures, verbal references
  missingEvidence: string[];         // Payment receipts, witnesses, delivery proofs
  confidence: number;                // 0–100 confidence score on the evidence assessment
}
```

Output example:
```
Strong Evidence
  ✅ Signed employment agreement (Clause 3)
  ✅ Email correspondence dated 12 March

Weak Evidence
  ⚠️  Unsigned annexure B (not legally binding)
  ⚠️  Witness statement lacks corroboration

Missing Evidence
  ❌ Payment receipt
  ❌ Termination notice in writing
  ❌ Medical certificate (if applicable)

Evidence Confidence: 67%
```

##### [NEW] [src/services/evidenceAnalyzer.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/evidenceAnalyzer.ts)
- `analyzeEvidence(documentChunks[], perspective, caseType, onProgress?): Promise<EvidenceReport>`
- Prompts the LLM per chunk to classify mentions as strong/weak/missing evidence categories
- `confidence` is derived from the proportion of chunks with unambiguous evidence references

##### [MODIFY] [RiskReportScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/RiskReportScreen.tsx)
- Add **Evidence Analysis** tab/section below the Risk analysis output
- Color-coded: ✅ Strong (green), ⚠️ Weak (amber), ❌ Missing (red)

---

#### 13 Addition 3 — Confidence Score on All Outputs

**Every** analysis output — Risk, Evidence, Strategy, Comparison — must return and display a `confidence` score:

```typescript
confidence: number;   // 0–100
reason: string;       // Short explanation of why this confidence level was assigned
```

Display format:
```
Confidence: 82%
Reason: Document contains explicit termination clause and payment records.
```

Without a confidence score, users cannot distinguish a solid analysis from a weak one. Showing confidence stops users from over-trusting sparse documents.

This applies to:
- `RiskReport` → `confidence` field
- `EvidenceReport` → `confidence` field
- `LegalStrategy` → `confidence` field
- `ComparisonMatrix` → per-perspective `confidence` fields

---

#### 13 Addition 4 — Questions to Ask Lawyer

**Highest-value user-facing feature currently missing.** After every analysis, the system must generate a structured list of consultation-ready questions:

```
Questions to Discuss With a Lawyer

1. Is Clause 14 enforceable given the missing signature?
2. Can the limitation clause be challenged under Indian law?
3. Is the arbitration clause mandatory or optional?
4. Is there a jurisdiction conflict between Clause 6 and Clause 19?
5. What is the notice period required before termination?
```

This transforms the app from *"AI answers questions"* into *"AI helps prepare for legal consultation"* — which is significantly safer and more valuable for users who cannot afford to misunderstand AI responses as definitive legal advice.

```typescript
// Appended to every analysis result type
lawyerQuestions: string[];   // 4–6 specific questions derived from document content
```

##### [MODIFY] [src/services/riskAnalyzer.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/riskAnalyzer.ts)
- Append a final LLM call that generates `lawyerQuestions[]` after completing the risk pass

##### [MODIFY] [src/services/strategyGenerator.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/strategyGenerator.ts)
- Append `lawyerQuestions[]` to `LegalStrategy` output

##### [MODIFY] [src/screens/RiskReportScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/RiskReportScreen.tsx)
- Add **Questions to Ask a Lawyer** section at the bottom of the report
- Numbered list cards, each question individually copyable to clipboard

---

#### Part 1: Risk Analysis Service

##### [NEW] [src/services/riskAnalyzer.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/riskAnalyzer.ts)
- `analyzeRisk(documentChunks[], perspective, caseType, onProgress?): Promise<RiskReport>`
- **Chunk-by-Chunk Batch Analysis**: Iterates through all document chunks sequentially. Shows live progress indicator.
- **Checklist-guided Audit**: Cross-checks key legal provisions for unfavorable language.
- **Contradiction Detection**: Validates internal consistency across chunks (amounts, parties, dates).
- `confidence: number` on the RiskReport
- `lawyerQuestions: string[]` generated in a final LLM pass after risk scan

```typescript
interface RiskReport {
  highRisk: Clause[];
  mediumRisk: Clause[];
  missing: string[];
  recommendations: string[];
  confidence: number;          // Addition 3
  confidenceReason: string;    // Addition 3
  lawyerQuestions: string[];   // Addition 4
}
```

**Commit**: `Phase 13 Part 1: Add legal risk analysis service with chunk-by-chunk audit, confidence score, and lawyer questions`

#### Part 2: Risk Analysis + Evidence UI

##### [NEW] [RiskReportScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/RiskReportScreen.tsx)
- Progress bar and live status text during batch analysis
- Color-coded risk cards (red=high, amber=medium, green=low)
- **Evidence Analysis** section (Addition 2): Strong / Weak / Missing evidence with confidence
- **Confidence Score** banner at top of report (Addition 3)
- **Questions to Ask a Lawyer** section at bottom — numbered, copyable (Addition 4)
- CaseType selector (Addition 1) alongside PerspectiveSelector in the header

##### [MODIFY] [AppNavigator.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/navigation/AppNavigator.tsx)
- Register `RiskReportScreen` route

##### [MODIFY] [DocumentDetailsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/DocumentDetailsScreen.tsx)
- Add "⚖️ Analyze Document" action button that opens RiskReportScreen

**Commit**: `Phase 13 Part 2: Add legal audit risk report screen with evidence analyzer, confidence score, and lawyer questions`

---

### Phase 13.5 — Perspective-Aware Legal Analysis *(new)*

> [!NOTE]
> Lawyers rarely want neutral analysis. They want strategy for a specific role — plaintiff, defendant, tenant, employer. This phase transforms the app from a document reader into a legal strategy tool.

#### Legal Perspective Model

##### [NEW] [src/types/legalPerspective.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/types/legalPerspective.ts)
```typescript
export type LegalPerspective =
  | 'neutral'
  | 'plaintiff'
  | 'defendant'
  | 'complainant'
  | 'accused'
  | 'petitioner'
  | 'respondent'
  | 'employee'
  | 'employer'
  | 'tenant'
  | 'landlord'
  | 'consumer'
  | 'business';
```

#### Global Perspective + CaseType Store

##### [MODIFY] [useChatStore.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/store/useChatStore.ts)
- Add `selectedPerspective: LegalPerspective` (default: `'neutral'`)
- Add `selectedCaseType: CaseType` (default: `'unknown'`)
- Add `setPerspective()` and `setCaseType()` actions
- Persist via Zustand `persist` middleware

#### Perspective + CaseType Selector UI

##### [NEW] [src/components/PerspectiveSelector.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/components/PerspectiveSelector.tsx)
- Horizontal scrollable chip row for Perspective
- Secondary horizontal chip row for CaseType
- Both visible in: Chat Screen header, Document Details header, Risk Report screen header

#### Perspective-Aware Prompting

##### [MODIFY] [llmService.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/llmService.ts)
- Add `perspective: LegalPerspective` and `caseType: CaseType` parameters to `generateResponse()`, `answerQuestion()`, `generateSummary()`
- Inject combined system prompt prefix:

```
Perspective: Accused
Case Type: Criminal

Focus on:
- burden of proof on prosecution
- procedural defects in charge sheet
- admissibility of evidence
- available defenses under BNS
```

**Commit**: `Phase 13.5: Add perspective-aware legal analysis with CaseType + role selector and prompt injection`

---

### Phase 13.6 — Legal Strategy Generator *(new)*

##### [NEW] [src/services/strategyGenerator.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/strategyGenerator.ts)
- `generateStrategy(documentChunks[], perspective, caseType): Promise<LegalStrategy>`
- Returns structured output:
```typescript
interface LegalStrategy {
  strengths: string[];
  weaknesses: string[];
  evidenceNeeded: string[];
  possibleArguments: string[];
  recommendedActions: string[];
  confidence: number;          // Addition 3
  confidenceReason: string;    // Addition 3
  lawyerQuestions: string[];   // Addition 4
}
```

##### [NEW] [src/screens/StrategyScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/StrategyScreen.tsx)
- Accessible from DocumentDetailsScreen as "⚡ Generate Strategy" button
- Shows structured cards for each strategy section
- Confidence banner at top
- Questions to Ask Lawyer section at bottom

**Commit**: `Phase 13.6: Add perspective+caseType-aware legal strategy generator with confidence and lawyer questions`

---

### Phase 13.7 — Multi-Perspective Comparison *(new)*

> [!NOTE]
> Extremely useful for law students, junior lawyers, and legal research. Presents both sides of a legal dispute from a single document.

##### [NEW] [src/services/perspectiveComparison.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/perspectiveComparison.ts)
- `comparePerspecives(chunks[], perspectiveA, perspectiveB, caseType): Promise<ComparisonMatrix>`
- Runs strategy generation for two perspectives and merges into a comparison matrix
- Per-perspective `confidence` scores (Addition 3)

```
                  Plaintiff          Defendant
Strongest claim   Direct evidence    Witness gap
Key evidence      FIR copy           Medical report
Legal risk        LOW                MEDIUM
Confidence        78%                65%
```

##### [NEW] [src/screens/PerspectiveComparisonScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/PerspectiveComparisonScreen.tsx)
- Two-column comparison layout
- Perspective + CaseType picker for each column
- "Compare" button triggers analysis
- Confidence indicators per column (Addition 3)
- Shared "Questions to Ask a Lawyer" section at bottom (Addition 4)

**Commit**: `Phase 13.7: Add multi-perspective comparison screen with dual-side analysis and confidence scores`

---

### Phase 16 — Performance Dashboard (1 commit)

##### [NEW] [src/services/telemetry.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/telemetry.ts)
- Singleton tracking: `modelLoadTimeMs`, `lastInferenceTimeMs`, `tokensPerSecond`, `peakRamMb`
- Updated by modelManager and llmService after each operation
- Persists last session stats to AsyncStorage

##### [MODIFY] [SettingsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/SettingsScreen.tsx)
- Add new "Performance" card showing: Model Load Time, Last Inference Time, Tokens/sec, Peak RAM, Document Count, Total Chunks, Storage Used

**Commit**: `Phase 16: Add performance telemetry service and dashboard in Settings`

---

### ~~Phase 15 — Explain Like I'm Not a Lawyer~~ [DEFERRED — Lawyers don't need this]

> [!NOTE]
> Per user decision: lawyers work in legal language. ELI5 mode adds complexity with no value for the primary user. Permanently deferred.

---

### Phase 10.5 — Legal Corpus Infrastructure *(infrastructure only — no corpus ingestion yet)*

> [!IMPORTANT]
> Do NOT ingest actual law text yet. Citation system, benchmarks, and conversation memory must be proven stable first. A large corpus now creates more retrieval noise and harder debugging. When the corpus is ingested (Phase 10), use government gazette PDFs with auto-extraction — do not manually curate legal text.

##### [NEW] [assets/legal/](file:///d:/mobile-legal-ai-assistant/LegalAI/assets/legal/)
- Directory structure: `constitution/`, `bns/`, `bnss/`, `bsa/`, `cpc/`, `consumer_protection/`, `rti/`
- Each folder: `metadata.json` (title, sections, version) + placeholder `README.md`

##### [NEW] [src/services/corpusManager.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/corpusManager.ts)
- `listCorpusModules()` — lists available law modules
- `loadCorpusModule(moduleId)` — reads, chunks, and indexes a law module
- `searchCorpus(query, moduleIds[])` — BM25 search across loaded corpus chunks

**Commit**: `Phase 10.5: Set up legal corpus directory structure and manager service (no ingestion)`

---

### Phase 11 — Hybrid Retrieval *(optional download, not bundled)*

> [!IMPORTANT]
> Embedding models (e.g., `all-MiniLM-L6-v2`) add ~80–100 MB to the app. Must be an **optional download** — not bundled.

- Semantic embedding model offered as an optional in-app download (like the LLM model files)
- When downloaded, enables vector similarity search alongside BM25 for hybrid retrieval
- Falls back to BM25-only mode if not downloaded

---

### Phase 17 Part 2 — Privacy Controls UI

##### [MODIFY] [SettingsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/SettingsScreen.tsx)
- Add "Privacy & Security" card with:
  - "Local-Only Processing" toggle (informational — always on)
  - "Export All Data" button (creates a ZIP of documents)
  - "Delete All Data" button with double-confirmation (purges documents, chat history, model files)

**Commit**: `Phase 17 Part 2: Add privacy controls and data management to Settings`

---

### Phase 18 — Case File Workspace *(new — next to build)*

> [!IMPORTANT]
> This is the biggest structural omission. Lawyers work on **Cases**, not individual documents. A case folder groups all related documents, enabling cross-document analysis, timelines, and hearing prep. **Build this before Phase 16 — everything depends on it.**

```typescript
type CaseStatus =
  | 'consultation'
  | 'notice_sent'
  | 'filing'
  | 'pending'
  | 'evidence'
  | 'arguments'
  | 'disposed';

interface CaseFolder {
  id: string;
  title: string;              // e.g. "State vs Ramesh"
  caseNumber: string;
  court: string;
  judgeName?: string;         // Optional — updated as case progresses
  clientName: string;
  caseType: CaseType;
  status: CaseStatus;         // Current stage of the case
  nextHearingDate?: string;   // ISO date string — court date tracker
  documents: string[];        // docIds from useDocumentStore
  createdAt: number;
  updatedAt: number;
}
```

**Court Date Tracker** is included directly in `CaseFolder` — no AI needed. Shows `nextHearingDate`, `court`, and `judgeName` prominently in `CaseDetailsScreen`. Extremely practical for a daily-use lawyer app.

##### [NEW] [src/store/useCaseStore.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/store/useCaseStore.ts)
- CRUD: `createCase()`, `updateCase()`, `deleteCase()`, `addDocumentToCase()`, `removeDocumentFromCase()`
- `setCaseStatus(id, status)`, `setNextHearingDate(id, date)` actions
- Persisted via `secureStorage` backend

##### [NEW] [src/screens/CasesScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/CasesScreen.tsx)
- List of all case folders showing: title, status badge, next hearing date, document count
- Cases sorted by next hearing date (soonest first)
- "+ New Case" FAB with create form (title, case number, court, client, case type, status)

##### [NEW] [src/screens/CaseDetailsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/CaseDetailsScreen.tsx)
- Header: case title, status badge, next hearing date prominently displayed
- Court + judge name fields editable inline
- Attached documents list with quick-action links (Open, Audit, Strategy, Compare)
- Navigation hub: Timeline → Contradiction → Entity Tracker → Missing Docs → Hearing Prep → Draft → Section Extractor
- Case status can be updated with one tap

##### [MODIFY] [AppNavigator.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/navigation/AppNavigator.tsx)
- Register `Cases`, `CaseDetails` routes

##### [MODIFY] [HomeScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/HomeScreen.tsx)
- Add "Case Files" tile to the home navigation grid

**Commit**: `Phase 18: Add CaseFolder workspace with case store, case list, and case detail screens`

---

### Phase 19 — Timeline Generator *(new)*

> [!NOTE]
> Lawyers constantly build chronologies to identify contradictions. Upload FIR + Charge Sheet + Witness Statements → get a date-sorted timeline automatically.

##### [NEW] [src/services/timelineExtractor.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/timelineExtractor.ts)
- `extractTimeline(chunks[], perspective, caseType): Promise<TimelineEvent[]>`
- Per-chunk LLM scan: extract all dates + associated events from document text
- Deduplicates and sorts events chronologically
- Flags potential date contradictions between events from different documents

```typescript
interface TimelineEvent {
  date: string;          // ISO or human-readable
  event: string;         // What happened
  sourceDocId: string;   // Which document it came from
  chunkIndex: number;
  isContradiction?: boolean;
}
```

##### [NEW] [src/screens/TimelineScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/TimelineScreen.tsx)
- Vertical timeline card list sorted by date
- Source document badge per event
- Red highlight on contradiction events
- Accessible from CaseDetailsScreen and DocumentDetailsScreen

**Commit**: `Phase 19: Add timeline extractor service and timeline screen with contradiction flagging`

---

### Phase 20 — Contradiction Detector *(new)*

> [!NOTE]
> Lawyers manually compare witness statements for inconsistencies. This automates it.

##### [NEW] [src/services/contradictionDetector.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/contradictionDetector.ts)
- `detectContradictions(chunksA: string[], docNameA: string, chunksB: string[], docNameB: string): Promise<ContradictionReport>`
- Pairs important factual claims (dates, times, amounts, locations, persons) from both documents
- Prompts LLM to identify where the two documents conflict

```typescript
interface Contradiction {
  topic: string;           // What the conflict is about (e.g. "Time of incident")
  statementA: string;      // Quote or paraphrase from document A
  statementB: string;      // Quote or paraphrase from document B
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

##### [NEW] [src/screens/ContradictionScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/ContradictionScreen.tsx)
- Two-document picker (select Doc A and Doc B from case folder)
- Contradiction cards showing both conflicting statements side-by-side
- Severity badge (HIGH = red, MEDIUM = amber, LOW = yellow)
- Accessible from CaseDetailsScreen

**Commit**: `Phase 20: Add contradiction detector comparing two documents with severity-rated conflict cards`

---

### Phase 21 — Cross-Document Entity Tracker *(new)*

> [!NOTE]
> Once a case has multiple documents, manually tracking where "Ramesh Kumar" or "FIR No. 456" appears across files is extremely tedious. This automates entity discovery and cross-referencing.

##### [NEW] [src/services/entityTracker.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/entityTracker.ts)
- `extractEntities(chunks[], docId): Promise<Entity[]>` — runs per document
- `buildEntityIndex(caseId): Promise<EntityIndex>` — aggregates across all docs in a case
- Entity categories: `person`, `date`, `amount`, `address`, `phone`, `vehicle`, `caseNumber`, `section`

```typescript
interface Entity {
  value: string;         // "Ramesh Kumar"
  type: EntityType;
  appearances: { docId: string; chunkIndex: number }[];
}
```

##### [NEW] [src/screens/EntityTrackerScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/EntityTrackerScreen.tsx)
- Grouped list by entity type (People, Dates, Amounts, etc.)
- Tapping an entity shows which documents it appears in
- Accessible from CaseDetailsScreen

**Commit**: `Phase 21: Add cross-document entity tracker with per-case entity index and document cross-reference`

---

### Phase 22 — Missing Document Detector *(new)*

> [!NOTE]
> For a practicing lawyer, knowing which documents are missing from a case is more immediately useful than any LLM feature.

##### [NEW] [src/services/missingDocDetector.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/missingDocDetector.ts)
- `detectMissingDocuments(caseType: CaseType, uploadedDocTypes: string[]): MissingDocReport`
- Maintains a static checklist per `CaseType` of expected document types
- Compares against what has been uploaded and flags gaps

```typescript
// Example for Consumer case:
const CONSUMER_EXPECTED = [
  'Invoice / Bill', 'Warranty Card', 'Payment Receipt',
  'Service Request Copy', 'Complaint Letter', 'Company Reply'
];
```

##### [NEW] [src/screens/MissingDocsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/MissingDocsScreen.tsx)
- Shows ✅ Present and ❌ Missing document types for the case's CaseType
- Accessible from CaseDetailsScreen

**Commit**: `Phase 22: Add missing document detector with CaseType-specific document checklists`

---

### Phase 23 — Draft Generator Templates *(new)*

> [!NOTE]
> Not generic AI drafting — lawyer-specific structured templates. Huge time saver for a practicing lawyer.

##### [NEW] [src/services/draftGenerator.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/draftGenerator.ts)
- `generateDraft(templateType: DraftType, context: DraftContext): Promise<string>`
- Uses structured prompt templates per document type, not free-form generation

```typescript
type DraftType =
  | 'legal_notice'
  | 'consumer_complaint'
  | 'reply_notice'
  | 'rti_application'
  | 'affidavit'
  | 'bail_petition_skeleton'
  | 'written_statement_skeleton';

interface DraftContext {
  clientName: string;
  opponentName: string;
  caseType: CaseType;
  facts: string;       // User-entered key facts
  relief: string;      // Relief sought
}
```

##### [NEW] [src/screens/DraftGeneratorScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/DraftGeneratorScreen.tsx)
- Template picker (Legal Notice, Consumer Complaint, RTI, Affidavit, etc.)
- Simple form for context inputs (names, facts, relief)
- Generated draft displayed with copy-to-clipboard option
- Accessible from HomeScreen and CaseDetailsScreen

**Commit**: `Phase 23: Add draft generator with structured templates for Legal Notice, Consumer Complaint, RTI, Affidavit, and Bail Petition`

---

### Phase 24 — Hearing Preparation Mode *(daily-use — build before Draft Generator)*

> [!IMPORTANT]
> A lawyer uses hearing preparation every single working day. Consolidates the full case folder into a court-ready brief in one tap. Build this before Draft Generator.

##### [NEW] [src/services/hearingPrep.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/hearingPrep.ts)
- `prepareHearingBrief(caseId: string, perspective: LegalPerspective): Promise<HearingBrief>`
- Aggregates all document chunks from the case folder
- Single synthesis pass generating a structured brief:

```typescript
interface HearingBrief {
  keyFacts: string[];
  importantDates: TimelineEvent[];
  strongestArguments: string[];
  weakestPoints: string[];
  questionsOpponentMayAsk: string[];
  questionsCourtMayAsk: string[];
  documentsToCarry: string[];
  confidence: number;
}
```

##### [NEW] [src/screens/HearingPrepScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/HearingPrepScreen.tsx)
- Progress bar while scanning case documents
- Sectioned display: Key Facts → Dates → Arguments → Weak Points → Court Questions → Documents to Carry
- Full brief exportable to clipboard
- Accessible from CaseDetailsScreen as primary action

**Commit**: `Phase 24: Add hearing preparation mode with consolidated case brief and court question generator`

---

### Phase 24.5 — Opponent Argument Predictor *(new)*

> [!NOTE]
> Not win prediction. This predicts the **defensive arguments the opponent is likely to raise**, so the lawyer can prepare counterarguments in advance. Extremely valuable for litigation preparation.

##### [NEW] [src/services/opponentPredictor.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/opponentPredictor.ts)
- `predictOpponentArguments(chunks[], perspective, caseType): Promise<OpponentPrediction>`
- LLM is prompted from the **opposite** perspective to identify the strongest counterarguments
- Returns both likely defenses and suggested counterarguments

```typescript
interface OpponentArgument {
  argument: string;       // e.g. "Limitation period expired"
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  counterargument: string; // Suggested response
}

interface OpponentPrediction {
  likelyArguments: OpponentArgument[];
  overallStrategicRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
}
```

##### [NEW] [src/screens/OpponentPredictorScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/OpponentPredictorScreen.tsx)
- Shows predicted opponent arguments as cards with likelihood badges
- Each card expands to show suggested counterargument
- Accessible from CaseDetailsScreen and HearingPrepScreen

**Commit**: `Phase 24.5: Add opponent argument predictor with likelihood ratings and counterargument suggestions`

---

### Phase 24.6 — Questions for Client *(new)*

> [!NOTE]
> Lawyers constantly need to ask clients what evidence they have — receipts, WhatsApp chats, witnesses, notices. This generates a structured pre-meeting checklist automatically from the case type and document gaps.

##### [NEW] [src/services/clientQuestionGenerator.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/clientQuestionGenerator.ts)
- `generateClientQuestions(caseType, missingDocs?, riskReport?): ClientQuestionList`
- Combines static CaseType-specific question templates with dynamic gaps identified from risk/evidence analysis
- No LLM required for basic version — can be enhanced with LLM for case-specific questions

```typescript
interface ClientQuestion {
  question: string;       // e.g. "Do you have payment receipts?"
  category: 'evidence' | 'witness' | 'communication' | 'document' | 'procedural';
  priority: 'MUST_ASK' | 'IMPORTANT' | 'OPTIONAL';
}
```

##### [NEW] [src/screens/ClientQuestionsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/ClientQuestionsScreen.tsx)
- Grouped by category (Evidence, Witnesses, Communications, Documents)
- Priority-sorted: MUST ASK items at top in red
- Each question copyable individually or export full list to clipboard
- Accessible from CaseDetailsScreen and HearingPrepScreen

**Commit**: `Phase 24.6: Add client question generator for pre-consultation evidence checklist`

---

### Phase 25 — Section Extractor (Indian Law) *(new)*

> [!NOTE]
> Extracting all referenced legal sections (BNS, BNSS, BSA, CPC, etc.) is extremely useful for Indian legal practice. Once extracted, each section can be explained independently.

##### [NEW] [src/services/sectionExtractor.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/sectionExtractor.ts)
- `extractSections(chunks[]): Promise<LegalSection[]>`
- Regex + LLM hybrid approach: regex catches patterns like `Section 302 IPC`, `BNS 115`, `BNSS 173`
- LLM fills in context where sections are referenced indirectly
- `explainSection(section: string, caseType: CaseType): Promise<SectionExplanation>` — explains ingredients, burden, penalties

```typescript
interface LegalSection {
  code: string;          // "BNS 303", "BNSS 173"
  actName: string;       // "Bharatiya Nyaya Sanhita"
  description?: string;  // Short explanation
  chunkIndices: number[];
}
```

##### [NEW] [src/screens/SectionExtractorScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/SectionExtractorScreen.tsx)
- List of all extracted sections, grouped by Act
- Tap any section → see explanation, ingredients, burden of proof
- Accessible from DocumentDetailsScreen and CaseDetailsScreen

**Commit**: `Phase 25: Add Indian law section extractor with explanation and ingredient viewer`

---

### Phase 27 — Evidence Chain Tracker *(new)*

> [!NOTE]
> Integrates directly with Evidence Analyzer (Phase 13) and Hearing Preparation (Phase 24). For each key fact, the lawyer can see which supporting evidence exists, what is weak, and what is missing.

```
Fact: Payment was made
  ✅ Receipt (strong)
  ✅ Bank statement (strong)
  ⚠️  WhatsApp chat (weak — admissibility uncertain)
  ❌ Witness confirmation (missing)
```

##### [NEW] [src/services/evidenceChainTracker.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/evidenceChainTracker.ts)
- `buildEvidenceChain(chunks[], caseType, perspective): Promise<EvidenceChain[]>`
- LLM extracts key factual claims from the document, then maps each claim to supporting evidence items
- Integrates with `evidenceAnalyzer.ts` — re-uses strong/weak/missing classification

```typescript
interface EvidenceChain {
  fact: string;                // Key factual claim
  strongEvidence: string[];    // Supporting docs/items present
  weakEvidence: string[];      // Present but uncertain admissibility
  missingEvidence: string[];   // Gaps that need to be filled
  chainStrength: 'STRONG' | 'PARTIAL' | 'WEAK';
}
```

##### [NEW] [src/screens/EvidenceChainScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/EvidenceChainScreen.tsx)
- Card per key fact with ✅/⚠️/❌ evidence items listed below
- `chainStrength` badge on each card
- Accessible from CaseDetailsScreen and HearingPrepScreen

**Commit**: `Phase 27: Add evidence chain tracker linking key facts to supporting, weak, and missing evidence`

---

### Phase 26 — Precedent Architecture Placeholder *(architecture only — no search yet)*

> [!NOTE]
> Do not build case law search yet. Just design the data model and hook locations so it can be added cleanly later.

```
Case Analysis
    ↓
Relevant Sections (Phase 25)
    ↓
Future: Case Law Search (Phase 26+)
```

##### [NEW] [src/services/precedentService.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/precedentService.ts)
- Placeholder interface only — no implementation
- `searchPrecedents(sections: string[], caseType: CaseType): Promise<Precedent[]>` — stub returning empty array
- Hook points documented for future online/offline integration

```typescript
interface Precedent {
  caseName: string;
  court: string;
  year: number;
  sections: string[];
  summary: string;
  url?: string;
}
```

**Commit**: `Phase 26: Add precedent service architecture placeholder for future case law integration`

---

### Permanently Deferred — Not Planned

> [!CAUTION]
> The following features are **permanently deferred**. They are lower-value relative to the legal analysis pipeline and significantly increase complexity or regulatory risk:

| Feature | Reason for Deferral |
| :--- | :--- |
| ~~Voice Mode~~ | Requires `react-native-voice` + TTS. High complexity, marginal legal value vs. pipeline features |
| ~~Document Comparison~~ | Complex diffing. Low priority vs. evidence and strategy analysis |
| ~~Court Prediction~~ | Legally irresponsible. Creates false certainty for users |
| ~~Win Probability~~ | Legally irresponsible. Creates false certainty for users |
| ~~Judgment Prediction~~ | Legally irresponsible. Creates false certainty for users |

---

## Open Questions

> [!NOTE]
> **Phase 10 — Legal Corpus Ingestion**: When ready, use government gazette PDFs and auto-extract. Do NOT manually curate legal text — that becomes a maintenance nightmare and introduces transcription errors. Ingestion is deferred until Phase 10.5 infrastructure is proven stable.

> [!NOTE]
> **Phase 11 — Hybrid Retrieval**: **Deferred.** BM25 is sufficient for a single-lawyer app. Embedding models add ~80–100 MB, and the added complexity is not justified until BM25 retrieval is proven insufficient in practice. Revisit after Phase 26.

---

### Phase 19 — Timeline Generator

> [!NOTE]
> Lawyers rely heavily on chronological timelines to spot contradictions and understand the flow of events across multiple documents (e.g., FIRs, statements, notices).

##### [NEW] [src/services/timelineGenerator.ts](file:///d:/mobile-legal-ai-assistant/LegalAI/src/services/timelineGenerator.ts)
- `generateTimeline(documents: Document[], onProgress?: Function): Promise<TimelineEvent[]>`
- Iterates over all chunks of all provided documents.
- Prompts the LLM to extract any explicit or implicit dates and events in the format `{"date": "YYYY-MM-DD", "description": "...", "confidence": "High/Low"}`.
- Aggregates all extracted events, normalizes date formats (or uses raw strings if exact date is unknown), and sorts them chronologically.
- Clears the native KV cache (`await context.clearCache()`) between chunks to prevent memory overflow during multi-document parsing.

##### [NEW] [src/screens/TimelineScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/TimelineScreen.tsx)
- UI: A vertical chronological timeline interface (similar to a feed).
- Fetches all documents linked to the current `CaseFolder`.
- Displays a real-time progress bar while analyzing chunks across multiple documents.
- Each event card displays: Date, Event Description, Source Document Name, and Confidence Badge.

##### [MODIFY] [src/navigation/AppNavigator.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/navigation/AppNavigator.tsx)
- Register `Timeline` route accepting `caseId`.

##### [MODIFY] [src/screens/CaseDetailsScreen.tsx](file:///d:/mobile-legal-ai-assistant/LegalAI/src/screens/CaseDetailsScreen.tsx)
- Enable the "Timeline" button in the Workspace Tools hub (change `enabled: false` to `true`).
- Navigate to `Timeline` passing `caseId`.

---

## Verification Plan

### After Each Commit
- Run `npx tsc --noEmit` — must pass with zero errors
- Run `.\gradlew compileDebugKotlin` (for native changes)

### After All Phases
- Build and deploy to emulator: `npm run android`
- Manual verification of each feature on device
- Run model comparison benchmark (Phase 9.6) across all 3 model options

### Automated Tests
- Retrieval benchmark: `retrievalBenchmark.ts` runs offline (no model needed)
- Performance benchmark: requires loaded model on emulator
- Model comparison: `modelComparison.ts` requires all 3 models loaded

---

## Execution Order

| Order | Phase | Description | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
| ~~–~~ | ~~Docs Update~~ | ~~Documentation~~ | ~~Low~~ | ✅ Done |
| ~~1~~ | ~~Phase 8 (Parts 1–3)~~ | ~~Production Hardening~~ | ~~Critical~~ | ✅ Done |
| ~~2~~ | ~~Phase 8.5~~ | ~~Retrieval Evaluation~~ | ~~High~~ | ✅ Done |
| ~~3~~ | ~~Phase 8.6~~ | ~~Hallucination Detection~~ | ~~High~~ | ✅ Done |
| ~~4~~ | ~~Phase 8.7~~ | ~~Source Citation Engine~~ | ~~High~~ | ✅ Done |
| ~~5~~ | ~~Phase 9~~ | ~~Performance Benchmark Framework~~ | ~~High~~ | ✅ Done |
| ~~6~~ | ~~Phase 17 Part 1~~ | ~~Encrypted Storage *(security first)*~~ | ~~**Critical**~~ | ✅ Done |
| ~~7~~ | ~~Phase 9.5~~ | ~~Retrieval Debug Screen~~ | ~~High~~ | ✅ Done |
| ~~8~~ | ~~Phase 9.6~~ | ~~Model Comparison Benchmark~~ | ~~High~~ | ✅ Done |
| ~~9~~ | ~~Phase 11.5~~ | ~~Conversation Memory~~ | ~~Medium~~ | ✅ Done |
| ~~10~~ | ~~Phase 13 (Parts 1–2)~~ | ~~**Legal Audit + Risk + Evidence Analyzer** ✅ *Legal Audit complete here*~~ | ~~**Critical**~~ | ✅ Done |
| ~~11~~ | ~~Phase 13.5~~ | ~~Perspective-Aware Analysis + CaseType Selector~~ | ~~High~~ | ✅ Done |
| ~~12~~ | ~~Phase 13.6~~ | ~~Legal Strategy Generator + Confidence + Lawyer Questions~~ | ~~High~~ | ✅ Done |
| ~~13~~ | ~~Phase 13.7~~ | ~~Multi-Perspective Comparison~~ | ~~Medium~~ | ✅ Done |
| ~~14~~ | ~~Phase 18~~ | ~~**Case File Workspace + CaseStatus + Court Date Tracker**~~ | ~~**Critical**~~ | ✅ Done |
| 15 | **Phase 19** | **Timeline Generator** | **High** | 🔲 Next |
| 16 | **Phase 20** | **Contradiction Detector** | **High** | 🔲 |
| 17 | **Phase 21** | **Cross-Document Entity Tracker** | **High** | 🔲 |
| 18 | **Phase 22** | **Missing Document Detector** | **High** | 🔲 |
| 19 | **Phase 24** | **Hearing Preparation Mode** | **Critical** | 🔲 |
| 20 | **Phase 24.5** | **Opponent Argument Predictor** | **High** | 🔲 |
| 21 | **Phase 24.6** | **Questions for Client** | **High** | 🔲 |
| 22 | **Phase 23** | **Draft Generator Templates** | **High** | 🔲 |
| 23 | **Phase 25** | **Section Extractor (Indian Law)** | **High** | 🔲 |
| 24 | **Phase 10.5** | **Corpus Infrastructure (no ingestion)** | Medium | 🔲 |
| 25 | **Phase 17 Part 2** | **Privacy Controls UI** | Medium | 🔲 |
| 26 | **Phase 16** | **Performance Dashboard** | Medium | 🔲 |
| 27 | **Phase 26** | **Precedent Architecture Placeholder** | Low | 🔲 |
| 28 | **Phase 27** | **Evidence Chain Tracker** | **High** | 🔲 |
| 29 | Phase 11 | Hybrid Retrieval *(optional — much later)* | Low | 🔲 |
| ~~V2~~  | ~~Phase 12~~ | ~~Voice Mode~~ | ~~Deferred~~ | ⛔ Dropped |
| ~~V2~~ | ~~Phase 14~~ | ~~Document Comparison~~ | ~~Deferred~~ | ⛔ Dropped |
| ~~V2~~ | ~~Phase 15~~ | ~~ELI5 Plain English Mode~~ | ~~Deferred~~ | ⛔ Dropped |
| — | Court/Win/Judgment Prediction | AI prediction of case outcomes | — | ⛔ Never |
| | | **15 remaining** | | |
