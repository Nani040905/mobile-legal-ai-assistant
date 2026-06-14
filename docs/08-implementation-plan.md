# Implementation Plan — Phase 14–26 (Revised Execution Order)

## Current State Audit

Phases already fully implemented and committed:

| Phase | Description | Status |
|---|---|---|
| 8, 8.5, 8.6, 8.7 | Production hardening, retrieval eval, hallucination detection, citation engine | ✅ Done |
| 9, 9.5, 9.6 | Performance benchmark, retrieval debug screen, model comparison | ✅ Done |
| 11.5 | Conversation memory (5-exchange history buffer) | ✅ Done |
| 13, 13.5, 13.6, 13.7 | Risk analyzer, perspective-aware analysis, strategy generator, multi-perspective comparison | ✅ Done |
| 17 Part 1 | Encrypted storage (`secureStorage.ts`) | ✅ Done |
| 18 | Case Workspace — `useCaseStore`, `CasesScreen`, `CaseDetailsScreen` | ✅ Done |
| 19 | Timeline Generator + `TimelineScreen` | ✅ Done |

**Already in `useCaseStore.ts`:** `CaseStatus`, `nextHearingDate`, `judgeName`, `setNextHearingDate`, `setCaseStatus` — no changes needed.

**Already in `CaseDetailsScreen.tsx`:** Locked tool buttons for Contradictions, Entity Tracker, Missing Docs, Hearing Prep, Opponent Predictor, Client Questions, Draft Notice, Sections — these become the unlock targets.

**Already registered in `AppNavigator.tsx`:** Cases, CaseDetails, Timeline routes.

---

## Revised Execution Order

| # | Phase | Description | Priority |
|---|---|---|---|
| 1 | **Phase 19.5** | Docs Reader (Docx & Text Extractor) | High |
| 2 | **Phase 20** | Contradiction Detector | High |
| 3 | **Phase 21** | Cross-Document Entity Tracker | High |
| 4 | **Phase 22** | Missing Document Detector | High |
| 5 | **Phase 24** | Hearing Preparation Mode | Critical |
| 6 | **Phase 24.5** | Opponent Argument Predictor | High |
| 7 | **Phase 24.6** | Questions for Client | High |
| 8 | **Phase 23** | Draft Generator Templates | High |
| 9 | **Phase 25** | Section Extractor (Indian Law) | High |
| 10 | **Phase 10.5** | Legal Corpus Infrastructure (no ingestion) | Medium |
| 11 | **Phase 17 Part 2** | Privacy Controls UI | Medium |
| 12 | **Phase 16** | Performance Dashboard | Medium |
| 13 | **Phase 26** | Precedent Architecture Placeholder | Low |
| — | Phase 11 | Hybrid Retrieval | Deferred |

---

## Proposed Changes

### Phase 19.5 — Docs Reader (Docx & Text Extractor)
**Commit:** `Phase 19.5: Add docs reader to support offline DOCX and text extraction in native module and UI`

#### [MODIFY] `android/app/src/main/java/com/legalai/PdfExtractorModule.kt`
- Add native thread-safe XML parsing for `.docx` files by unpacking `word/document.xml` using `java.util.zip.ZipInputStream` and pattern matching `w:t` nodes inside paragraphs.
- Add native file-reader function for raw text `.txt` files.
- Expose `extractDocxText(fileUri, promise)` and `extractTxtText(fileUri, promise)` to React Native.

#### [MODIFY] `src/services/pdfService.ts`
- Update/rename module or add methods to detect extension (`.pdf`, `.docx`, `.txt`) and route to the corresponding native methods:
  - `.pdf` -> `PdfExtractor.extractText`
  - `.docx` -> `PdfExtractor.extractDocxText`
  - `.txt` -> `PdfExtractor.extractTxtText`

#### [MODIFY] `src/screens/DocumentsScreen.tsx`
- Expand `pick` file type filters to support Word documents and text files:
  - `type: [types.pdf, types.docx, types.plainText]`
- Map the fallback names correctly during the copy process to handle docx/txt naming.

---

### Phase 20 — Contradiction Detector
**Commit:** `Phase 20: Add contradiction detector comparing two documents with severity-rated conflict cards`

#### [NEW] `src/services/contradictionDetector.ts`
- `detectContradictions(chunksA, docNameA, chunksB, docNameB): Promise<ContradictionReport>`
- Prompts LLM to identify factual conflicts on dates, amounts, parties, locations between two doc sets
- `interface Contradiction { topic, statementA, statementB, severity: 'HIGH'|'MEDIUM'|'LOW' }`
- `interface ContradictionReport { contradictions: Contradiction[], confidence: number }`

#### [NEW] `src/screens/ContradictionScreen.tsx`
- Two-document picker (from case folder's linked docs)
- Contradiction cards: side-by-side statements, severity badge (HIGH=red, MEDIUM=amber, LOW=yellow)
- Progress bar during analysis
- Accessible from `CaseDetailsScreen` — unlocks the "Contradictions ⚠️" tool card

#### [MODIFY] `AppNavigator.tsx`
- Add `Contradiction: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Contradictions" tool card to navigate to `ContradictionScreen`

---

### Phase 21 — Cross-Document Entity Tracker
**Commit:** `Phase 21: Add cross-document entity tracker with per-case entity index and document cross-reference`

#### [NEW] `src/services/entityTracker.ts`
- `extractEntities(chunks[], docId): Promise<Entity[]>` — runs per document
- `buildEntityIndex(caseId): Promise<EntityIndex>` — aggregates across all docs
- Entity types: `person | date | amount | address | phone | vehicle | caseNumber | section`
- `interface Entity { value, type, appearances: { docId, chunkIndex }[] }`

#### [NEW] `src/screens/EntityTrackerScreen.tsx`
- Grouped list by entity type (People, Dates, Amounts, Case Numbers, etc.)
- Tapping an entity shows which documents it appears in, with chunk preview
- Progress indicator while scanning docs
- Accessible from `CaseDetailsScreen` — unlocks "Entity Tracker 👥" tool card

#### [MODIFY] `AppNavigator.tsx`
- Add `EntityTracker: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Entity Tracker" tool card to navigate to `EntityTrackerScreen`

---

### Phase 22 — Missing Document Detector
**Commit:** `Phase 22: Add missing document detector with CaseType-specific document checklists`

#### [NEW] `src/services/missingDocDetector.ts`
- `detectMissingDocuments(caseType, uploadedDocTypes): MissingDocReport`
- Static checklists per `CaseType`:
  - **Criminal:** FIR, Charge Sheet, Bail Order, Witness Statements, Medical Report, FSL Report
  - **Civil:** Plaint, Written Statement, Replication, Issues Framed, Evidence Affidavit
  - **Consumer:** Invoice/Bill, Payment Receipt, Warranty Card, Complaint Letter, Company Reply
  - **Employment:** Employment Contract, Termination Letter, Salary Slips, EPFO Records
  - **Property:** Sale Deed, Encumbrance Certificate, Title Documents, Khata/Patta
  - **Family:** Marriage Certificate, Income Proof, Bank Statements
  - **Contract:** Original Agreement, Addendum/Amendments, Correspondence
  - **RTI:** Application Copy, First Appeal, Second Appeal, CIC Order
- Compares against docs actually present (by filename heuristic + LLM classification)

#### [NEW] `src/screens/MissingDocsScreen.tsx`
- Shows ✅ Present / ❌ Missing document types per the case's `CaseType`
- Summary count: "4 of 6 required documents present"
- Accessible from `CaseDetailsScreen` — unlocks "Missing Docs 📂" tool card

#### [MODIFY] `AppNavigator.tsx`
- Add `MissingDocs: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Missing Docs" tool card to navigate to `MissingDocsScreen`

---

### Phase 24 — Hearing Preparation Mode
**Commit:** `Phase 24: Add hearing preparation mode with consolidated case brief and court question generator`

#### [NEW] `src/services/hearingPrep.ts`
- `prepareHearingBrief(caseId, perspective): Promise<HearingBrief>`
- Aggregates all document chunks from the case folder
- Single LLM synthesis pass:

```typescript
interface HearingBrief {
  keyFacts: string[];
  importantDates: { date: string; event: string }[];
  strongestArguments: string[];
  weakestPoints: string[];
  questionsOpponentMayAsk: string[];
  questionsCourtMayAsk: string[];
  documentsToCarry: string[];
  confidence: number;
}
```

#### [NEW] `src/screens/HearingPrepScreen.tsx`
- Progress bar while scanning all case documents
- Sectioned display:
  - 🗝️ Key Facts
  - 📅 Important Dates
  - ⚡ Strongest Arguments
  - ⚠️ Weakest Points
  - 🎯 Questions Opponent May Ask
  - ⚖️ Questions Court May Ask
  - 📄 Documents to Carry
- Confidence banner at top
- Full brief copyable to clipboard
- Accessible from `CaseDetailsScreen` — unlocks "Hearing Prep ⚡" tool card (primary action)

#### [MODIFY] `AppNavigator.tsx`
- Add `HearingPrep: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Hearing Prep" tool card to navigate to `HearingPrepScreen`

---

### Phase 24.5 — Opponent Argument Predictor
**Commit:** `Phase 24.5: Add opponent argument predictor with likely defense and counterarguments`

> [!NOTE]
> Not win probability. Just "what will they argue?" — a standard litigation prep step. Safe, useful, and non-predictive.

#### [NEW] `src/services/opponentPredictor.ts`
- `predictOpponentArguments(chunks[], perspective, caseType): Promise<OpponentReport>`

```typescript
interface OpponentReport {
  likelyArguments: string[];      // What the opponent will likely argue
  counterarguments: string[];     // How to counter each
  vulnerabilities: string[];      // Weaknesses in own position to prepare for
  confidence: number;
}
```

#### [NEW] `src/screens/OpponentPredictorScreen.tsx`
- Two sections: "Likely Defense Arguments" and "Your Counterarguments"
- Uses `PerspectiveSelector` + `CaseType` from the case folder
- Accessible from `CaseDetailsScreen` — unlocks "Opponent Predictor 🎯" tool card

#### [MODIFY] `AppNavigator.tsx`
- Add `OpponentPredictor: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Opponent Predictor" tool card to navigate to `OpponentPredictorScreen`

---

### Phase 24.6 — Questions for Client
**Commit:** `Phase 24.6: Add client question generator based on document gaps and case type`

#### [NEW] `src/services/clientQuestionGenerator.ts`
- `generateClientQuestions(chunks[], caseType, missingDocs[]): Promise<ClientQuestions>`

```typescript
interface ClientQuestions {
  questions: string[];      // e.g. "Do you have the payment receipt?"
  evidenceNeeded: string[]; // Documents/evidence to obtain
  urgentItems: string[];    // Time-sensitive items to act on
}
```
- Combines doc gap analysis with LLM to generate specific factual questions
- Questions are tailored to `CaseType` (criminal → witnesses, bail; consumer → receipts, warranty)

#### [NEW] `src/screens/ClientQuestionsScreen.tsx`
- Numbered question list, each individually copyable
- "Evidence Needed" section (what to collect before next meeting)
- "Urgent Items" section (items with deadlines)
- Accessible from `CaseDetailsScreen` — unlocks "Client Questions ❓" tool card

#### [MODIFY] `AppNavigator.tsx`
- Add `ClientQuestions: { caseId: string; caseTitle: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Client Questions" tool card to navigate to `ClientQuestionsScreen`

---

### Phase 23 — Draft Generator Templates
**Commit:** `Phase 23: Add draft generator with structured templates for Legal Notice, Consumer Complaint, RTI, Affidavit, and Bail Petition`

#### [NEW] `src/services/draftGenerator.ts`
- `generateDraft(templateType, context): Promise<string>`
- Structured prompt templates per type (not free-form):

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
  facts: string;
  relief: string;
}
```

#### [NEW] `src/screens/DraftGeneratorScreen.tsx`
- Template picker (scrollable chip row)
- Simple form: Client Name, Opponent Name, Key Facts, Relief Sought
- "Generate Draft" button → full draft rendered with copy-to-clipboard
- Accessible from `CaseDetailsScreen` — unlocks "Draft Notice 📝" tool card
- Also accessible from `HomeScreen` (add tile)

#### [MODIFY] `AppNavigator.tsx`
- Add `DraftGenerator: { caseId?: string }` route (optional caseId for context pre-fill)

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Draft Notice" tool card to navigate to `DraftGeneratorScreen`

#### [MODIFY] `HomeScreen.tsx`
- Add "Draft Generator" tile to the home navigation grid

---

### Phase 25 — Section Extractor (Indian Law)
**Commit:** `Phase 25: Add Indian law section extractor with explanation and ingredient viewer`

#### [NEW] `src/services/sectionExtractor.ts`
- `extractSections(chunks[]): Promise<LegalSection[]>`
- Regex patterns: `Section \d+[A-Z]? (IPC|CrPC|CPC|BNS|BNSS|BSA|IEA|BSA|MV Act|CP Act|RTI)`, `BNS \d+`, `BNSS \d+`
- LLM fills indirect references (e.g., "the provision dealing with murder")
- `explainSection(sectionCode, caseType): Promise<SectionExplanation>`
  - Explains ingredients, burden of proof, penalty, relevant defenses

```typescript
interface LegalSection {
  code: string;          // "BNS 303", "Section 420 IPC"
  actName: string;       // "Bharatiya Nyaya Sanhita"
  description?: string;
  chunkIndices: number[];
}

interface SectionExplanation {
  ingredients: string[];
  burden: string;
  penalty: string;
  defenses: string[];
  relatedSections: string[];
}
```

#### [NEW] `src/screens/SectionExtractorScreen.tsx`
- List of all extracted sections, grouped by Act (BNS, BNSS, BSA, CPC, Consumer Protection, RTI)
- Tap any section → expandable card showing explanation, ingredients, burden, penalty
- Source document chip showing which doc the section was found in
- Accessible from `CaseDetailsScreen` — unlocks "Indian Law Sections 📖" tool card
- Also accessible from `DocumentDetailsScreen`

#### [MODIFY] `AppNavigator.tsx`
- Add `SectionExtractor: { caseId?: string; docId?: string }` route

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Indian Law Sections" tool card to navigate to `SectionExtractorScreen`

#### [MODIFY] `DocumentDetailsScreen.tsx`
- Add "📖 Extract Sections" button below existing action buttons

---

### Phase 10.5 — Legal Corpus Infrastructure
**Commit:** `Phase 10.5: Set up legal corpus directory structure and manager service (no ingestion)`

> [!IMPORTANT]
> No actual law text is ingested. This is directory structure + service interface only. Corpus ingestion happens in Phase 10 once retrieval is proven stable.

#### [NEW] `assets/legal/` directory structure
```
assets/legal/
├── constitution/
│   ├── metadata.json   { title, sections, version, lastUpdated }
│   └── README.md
├── bns/
│   ├── metadata.json
│   └── README.md
├── bnss/
│   ├── metadata.json
│   └── README.md
├── bsa/
│   ├── metadata.json
│   └── README.md
├── cpc/
│   ├── metadata.json
│   └── README.md
├── consumer_protection/
│   ├── metadata.json
│   └── README.md
└── rti/
    ├── metadata.json
    └── README.md
```

#### [NEW] `src/services/corpusManager.ts`
- `listCorpusModules(): CorpusModule[]` — reads from `assets/legal/*/metadata.json`
- `loadCorpusModule(moduleId): Promise<DocumentChunk[]>` — reads, chunks, indexes a law module
- `searchCorpus(query, moduleIds[]): BM25Result[]` — BM25 search across loaded corpus chunks
- `isModuleLoaded(moduleId): boolean`

---

### Phase 17 Part 2 — Privacy Controls UI
**Commit:** `Phase 17 Part 2: Add privacy controls and data management to Settings`

#### [MODIFY] `SettingsScreen.tsx`
- Add **Privacy & Security** card between the Storage card and Benchmarks card:
  - `🔒 Local-Only Processing` — informational toggle (always ON, cannot be disabled — shows tooltip explaining all AI runs on-device)
  - `📦 Export All Data` — creates a JSON export of documents metadata + chat history (not model files)
  - `🗑️ Delete All Data` — double-confirmation dialog, purges documents, chat history, case folders, model files

> [!WARNING]
> "Delete All Data" is permanent and irreversible. The double-confirmation must require the user to type "DELETE" to confirm.

---

### Phase 16 — Performance Dashboard
**Commit:** `Phase 16: Add performance telemetry service and dashboard in Settings`

#### [NEW] `src/services/telemetry.ts`
- Singleton tracking: `modelLoadTimeMs`, `lastInferenceTimeMs`, `tokensPerSecond`, `peakRamMb`
- Updated by `modelManager` and `llmService` after each operation
- Persists last session stats to `AsyncStorage`
- `getTelemetry(): TelemetrySnapshot`
- `addTelemetryListener(cb): () => void`

#### [MODIFY] `src/services/modelManager.ts`
- After `initializeModel()` completes, report `modelLoadTimeMs` to telemetry singleton

#### [MODIFY] `src/services/llmService.ts`
- After each `generateResponse()` call, report `lastInferenceTimeMs` and `tokensPerSecond` to telemetry

#### [MODIFY] `SettingsScreen.tsx`
- Add **Performance** card (above Privacy card):
  - Model Load Time: `{modelLoadTimeMs} ms`
  - Last Inference Time: `{lastInferenceTimeMs} ms`
  - Tokens/sec: `{tokensPerSecond}`
  - Peak RAM: `{peakRamMb} MB`
  - Documents: `{documentCount}`
  - Total Chunks: `{totalChunks}` (from `useDocumentStore`)
  - Storage Used: `{totalDocSizeMB} MB`

---

### Phase 26 — Precedent Architecture Placeholder
**Commit:** `Phase 26: Add precedent service architecture placeholder for future case law integration`

#### [NEW] `src/services/precedentService.ts`
- Interface-only, no implementation
- `searchPrecedents(sections, caseType): Promise<Precedent[]>` → returns `[]`
- Hook points documented with `TODO` comments for future integration

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

---

## AppNavigator Changes (consolidated)

All new routes to add to `RootStackParamList` and register `Stack.Screen`:

```typescript
Contradiction: { caseId: string; caseTitle: string };
EntityTracker: { caseId: string; caseTitle: string };
MissingDocs: { caseId: string; caseTitle: string };
HearingPrep: { caseId: string; caseTitle: string };
OpponentPredictor: { caseId: string; caseTitle: string };
ClientQuestions: { caseId: string; caseTitle: string };
DraftGenerator: { caseId?: string };
SectionExtractor: { caseId?: string; docId?: string };
```

---

## CaseDetailsScreen Tool Wiring (consolidated)

All 8 locked tool cards become navigable when their phase is implemented:

| Tool Card | Phase | Destination Route |
|---|---|---|
| Timeline 📅 | ✅ Done | `Timeline` |
| Contradictions ⚠️ | Phase 20 | `Contradiction` |
| Entity Tracker 👥 | Phase 21 | `EntityTracker` |
| Missing Docs 📂 | Phase 22 | `MissingDocs` |
| Hearing Prep ⚡ | Phase 24 | `HearingPrep` |
| Opponent Predictor 🎯 | Phase 24.5 | `OpponentPredictor` |
| Client Questions ❓ | Phase 24.6 | `ClientQuestions` |
| Draft Notice 📝 | Phase 23 | `DraftGenerator` |
| Indian Law Sections 📖 | Phase 25 | `SectionExtractor` |
| Evidence Chain 🔗 | Deferred | — |

---

## Permanently Deferred

| Feature | Reason |
|---|---|
| Phase 11 — Hybrid Retrieval | BM25 sufficient for single-lawyer app. +80–100 MB. Revisit post-production. |
| Voice Mode | High complexity, marginal value |
| Document Comparison | Low priority |
| Court/Win/Judgment Prediction | Legally irresponsible — permanently banned |
| ELI5 Mode | Lawyers work in legal language — no value |

---

## Verification Plan

### After Each Commit
```powershell
npx tsc --noEmit
```
Zero errors required before proceeding to the next commit.

### After All Phases
```powershell
npm run android
```
Manual verification on emulator for each feature area.

### Key Manual Tests
- Upload a `.docx` file and a `.txt` file → verify successful text extraction, split into chunks, and summary generation
- Create a case with 2+ documents (e.g. one PDF, one DOCX) → run Contradictions → verify cards render
- Run Entity Tracker on a case → verify entities grouped by type
- Select Criminal caseType → run Missing Docs → verify FIR, Charge Sheet appear as expected
- Run Hearing Prep → verify all 7 sections render
- Generate a Legal Notice draft → verify structured output copies to clipboard
- Extract sections from a document with IPC references → verify grouped by Act
- Open Settings → verify Performance card shows telemetry after one inference
- Open Settings → verify Privacy card shows with Delete All Data requiring "DELETE" confirmation

---

## Proposed Changes Summary Table

| Phase | Target File | Action | Description |
|---|---|---|---|
| Phase 19.5 | [PdfExtractorModule.kt](file:///e:/mobile-legal-ai-assistant/LegalAI/android/app/src/main/java/com/legalai/PdfExtractorModule.kt) | [MODIFY] | Add native docx / txt extraction |
| Phase 19.5 | [pdfService.ts](file:///e:/mobile-legal-ai-assistant/LegalAI/src/services/pdfService.ts) | [MODIFY] | Add extension routing logic |
| Phase 19.5 | [DocumentsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/DocumentsScreen.tsx) | [MODIFY] | Allow docx/txt pick |
| Phase 20 | `src/services/contradictionDetector.ts` | [NEW] | Contradiction detection service |
| Phase 20 | `src/screens/ContradictionScreen.tsx` | [NEW] | Contradiction results UI |
| Phase 20 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 20 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 21 | `src/services/entityTracker.ts` | [NEW] | Entity extraction service |
| Phase 21 | `src/screens/EntityTrackerScreen.tsx` | [NEW] | Entity tracking results UI |
| Phase 21 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 21 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 22 | `src/services/missingDocDetector.ts` | [NEW] | Missing document checklist service |
| Phase 22 | `src/screens/MissingDocsScreen.tsx` | [NEW] | Missing doc status UI |
| Phase 22 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 22 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 24 | `src/services/hearingPrep.ts` | [NEW] | Hearing prep briefing service |
| Phase 24 | `src/screens/HearingPrepScreen.tsx` | [NEW] | Hearing prep synthesis UI |
| Phase 24 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 24 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 24.5 | `src/services/opponentPredictor.ts` | [NEW] | Opponent prediction service |
| Phase 24.5 | `src/screens/OpponentPredictorScreen.tsx` | [NEW] | Opponent prediction UI |
| Phase 24.5 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 24.5 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 24.6 | `src/services/clientQuestionGenerator.ts` | [NEW] | Client interview question generator service |
| Phase 24.6 | `src/screens/ClientQuestionsScreen.tsx` | [NEW] | Client questions UI |
| Phase 24.6 | `AppNavigator.tsx` | [MODIFY] | Add route |
| Phase 24.6 | `CaseDetailsScreen.tsx` | [MODIFY] | Wire tool button |
| Phase 23 | `src/services/draftGenerator.ts` | [NEW] | Notice templates and draft generator service |
| Phase 23 | `src/screens/DraftGeneratorScreen.tsx` | [NEW] | Draft editing and copying UI |
| Phase 23 | [AppNavigator.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/navigation/AppNavigator.tsx) | [MODIFY] | Add route |
| Phase 23 | [CaseDetailsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/CaseDetailsScreen.tsx) | [MODIFY] | Wire tool button |
| Phase 23 | [HomeScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/HomeScreen.tsx) | [MODIFY] | Add Home screen tile |
| Phase 25 | `src/services/sectionExtractor.ts` | [NEW] | Indian Law section extractor service |
| Phase 25 | `src/screens/SectionExtractorScreen.tsx` | [NEW] | Act/Section breakdown UI |
| Phase 25 | [AppNavigator.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/navigation/AppNavigator.tsx) | [MODIFY] | Add route |
| Phase 25 | [CaseDetailsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/CaseDetailsScreen.tsx) | [MODIFY] | Wire tool button |
| Phase 25 | [DocumentDetailsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/DocumentDetailsScreen.tsx) | [MODIFY] | Add Extract Sections button |
| Phase 10.5 | `assets/legal/` | [NEW] | Legal corpus file structure |
| Phase 10.5 | `src/services/corpusManager.ts` | [NEW] | Corpus loading and searching service |
| Phase 17 Part 2 | [SettingsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/SettingsScreen.tsx) | [MODIFY] | Add Local-only, Export, and permanent Delete |
| Phase 16 | `src/services/telemetry.ts` | [NEW] | Telemetry tracker service |
| Phase 16 | [modelManager.ts](file:///e:/mobile-legal-ai-assistant/LegalAI/src/services/modelManager.ts) | [MODIFY] | Log load latency |
| Phase 16 | [llmService.ts](file:///e:/mobile-legal-ai-assistant/LegalAI/src/services/llmService.ts) | [MODIFY] | Log generation metrics |
| Phase 16 | [SettingsScreen.tsx](file:///e:/mobile-legal-ai-assistant/LegalAI/src/screens/SettingsScreen.tsx) | [MODIFY] | Add Telemetry and statistics card |
| Phase 26 | `src/services/precedentService.ts` | [NEW] | Precedent search interface placeholder |
