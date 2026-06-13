# Implementation Plan — Phase 20–26 (Revised Execution Order)

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
| 1 | **Phase 20** | Contradiction Detector | High |
| 2 | **Phase 21** | Cross-Document Entity Tracker | High |
| 3 | **Phase 22** | Missing Document Detector | High |
| 4 | **Phase 24** | Hearing Preparation Mode | Critical |
| 5 | **Phase 24.5** | Opponent Argument Predictor | High |
| 6 | **Phase 24.6** | Questions for Client | High |
| 7 | **Phase 23** | Draft Generator Templates | High |
| 8 | **Phase 25** | Section Extractor (Indian Law) | High |
| 9 | **Phase 10.5** | Legal Corpus Infrastructure (no ingestion) | Medium |
| 10 | **Phase 17 Part 2** | Privacy Controls UI | Medium |
| 11 | **Phase 16** | Performance Dashboard | Medium |
| 12 | **Phase 26** | Precedent Architecture Placeholder | Low |
| — | Phase 11 | Hybrid Retrieval | Deferred |

---

## Phase 20 — Contradiction Detector

**Commit:** `Phase 20: Add contradiction detector comparing two documents with severity-rated conflict cards`

### New Files

#### `src/services/contradictionDetector.ts`

```typescript
interface Contradiction {
  topic: string;           // e.g. "Time of incident"
  statementA: string;      // Quote or paraphrase from document A
  statementB: string;      // Quote or paraphrase from document B
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ContradictionReport {
  contradictions: Contradiction[];
  confidence: number;      // 0–100
}
```

- `detectContradictions(chunksA, docNameA, chunksB, docNameB): Promise<ContradictionReport>`
- Prompts LLM to identify factual conflicts on dates, amounts, parties, and locations between two doc sets

#### `src/screens/ContradictionScreen.tsx`

- Two-document picker (from case folder's linked docs)
- Contradiction cards: side-by-side statements, severity badge (HIGH = red, MEDIUM = amber, LOW = yellow)
- Progress bar during analysis
- Accessible from `CaseDetailsScreen` — unlocks the "Contradictions ⚠️" tool card

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `Contradiction: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Contradictions" tool card to navigate to `ContradictionScreen` |

---

## Phase 21 — Cross-Document Entity Tracker

**Commit:** `Phase 21: Add cross-document entity tracker with per-case entity index and document cross-reference`

### New Files

#### `src/services/entityTracker.ts`

```typescript
type EntityType = 'person' | 'date' | 'amount' | 'address' | 'phone' | 'vehicle' | 'caseNumber' | 'section';

interface Entity {
  value: string;         // "Ramesh Kumar"
  type: EntityType;
  appearances: { docId: string; chunkIndex: number }[];
}

type EntityIndex = Entity[];
```

- `extractEntities(chunks[], docId): Promise<Entity[]>` — runs per document
- `buildEntityIndex(caseId): Promise<EntityIndex>` — aggregates across all docs in a case

#### `src/screens/EntityTrackerScreen.tsx`

- Grouped list by entity type (People, Dates, Amounts, Case Numbers, etc.)
- Tapping an entity shows which documents it appears in, with chunk preview
- Progress indicator while scanning docs
- Accessible from `CaseDetailsScreen` — unlocks "Entity Tracker 👥" tool card

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `EntityTracker: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Entity Tracker" tool card to navigate to `EntityTrackerScreen` |

---

## Phase 22 — Missing Document Detector

**Commit:** `Phase 22: Add missing document detector with CaseType-specific document checklists`

### New Files

#### `src/services/missingDocDetector.ts`

Static checklists per `CaseType`:

| CaseType | Expected Documents |
|---|---|
| `criminal` | FIR, Charge Sheet, Bail Order, Witness Statements, Medical Report, FSL Report |
| `civil` | Plaint, Written Statement, Replication, Issues Framed, Evidence Affidavit |
| `consumer` | Invoice/Bill, Payment Receipt, Warranty Card, Complaint Letter, Company Reply |
| `employment` | Employment Contract, Termination Letter, Salary Slips, EPFO Records |
| `property` | Sale Deed, Encumbrance Certificate, Title Documents, Khata/Patta |
| `family` | Marriage Certificate, Income Proof, Bank Statements |
| `contract` | Original Agreement, Addendum/Amendments, Correspondence |
| `tax` | Assessment Order, Notice, Return Copy, Challan |
| `rti` | Application Copy, First Appeal, Second Appeal, CIC Order |

- `detectMissingDocuments(caseType, uploadedDocTypes): MissingDocReport`
- Compares against docs actually present (by filename heuristic + LLM classification)

#### `src/screens/MissingDocsScreen.tsx`

- Shows ✅ Present / ❌ Missing document types per the case's `CaseType`
- Summary count: "4 of 6 required documents present"
- Accessible from `CaseDetailsScreen` — unlocks "Missing Docs 📂" tool card

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `MissingDocs: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Missing Docs" tool card to navigate to `MissingDocsScreen` |

---

## Phase 24 — Hearing Preparation Mode

**Commit:** `Phase 24: Add hearing preparation mode with consolidated case brief and court question generator`

### New Files

#### `src/services/hearingPrep.ts`

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

- `prepareHearingBrief(caseId, perspective): Promise<HearingBrief>`
- Aggregates all document chunks from the case folder
- Single LLM synthesis pass generating a structured brief

#### `src/screens/HearingPrepScreen.tsx`

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

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `HearingPrep: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Hearing Prep" tool card to navigate to `HearingPrepScreen` |

---

## Phase 24.5 — Opponent Argument Predictor

**Commit:** `Phase 24.5: Add opponent argument predictor with likely defense and counterarguments`

> Not win probability. Just "what will they argue?" — a standard litigation prep step. Safe, useful, and non-predictive.

### New Files

#### `src/services/opponentPredictor.ts`

```typescript
interface OpponentReport {
  likelyArguments: string[];      // What the opponent will likely argue
  counterarguments: string[];     // How to counter each
  vulnerabilities: string[];      // Weaknesses in own position to prepare for
  confidence: number;
}
```

- `predictOpponentArguments(chunks[], perspective, caseType): Promise<OpponentReport>`

#### `src/screens/OpponentPredictorScreen.tsx`

- Two sections: "Likely Defense Arguments" and "Your Counterarguments"
- Uses `PerspectiveSelector` + `CaseType` from the case folder
- Accessible from `CaseDetailsScreen` — unlocks "Opponent Predictor 🎯" tool card

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `OpponentPredictor: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Opponent Predictor" tool card to navigate to `OpponentPredictorScreen` |

---

## Phase 24.6 — Questions for Client

**Commit:** `Phase 24.6: Add client question generator based on document gaps and case type`

### New Files

#### `src/services/clientQuestionGenerator.ts`

```typescript
interface ClientQuestions {
  questions: string[];       // e.g. "Do you have the payment receipt?"
  evidenceNeeded: string[];  // Documents/evidence to obtain
  urgentItems: string[];     // Time-sensitive items to act on
}
```

- `generateClientQuestions(chunks[], caseType, missingDocs[]): Promise<ClientQuestions>`
- Combines doc gap analysis with LLM to generate specific, factual client-interview questions
- Questions are tailored to `CaseType`:
  - Criminal → witnesses, bail status, call records, medical examination
  - Consumer → receipts, warranty, delivery proof, company reply
  - Employment → offer letter, salary slips, exit interviews, PF records

#### `src/screens/ClientQuestionsScreen.tsx`

- Numbered question list, each individually copyable to clipboard
- "Evidence Needed" section (what to collect before next meeting)
- "Urgent Items" section (items with deadlines or expiry)
- Accessible from `CaseDetailsScreen` — unlocks "Client Questions ❓" tool card

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `ClientQuestions: { caseId: string; caseTitle: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Client Questions" tool card to navigate to `ClientQuestionsScreen` |

---

## Phase 23 — Draft Generator Templates

**Commit:** `Phase 23: Add draft generator with structured templates for Legal Notice, Consumer Complaint, RTI, Affidavit, and Bail Petition`

### New Files

#### `src/services/draftGenerator.ts`

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

- `generateDraft(templateType, context): Promise<string>`
- Structured prompt templates per type — not free-form generation
- Each template anchors the LLM to the correct Indian legal format and section references

#### `src/screens/DraftGeneratorScreen.tsx`

- Template picker (horizontal scrollable chip row)
- Simple form: Client Name, Opponent Name, Key Facts, Relief Sought
- "Generate Draft" button → full draft rendered in a scrollable view
- Copy-to-clipboard button for the full draft
- Accessible from `CaseDetailsScreen` (unlocks "Draft Notice 📝") and `HomeScreen` (new tile)

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `DraftGenerator: { caseId?: string }` route (optional caseId for pre-fill) |
| `CaseDetailsScreen.tsx` | Wire "Draft Notice" tool card to navigate to `DraftGeneratorScreen` |
| `HomeScreen.tsx` | Add "Draft Generator" tile to the home navigation grid |

---

## Phase 25 — Section Extractor (Indian Law)

**Commit:** `Phase 25: Add Indian law section extractor with explanation and ingredient viewer`

### New Files

#### `src/services/sectionExtractor.ts`

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

- `extractSections(chunks[]): Promise<LegalSection[]>`
- Regex patterns catch: `Section \d+[A-Z]? (IPC|CrPC|CPC|BNS|BNSS|BSA|MV Act|CP Act|RTI)`, `BNS \d+`, `BNSS \d+`
- LLM fills indirect references (e.g., "the provision dealing with murder")
- `explainSection(sectionCode, caseType): Promise<SectionExplanation>`

#### `src/screens/SectionExtractorScreen.tsx`

- List of all extracted sections, grouped by Act (BNS, BNSS, BSA, CPC, Consumer Protection, RTI)
- Tap any section → expandable card with ingredients, burden of proof, penalty, defenses
- Source document chip showing which document the section was found in
- Accessible from `CaseDetailsScreen` (unlocks "Indian Law Sections 📖") and `DocumentDetailsScreen`

### Modified Files

| File | Change |
|---|---|
| `AppNavigator.tsx` | Add `SectionExtractor: { caseId?: string; docId?: string }` route |
| `CaseDetailsScreen.tsx` | Wire "Indian Law Sections" tool card to navigate to `SectionExtractorScreen` |
| `DocumentDetailsScreen.tsx` | Add "📖 Extract Sections" button below existing action buttons |

---

## Phase 10.5 — Legal Corpus Infrastructure

**Commit:** `Phase 10.5: Set up legal corpus directory structure and manager service (no ingestion)`

> **Important:** No actual law text is ingested. This is directory structure + service interface only.
> Corpus ingestion happens in Phase 10 once retrieval is proven stable.
> When ready, use government gazette PDFs with auto-extraction — do NOT manually curate legal text.

### New Files

#### `assets/legal/` directory structure

```
assets/legal/
├── constitution/
│   ├── metadata.json     { title, sections, version, lastUpdated }
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

#### `src/services/corpusManager.ts`

- `listCorpusModules(): CorpusModule[]` — reads from `assets/legal/*/metadata.json`
- `loadCorpusModule(moduleId): Promise<DocumentChunk[]>` — reads, chunks, and indexes a law module
- `searchCorpus(query, moduleIds[]): BM25Result[]` — BM25 search across loaded corpus chunks
- `isModuleLoaded(moduleId): boolean`

---

## Phase 17 Part 2 — Privacy Controls UI

**Commit:** `Phase 17 Part 2: Add privacy controls and data management to Settings`

### Modified Files

#### `SettingsScreen.tsx`

Add **Privacy & Security** card between the Storage card and Benchmarks card:

| Control | Behavior |
|---|---|
| 🔒 Local-Only Processing | Informational toggle — always ON, cannot be disabled. Tooltip explains all AI runs on-device. |
| 📦 Export All Data | Creates a JSON export of document metadata + chat history (not model files) |
| 🗑️ Delete All Data | Double-confirmation dialog — user must type "DELETE" to confirm. Purges documents, chat history, case folders, model files. |

---

## Phase 16 — Performance Dashboard

**Commit:** `Phase 16: Add performance telemetry service and dashboard in Settings`

### New Files

#### `src/services/telemetry.ts`

```typescript
interface TelemetrySnapshot {
  modelLoadTimeMs: number;
  lastInferenceTimeMs: number;
  tokensPerSecond: number;
  peakRamMb: number;
}
```

- Singleton tracking updated by `modelManager` and `llmService` after each operation
- Persists last session stats to `AsyncStorage`
- `getTelemetry(): TelemetrySnapshot`
- `addTelemetryListener(cb: (snap: TelemetrySnapshot) => void): () => void`

### Modified Files

| File | Change |
|---|---|
| `modelManager.ts` | After `initializeModel()` completes, report `modelLoadTimeMs` to telemetry singleton |
| `llmService.ts` | After each `generateResponse()`, report `lastInferenceTimeMs` and `tokensPerSecond` |
| `SettingsScreen.tsx` | Add **Performance** card showing all 7 telemetry metrics |

Performance card metrics:

| Metric | Source |
|---|---|
| Model Load Time | `telemetry.modelLoadTimeMs` |
| Last Inference Time | `telemetry.lastInferenceTimeMs` |
| Tokens/sec | `telemetry.tokensPerSecond` |
| Peak RAM | `telemetry.peakRamMb` |
| Documents | `useDocumentStore` |
| Total Chunks | `useDocumentStore` |
| Storage Used | `useDocumentStore` |

---

## Phase 26 — Precedent Architecture Placeholder

**Commit:** `Phase 26: Add precedent service architecture placeholder for future case law integration`

### New Files

#### `src/services/precedentService.ts`

Interface-only — no implementation. Returns empty arrays.

```typescript
interface Precedent {
  caseName: string;
  court: string;
  year: number;
  sections: string[];
  summary: string;
  url?: string;
}

// TODO: Future integration with Indian Kanoon API or offline case law corpus
async function searchPrecedents(
  sections: string[],
  caseType: CaseType
): Promise<Precedent[]> {
  return []; // Stub — implementation deferred to Phase 26+
}
```

Hook points documented with `TODO` comments for future online/offline integration.

---

## AppNavigator Changes (Consolidated)

All new routes to add to `RootStackParamList` and register as `Stack.Screen`:

```typescript
Contradiction:      { caseId: string; caseTitle: string };
EntityTracker:      { caseId: string; caseTitle: string };
MissingDocs:        { caseId: string; caseTitle: string };
HearingPrep:        { caseId: string; caseTitle: string };
OpponentPredictor:  { caseId: string; caseTitle: string };
ClientQuestions:    { caseId: string; caseTitle: string };
DraftGenerator:     { caseId?: string };
SectionExtractor:   { caseId?: string; docId?: string };
```

---

## CaseDetailsScreen Tool Wiring (Consolidated)

All tool cards in the Workspace Tools hub and their target routes:

| Tool Card | Phase | Route | Status |
|---|---|---|---|
| Timeline 📅 | 19 | `Timeline` | ✅ Wired |
| Contradictions ⚠️ | 20 | `Contradiction` | 🔲 Next |
| Entity Tracker 👥 | 21 | `EntityTracker` | 🔲 |
| Missing Docs 📂 | 22 | `MissingDocs` | 🔲 |
| Hearing Prep ⚡ | 24 | `HearingPrep` | 🔲 |
| Opponent Predictor 🎯 | 24.5 | `OpponentPredictor` | 🔲 |
| Client Questions ❓ | 24.6 | `ClientQuestions` | 🔲 |
| Draft Notice 📝 | 23 | `DraftGenerator` | 🔲 |
| Indian Law Sections 📖 | 25 | `SectionExtractor` | 🔲 |
| Evidence Chain 🔗 | Deferred | — | ⛔ |

---

## Permanently Deferred

| Feature | Reason |
|---|---|
| Phase 11 — Hybrid Retrieval | BM25 sufficient for single-lawyer app. +80–100 MB optional download. Revisit post-production. |
| Phase 12 — Voice Mode | High complexity, marginal value for working lawyers |
| Phase 14 — Document Comparison | Low priority vs. evidence and strategy pipeline |
| Phase 15 — ELI5 Mode | Lawyers work in legal language — no value for primary user |
| Court/Win/Judgment Prediction | Legally irresponsible — permanently banned |

---

## Verification Plan

### After Each Commit

```powershell
npx tsc --noEmit
```

Zero TypeScript errors required before proceeding to the next commit.

### After All Phases

```powershell
npm run android
```

Manual verification on Android emulator for each feature.

### Key Manual Tests

| Test | Expected Outcome |
|---|---|
| Create case with 2+ docs → run Contradictions | Conflict cards render with severity badges |
| Run Entity Tracker on a case | Entities grouped by type (People, Dates, Amounts) |
| Select Criminal caseType → run Missing Docs | FIR, Charge Sheet listed as expected |
| Run Hearing Prep on a case | All 7 sections render, confidence banner visible |
| Generate a Legal Notice draft | Structured output renders, copy-to-clipboard works |
| Extract sections from IPC-referencing document | Sections grouped by Act, tap shows explanation |
| Open Settings → Performance card | Telemetry shows after one inference cycle |
| Open Settings → Privacy card | Delete All Data requires typing "DELETE" |
