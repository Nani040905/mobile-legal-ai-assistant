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
| 19.5 | Docs Reader (Docx & Text Extractor) | ✅ Done |

**Already in `useCaseStore.ts`:** `CaseStatus`, `nextHearingDate`, `judgeName`, `setNextHearingDate`, `setCaseStatus` — no changes needed.

**Already in `CaseDetailsScreen.tsx`:** Locked tool buttons for Contradictions, Entity Tracker, Missing Docs, Hearing Prep, Opponent Predictor, Client Questions, Draft Notice, Sections — these become the unlock targets.

**Already registered in `AppNavigator.tsx`:** Cases, CaseDetails, Timeline routes.

---

## Revised Execution Order

| # | Phase | Description | Priority |
|---|---|---|---|
| 1 | **Phase 18.5** | Case Notes & Tags (No AI) | High |
| 2 | **Phase 20** | Contradiction Detector (Whole Case) | High |
| 3 | **Phase 21** | Cross-Document Entity Tracker | High |
| 4 | **Phase 21.5** | Evidence Chain Tracker | High |
| 5 | **Phase 22** | Missing Document Detector | High |
| 6 | **Phase 24** | Hearing Preparation Mode (with Export & Judge Qs) | Critical |
| 7 | **Phase 24.5** | Opponent Argument Predictor | High |
| 8 | **Phase 24.6** | Questions for Client | High |
| 9 | **Phase 23** | Draft Generator Templates | High |
| 10 | **Phase 25** | Section Extractor (Indian Law & Common Mistakes) | High |
| 11 | **Phase 10.5** | Legal Corpus Infrastructure (no ingestion) | Medium |
| 12 | **Phase 17 Part 2** | Privacy Controls UI | Medium |
| 13 | **Phase 16** | Performance Dashboard | Medium |
| 14 | **Phase 26** | Precedent Architecture Placeholder | Low |
| — | Phase 11 | Hybrid Retrieval | Deferred |

---

## Proposed Changes

### Phase 18.5 — Case Notes & Tags (No AI)
**Commit:** `Phase 18.5: Add Case Notes and custom Case Tags to workspace without AI`

#### [MODIFY] `src/store/useCaseStore.ts`
- Update `CaseFolder` schema to support notes and tags:
  ```typescript
  export interface CaseNote {
    id: string;
    createdAt: string;
    text: string;
  }
  ```
  Add `notes: CaseNote[]` and `tags: string[]` to the `CaseFolder` interface.
- Add store actions:
  - `addCaseNote(caseId: string, text: string): void`
  - `deleteCaseNote(caseId: string, noteId: string): void`
  - `toggleCaseTag(caseId: string, tag: string): void`

#### [MODIFY] `src/screens/CasesScreen.tsx`
- Display active tags on case item cards in the main case list.
- Add tag filter buttons at the top of the list to filter cases by custom tags: `Urgent`, `Evidence Pending`, `Notice Sent`, `Draft Required`, `Ready for Filing`, `Hearing Tomorrow`.

#### [MODIFY] `src/screens/CaseDetailsScreen.tsx`
- Add a **Case Tags** selector row containing the 6 standardized tags as toggleable chips:
  - `Urgent` (Red), `Hearing Tomorrow` (Orange), `Evidence Pending` (Yellow), `Draft Required` (Blue), `Notice Sent` (Purple), `Ready for Filing` (Green)
- Add a **Case Notes** section at the bottom of the details scroll view:
  - Text input and "Add Note" button.
  - List of notes showing creation date/time, text content, and a delete (🗑️) button.

---

### Phase 20 — Contradiction Detector (Whole Case Comparison)
**Commit:** `Phase 20: Add contradiction detector performing whole-case scans across all linked documents`

#### [NEW] `src/services/contradictionDetector.ts`
- `detectContradictions(caseId: string, chunksByDoc: Record<string, string[]>): Promise<ContradictionReport>`
- Reads chunks across **all linked documents** in the case folder (e.g. FIR, Charge Sheet, Witness Statement, Medical Report) instead of comparing only two manually selected documents.
- Prompts LLM to compare facts, statements, dates, and names cross-document to find conflicts.
- `interface Contradiction { topic: string; statementA: string; docSourceA: string; statementB: string; docSourceB: string; severity: 'HIGH'|'MEDIUM'|'LOW' }`
- `interface ContradictionReport { contradictions: Contradiction[], confidence: number }`

#### [NEW] `src/screens/ContradictionScreen.tsx`
- Full-case contradiction scanner UI.
- Displays conflict cards with document source badges (e.g. "FIR vs. Witness Statement A"), severity color-coding, and explanation.
- Progress bar during analysis.
- Accessible from `CaseDetailsScreen` — unlocks the "Contradictions ⚠️" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `Contradiction: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Contradictions" tool card to navigate to `ContradictionScreen`.

---

### Phase 21 — Cross-Document Entity Tracker
**Commit:** `Phase 21: Add cross-document entity tracker with per-case entity index and document cross-reference`

#### [NEW] `src/services/entityTracker.ts`
- `extractEntities(chunks[], docId): Promise<Entity[]>` — runs per document.
- `buildEntityIndex(caseId): Promise<EntityIndex>` — aggregates across all docs.
- Entity types: `person | date | amount | address | phone | vehicle | caseNumber | section`.
- `interface Entity { value, type, appearances: { docId, chunkIndex }[] }`.

#### [NEW] `src/screens/EntityTrackerScreen.tsx`
- Grouped list by entity type (People, Dates, Amounts, Case Numbers, etc.).
- Tapping an entity shows which documents it appears in, with chunk preview.
- Progress indicator while scanning docs.
- Accessible from `CaseDetailsScreen` — unlocks "Entity Tracker 👥" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `EntityTracker: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Entity Tracker" tool card to navigate to `EntityTrackerScreen`.

---

### Phase 21.5 — Evidence Chain Tracker
**Commit:** `Phase 21.5: Add evidence chain tracker linking key facts to supporting and missing evidence`

#### [NEW] `src/services/evidenceChainTracker.ts`
- `analyzeEvidenceChain(caseId: string, chunksByDoc: Record<string, string[]>): Promise<EvidenceChainReport>`
- Prompts LLM to identify critical facts/assertions (e.g. "Accused was present at the scene", "Payment was made") and link them to:
  - **Supporting Evidence:** Found in specific documents (e.g. "Receipt", "WhatsApp Chats", "Bank Statement").
  - **Missing Evidence:** Crucial gaps needed to secure the fact (e.g. "Witness Statement", "FSL report").
- `interface EvidenceItem { fact: string; supportingEvidence: { docName: string; quote: string }[]; missingEvidence: string[]; status: 'STRONG' | 'WEAK' | 'MISSING' }`
- `interface EvidenceChainReport { items: EvidenceItem[]; confidence: number }`

#### [NEW] `src/screens/EvidenceChainScreen.tsx`
- Visualization cards for each fact/assertion.
- Renders:
  - Fact title (e.g. "Fact: Payment was made")
  - Supporting Evidence list with checkmarks (✓) and document names.
  - Missing Evidence list with red cross (✗) indicators showing gaps (e.g. "✗ Witness").
- Integrates findings from Risk Analyzer, Missing Docs, and Client Questions.
- Accessible from `CaseDetailsScreen` — unlocks "Evidence Chain 🔗" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `EvidenceChain: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Evidence Chain" tool card to navigate to `EvidenceChainScreen`.

---

### Phase 22 — Missing Document Detector
**Commit:** `Phase 22: Add missing document detector with CaseType-specific document checklists`

#### [NEW] `src/services/missingDocDetector.ts`
- `detectMissingDocuments(caseType, uploadedDocTypes): MissingDocReport`
- Static checklists per `CaseType` (e.g. Criminal: FIR, Charge Sheet, Bail Order, Witness Statements; Civil: Plaint, Written Statement, etc.).
- Compares against docs actually present (by filename heuristic + LLM classification).

#### [NEW] `src/screens/MissingDocsScreen.tsx`
- Shows ✅ Present / ❌ Missing document types per the case's `CaseType`.
- Summary count: "4 of 6 required documents present".
- Accessible from `CaseDetailsScreen` — unlocks "Missing Docs 📂" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `MissingDocs: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Missing Docs" tool card to navigate to `MissingDocsScreen`.

---

### Phase 24 — Hearing Preparation Mode (with Export & Judge Qs)
**Commit:** `Phase 24: Add hearing preparation mode with likely judge questions and file exporter`

#### [NEW] `src/services/hearingPrep.ts`
- `prepareHearingBrief(caseId, perspective): Promise<HearingBrief>`
- Aggregates all document chunks from the case folder.
- LLM generates structured brief:
  ```typescript
  interface HearingBrief {
    keyFacts: string[];
    importantDates: { date: string; event: string }[];
    strongestArguments: string[];
    weakestPoints: string[];
    questionsOpponentMayAsk: string[];
    questionsCourtMayAsk: string[];      // Formal/legal questions
    likelyJudgeQuestions: string[];     // Practical questions often asked by judges
    documentsToCarry: string[];
    confidence: number;
  }
  ```

#### [NEW] `src/screens/HearingPrepScreen.tsx`
- Sectioned display: Key Facts, Important Dates, Arguments, Weak Points, Opponent Questions, Court Questions, **Likely Judge Questions** (practical), Documents to Carry.
- **Export Brief Action:** Button to export the brief as a **PDF**, **DOCX**, or **TXT** file using `react-native-share` and file writer so the user can easily open it in office apps or read it before court.
- Accessible from `CaseDetailsScreen` — unlocks "Hearing Prep ⚡" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `HearingPrep: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Hearing Prep" tool card to navigate to `HearingPrepScreen`.

---

### Phase 24.5 — Opponent Argument Predictor
**Commit:** `Phase 24.5: Add opponent argument predictor with likely defense and counterarguments`

> [!NOTE]
> Not win probability. Just "what will they argue?" — litigation preparation only.

#### [NEW] `src/services/opponentPredictor.ts`
- `predictOpponentArguments(chunks[], perspective, caseType): Promise<OpponentReport>`

```typescript
interface OpponentReport {
  likelyArguments: string[];
  counterarguments: string[];
  vulnerabilities: string[];
  confidence: number;
}
```

#### [NEW] `src/screens/OpponentPredictorScreen.tsx`
- Two sections: "Likely Defense Arguments" and "Your Counterarguments".
- Accessible from `CaseDetailsScreen` — unlocks "Opponent Predictor 🎯" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `OpponentPredictor: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Opponent Predictor" tool card to navigate to `OpponentPredictorScreen`.

---

### Phase 24.6 — Questions for Client
**Commit:** `Phase 24.6: Add client question generator based on document gaps and case type`

#### [NEW] `src/services/clientQuestionGenerator.ts`
- `generateClientQuestions(chunks[], caseType, missingDocs[]): Promise<ClientQuestions>`

```typescript
interface ClientQuestions {
  questions: string[];
  evidenceNeeded: string[];
  urgentItems: string[];
}
```

#### [NEW] `src/screens/ClientQuestionsScreen.tsx`
- Numbered copyable questions, evidence checklists, and urgent items.
- Accessible from `CaseDetailsScreen` — unlocks "Client Questions ❓" tool card.

#### [MODIFY] `AppNavigator.tsx`
- Add `ClientQuestions: { caseId: string; caseTitle: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Client Questions" tool card to navigate to `ClientQuestionsScreen`.

---

### Phase 23 — Draft Generator Templates
**Commit:** `Phase 23: Add draft generator with structured templates for Legal Notice, Consumer Complaint, RTI, Affidavit, and Bail Petition`

#### [NEW] `src/services/draftGenerator.ts`
- `generateDraft(templateType, context): Promise<string>`
- Structured prompt templates: Legal Notice, Consumer Complaint, Reply Notice, RTI, Affidavit, Bail Petition, Written Statement.

#### [NEW] `src/screens/DraftGeneratorScreen.tsx`
- Template selector, contextual form, and copy-to-clipboard editor.
- Accessible from `CaseDetailsScreen` ("Draft Notice 📝") and `HomeScreen`.

#### [MODIFY] `AppNavigator.tsx`
- Add `DraftGenerator: { caseId?: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Draft Notice" tool card to navigate to `DraftGeneratorScreen`.

#### [MODIFY] `HomeScreen.tsx`
- Add "Draft Generator" tile.

---

### Phase 25 — Section Extractor (Indian Law & Common Mistakes)
**Commit:** `Phase 25: Add Indian law section extractor with ingredients and common mistakes`

#### [NEW] `src/services/sectionExtractor.ts`
- `extractSections(chunks[]): Promise<LegalSection[]>`
- `explainSection(sectionCode, caseType): Promise<SectionExplanation>`
- Update `SectionExplanation` interface to include **Common Mistakes**:
  ```typescript
  interface SectionExplanation {
    ingredients: string[];
    burden: string;
    penalty: string;
    defenses: string[];
    commonMistakes: string[];      // Gaps, standard filing errors, or procedural gotchas
    relatedSections: string[];
  }
  ```

#### [NEW] `src/screens/SectionExtractorScreen.tsx`
- Grouped Act/Section layout.
- Expandable sections detail: ingredients, burden, penalty, defenses, and warning cards for **Common Mistakes**.
- Accessible from `CaseDetailsScreen` ("Indian Law Sections 📖") and `DocumentDetailsScreen`.

#### [MODIFY] `AppNavigator.tsx`
- Add `SectionExtractor: { caseId?: string; docId?: string }` route.

#### [MODIFY] `CaseDetailsScreen.tsx`
- Wire "Indian Law Sections" tool card to navigate to `SectionExtractorScreen`.

#### [MODIFY] `DocumentDetailsScreen.tsx`
- Add "📖 Extract Sections" button.

---

### Phase 10.5 — Legal Corpus Infrastructure
**Commit:** `Phase 10.5: Set up legal corpus directory structure and manager service (no ingestion)`

> [!IMPORTANT]
> DO NOT ingest actual law text (Constitution, BNS, BNSS, BSA, etc.) at this stage. Only set up folders and service stubs. Keep codebase lightweight and stable first.

#### [NEW] `assets/legal/` directory structure with READMEs and metadata placeholders only.

#### [NEW] `src/services/corpusManager.ts`
- Service interface listing stubs and search parameters.

---

### Phase 17 Part 2 — Privacy Controls UI
**Commit:** `Phase 17 Part 2: Add privacy controls and data management to Settings`

#### [MODIFY] `SettingsScreen.tsx`
- Add **Privacy & Security** card with Local-Only Processing indicator, metadata JSON export, and permanent "DELETE" confirmation purge.

---

### Phase 16 — Performance Dashboard
**Commit:** `Phase 16: Add performance telemetry service and dashboard in Settings`

#### [NEW] `src/services/telemetry.ts` (tracking metrics: model load time, inference speed, RAM usage, storage size).

#### [MODIFY] `modelManager.ts`, `llmService.ts`, `SettingsScreen.tsx` (wire tracking and metrics cards).

---

### Phase 26 — Precedent Architecture Placeholder
**Commit:** `Phase 26: Add precedent service architecture placeholder for future case law integration`

#### [NEW] `src/services/precedentService.ts` (stubs and documented future hooks).

---

## AppNavigator Changes (consolidated)

All new routes to add to `RootStackParamList` and register `Stack.Screen`:

```typescript
Contradiction: { caseId: string; caseTitle: string };
EntityTracker: { caseId: string; caseTitle: string };
EvidenceChain: { caseId: string; caseTitle: string };
MissingDocs: { caseId: string; caseTitle: string };
HearingPrep: { caseId: string; caseTitle: string };
OpponentPredictor: { caseId: string; caseTitle: string };
ClientQuestions: { caseId: string; caseTitle: string };
DraftGenerator: { caseId?: string };
SectionExtractor: { caseId?: string; docId?: string };
```

---

## CaseDetailsScreen Tool Wiring (consolidated)

All 9 tool cards wire to their respective screens upon implementation:

| Tool Card | Phase | Destination Route |
|---|---|---|
| Timeline 📅 | ✅ Done | `Timeline` |
| Contradictions ⚠️ | Phase 20 | `Contradiction` |
| Entity Tracker 👥 | Phase 21 | `EntityTracker` |
| Evidence Chain 🔗 | Phase 21.5 | `EvidenceChain` |
| Missing Docs 📂 | Phase 22 | `MissingDocs` |
| Hearing Prep ⚡ | Phase 24 | `HearingPrep` |
| Opponent Predictor 🎯 | Phase 24.5 | `OpponentPredictor` |
| Client Questions ❓ | Phase 24.6 | `ClientQuestions` |
| Draft Notice 📝 | Phase 23 | `DraftGenerator` |
| Indian Law Sections 📖 | Phase 25 | `SectionExtractor` |

---

## Permanently Deferred

| Feature | Reason |
|---|---|
| Phase 11 — Hybrid Retrieval | BM25 sufficient. Revisit post-production. |
| Voice Mode | High complexity, low lawyer value. |
| Document Comparison | Low priority vs. case workspace tools. |
| ELI5 Mode | Lawyers work in legal language. |

---

## Banned Features (Never Add)

> [!CAUTION]
> Banned on ethical and liability grounds:
> - Win prediction / probability scores.
> - Judgment prediction.
> - Success rate metrics.
> - Court outcome forecasting.
> - Sentence duration prediction.

---

## Verification Plan

### After Each Commit
```powershell
npx tsc --noEmit
```
Zero errors required before proceeding to the next commit.

### Key Manual Tests
- Verify custom Case Notes lists and tag chips in CaseDetails and main Cases screen.
- Verify Contradiction scanner operates across ALL documents linked to a case.
- Verify Evidence Chain renders checkmarked evidence vs. missing items (✓ Evidence vs. ✗ Witness).
- Verify Hearing Prep brief displays likely Judge Questions and exports to PDF, DOCX, and TXT.
- Verify Indian Law sections lists common mistakes under warning banners.
- Confirm Settings telemetry displays performance graphs after LLM operations.

---

## Proposed Changes Summary Table

| Phase | Target File | Action | Description |
|---|---|---|---|
| Phase 18.5 | `src/store/useCaseStore.ts` | [MODIFY] | Add tags and notes schemas and actions |
| Phase 18.5 | `src/screens/CasesScreen.tsx` | [MODIFY] | Display tags on case cards, add tag filter |
| Phase 18.5 | `src/screens/CaseDetailsScreen.tsx` | [MODIFY] | Add chip selector for tags and notes list UI |
| Phase 20 | `src/services/contradictionDetector.ts` | [NEW] | Full-case contradiction scanner |
| Phase 20 | `src/screens/ContradictionScreen.tsx` | [NEW] | Scan results and severity badges UI |
| Phase 20 | `AppNavigator.tsx`, `CaseDetailsScreen.tsx` | [MODIFY] | Register and wire route |
| Phase 21 | `src/services/entityTracker.ts` | [NEW] | Cross-document entity extractor |
| Phase 21 | `src/screens/EntityTrackerScreen.tsx` | [NEW] | Grouped index list UI |
| Phase 21.5 | `src/services/evidenceChainTracker.ts` | [NEW] | Link facts to supporting and missing evidence |
| Phase 21.5 | `src/screens/EvidenceChainScreen.tsx` | [NEW] | Renders check/cross evidence layout |
| Phase 21.5 | `AppNavigator.tsx`, `CaseDetailsScreen.tsx` | [MODIFY] | Wire evidence tool card |
| Phase 22 | `src/services/missingDocDetector.ts` | [NEW] | Checklist detection service |
| Phase 22 | `src/screens/MissingDocsScreen.tsx` | [NEW] | Display present/missing document checklist |
| Phase 24 | `src/services/hearingPrep.ts` | [NEW] | Brief generator with likely judge questions |
| Phase 24 | `src/screens/HearingPrepScreen.tsx` | [NEW] | Brief panels and Export PDF/DOCX/TXT action |
| Phase 24.5 | `src/services/opponentPredictor.ts` | [NEW] | Predict opponent defenses |
| Phase 24.6 | `src/services/clientQuestionGenerator.ts` | [NEW] | Interview question builder |
| Phase 23 | `src/services/draftGenerator.ts` | [NEW] | Indian legal drafting templates |
| Phase 23 | `src/screens/DraftGeneratorScreen.tsx` | [NEW] | Selection and generation workspace UI |
| Phase 25 | `src/services/sectionExtractor.ts` | [NEW] | Extract Sections with Common Mistakes |
| Phase 25 | `src/screens/SectionExtractorScreen.tsx` | [NEW] | Expandable ingredients and common mistakes |
| Phase 10.5 | `assets/legal/` | [NEW] | Empty metadata and readme tree (no ingestion) |
| Phase 17 Part 2 | `SettingsScreen.tsx` | [MODIFY] | Privacy options card and double-confirm wipe |
| Phase 16 | `src/services/telemetry.ts` | [NEW] | Telemetry tracker service |
| Phase 26 | `src/services/precedentService.ts` | [NEW] | Precedent search stub placeholder |

---

## Phase Status Summary Table

| Order | Phase                             | Description                                                          | Priority | Status    |
| ----- | --------------------------------- | -------------------------------------------------------------------- | -------- | --------- |
| –     | Docs Update                       | Documentation                                                        | Low      | ✅ Done    |
| 1     | Phase 8 (Parts 1–3)               | Production Hardening                                                 | Critical | ✅ Done    |
| 2     | Phase 8.5                         | Retrieval Evaluation                                                 | High     | ✅ Done    |
| 3     | Phase 8.6                         | Hallucination Detection                                              | High     | ✅ Done    |
| 4     | Phase 8.7                         | Source Citation Engine                                               | High     | ✅ Done    |
| 5     | Phase 9                           | Performance Benchmark Framework                                      | High     | ✅ Done    |
| 6     | Phase 17 Part 1                   | Encrypted Storage (security first)                                   | Critical | ✅ Done    |
| 7     | Phase 9.5                         | Retrieval Debug Screen                                               | High     | ✅ Done    |
| 8     | Phase 9.6                         | Model Comparison Benchmark                                           | High     | ✅ Done    |
| 9     | Phase 11.5                        | Conversation Memory                                                  | Medium   | ✅ Done    |
| 10    | Phase 13 (Parts 1–2)              | Legal Audit + Risk + Evidence Analyzer                               | Critical | ✅ Done    |
| 11    | Phase 13.5                        | Perspective-Aware Analysis + CaseType Selector                       | High     | ✅ Done    |
| 12    | Phase 13.6                        | Legal Strategy Generator + Confidence + Lawyer Questions             | High     | ✅ Done    |
| 13    | Phase 13.7                        | Multi-Perspective Comparison                                         | Medium   | ✅ Done    |
| 13.5  | Phase 19.5                        | Docs Reader (Docx & Text Extractor)                                  | High     | ✅ Done    |
| 14    | Phase 18                          | Case File Workspace                                                  | Critical | ✅ Done    |
| 15    | Phase 19                          | Timeline Generator                                                   | High     | ✅ Done    |
| 16    | Phase 18.5                        | Case Notes & Tags (No AI)                                            | High     | 🔲 Next   |
| 17    | Phase 20                          | Contradiction Detector (Whole Case)                                  | High     | 🔲        |
| 18    | Phase 21                          | Cross-Document Entity Tracker                                        | High     | 🔲        |
| 19    | Phase 21.5                        | Evidence Chain Tracker                                               | High     | 🔲        |
| 20    | Phase 22                          | Missing Document Detector                                            | High     | 🔲        |
| 21    | Phase 24                          | Hearing Preparation Mode (with Export & Judge Qs)                    | Critical | 🔲        |
| 22    | Phase 24.5                        | Opponent Argument Predictor                                          | High     | 🔲        |
| 23    | Phase 24.6                        | Questions for Client                                                 | High     | 🔲        |
| 24    | Phase 23                          | Draft Generator Templates                                            | High     | 🔲        |
| 25    | Phase 25                          | Section Extractor (Indian Law & Common Mistakes)                     | High     | 🔲        |
| 26    | Phase 10.5                        | Corpus Infrastructure (no ingestion)                                 | Medium   | 🔲        |
| 27    | Phase 17 Part 2                   | Privacy Controls UI                                                  | Medium   | 🔲        |
| 28    | Phase 16                          | Performance Dashboard                                                | Medium   | 🔲        |
| 29    | Phase 26                          | Precedent Architecture Placeholder                                   | Low      | 🔲        |
| V2    | Phase 12                          | Voice Mode                                                           | Deferred | ⛔ Dropped |
| V2    | Phase 14                          | Document Comparison                                                  | Deferred | ⛔ Dropped |
| V2    | Phase 15                          | ELI5 Plain English Mode                                              | Deferred | ⛔ Dropped |
| –     | Court / Win / Judgment Prediction | AI prediction of case outcomes                                       | –        | ⛔ Never   |
|       |                                   | **14 remaining**                                                     |          |           |
