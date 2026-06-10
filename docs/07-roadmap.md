# Development Roadmap

## Progress Overview

```mermaid
pie title Phase Completion Status
    "Complete (Phases 1-19)" : 15
    "Remaining (Phases 20-27)" : 8
```

## Timeline

```mermaid
gantt
    title Mobile Legal AI Assistant — Development Phases
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Foundation
    Phase 1 - Setup           :done, p1, 2026-05-20, 1d
    Phase 2 - UI              :done, p2, after p1, 2d
    Phase 3 - Storage         :done, p3, after p2, 1d
    Phase 4 - PDF Processing  :done, p4, after p3, 2d

    section AI Core
    Phase 5 - Local AI        :done, p5, after p4, 2d
    Phase 6 - Doc Intelligence :done, p6, after p5, 2d
    Phase 7 - Polish          :done, p7, after p6, 2d

    section Hardening
    Phase 8 - Production      :active, p8, after p7, 3d
    Phase 8.5 - Retrieval Eval :p85, after p8, 1d
    Phase 8.6 - Hallucination :p86, after p85, 1d
    Phase 8.7 - Citations     :p87, after p86, 1d

    section Evaluation
    Phase 9 - Benchmarks      :p9, after p87, 2d

    section Knowledge
    Phase 10.5 - Corpus Mgr   :p105, after p9, 2d
    Phase 11.5 - Conv Memory  :p115, after p105, 1d

    section Features
    Phase 13 - Risk Analyzer  :done, p13, after p115, 3d
    Phase 18 - Case Workspace :done, p18, after p13, 2d
    Phase 19 - Timeline       :done, p19, after p18, 1d
    Phase 20 - Contradictions :p20, after p19, 2d
    Phase 24 - Hearing Prep   :p24, after p20, 2d
```

## Phase 1 ✅

**Project Setup**

- Install Android Studio
- Install Android SDK
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
- Auto-load on startup
- Stop/cancel generation button
- Indian Law specialization in system prompts
- Error handling and status indicators

---

## Phase 8 🔲

**Production Hardening**

- Model crash recovery (auto-release + reload)
- Token-based context budget manager
- Fix document summarization (increase token limit, clean PDF artifacts)

---

## Phase 8.5 🔲

**Retrieval Quality Evaluation**

- Retrieval benchmark suite (Recall@5, Recall@10, MRR, Precision)
- 10 benchmark documents + 50 benchmark questions
- Automated scoring scripts

---

## Phase 8.6 🔲

**Hallucination Detection**

- Answer verifier service
- Cross-reference answer claims against source chunks
- Warning banner when confidence is low

---

## Phase 8.7 🔲

**Source Citation Engine**

- Interactive citation panel below AI answers
- Tap source → view chunk → highlight paragraph
- Structured `CitationSource` data type

---

## Phase 9 🔲

**Evaluation Framework**

- Performance benchmark harness
- Model load time measurement
- Inference latency (ms/token)
- Peak RAM/memory consumption tracking

---

## Phase 10 🔲

**Real Legal Knowledge Base**

- Built-in Indian legal corpus (Constitution, BNS, BNSS, BSA, CPC, RTI)
- Chunk and index on first launch
- Answer questions without user-uploaded documents

---

## Phase 10.5 🔲

**Legal Corpus Manager**

- Modular `assets/legal/` directory structure
- Per-law metadata and versioning
- Incremental indexing

---

## Phase 11 🔲

**Hybrid Retrieval**

- BM25 + embedding model dual-stage retrieval
- Semantic search alongside keyword matching

---

## Phase 11.5 🔲

**Conversation Memory**

- 5-exchange history buffer
- Context summary injection for follow-up questions
- Multi-turn conversational awareness

---

## Phase 12 🔲

**Legal AI Assistant Features**

- Case Analysis (FIR, Charge Sheet, Notice, Agreement)
- Legal Drafting (Legal Notice, RTI, Consumer Complaint, Affidavit)
- Voice Mode (Speech → Transcription → RAG → TTS)

---

## Phase 13 ✅

**Legal Audit & Strategy Pipeline**

- Phase 13.0: Chunk-by-chunk Risk Analyzer & Evidence Analyzer (High/Med risk, missing clauses, evidence strength).
- Phase 13.5: Global Perspective & CaseType selector state.
- Phase 13.6: Legal Strategy Generator (SWOT, Claims, Next Steps).
- Phase 13.7: Multi-Perspective Comparison (Side-by-side analysis grid).
- Generates Consultation Questions and Confidence Scores.

---

## Phase 18 ✅

**Case File Workspace**

- CaseFolder schema (Title, Court, Client, Judge, Type, Status, Hearing Date).
- Zustand store persistence with array of document IDs.
- CasesScreen list view sorted by upcoming hearing dates.
- CaseDetailsScreen hub with inline editable metadata and status chip selector.
- Document linking and unlinking.

---

## Phase 19 ✅

**Timeline Generator**

- Multi-document event extraction using chunk iteration (`timelineGenerator.ts`).
- Normalization of unstructured dates.
- Vertical Timeline Screen UI with progress tracking.
- Accessible directly from Case Details tools hub.

---

## Phases 20–27 🔲

**Advanced Legal Features Roadmap**

- **Phase 20**: Contradiction Detector
- **Phase 21**: Cross-Document Entity Tracker
- **Phase 22**: Missing Document Detector
- **Phase 23**: Draft Generator Templates
- **Phase 24**: Hearing Preparation Mode
- **Phase 24.5**: Opponent Argument Predictor
- **Phase 24.6**: Questions for Client
- **Phase 25**: Section Extractor (Indian Law)
- **Phase 27**: Evidence Chain Tracker

---

## Deferred / Dropped Features ⛔

- ~~Phase 12: Voice Mode~~ (High complexity, low priority)
- ~~Phase 14: Document Comparison~~ (Low priority vs evidence/strategy)
- ~~Phase 15: Explain Like I'm Not a Lawyer (ELI5)~~ (Targeting working lawyers instead)
- ~~Court/Win/Judgment Prediction~~ (Legally irresponsible)
