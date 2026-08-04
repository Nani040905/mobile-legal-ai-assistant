# Testing Infrastructure

> **Branch:** `javascript`
> Two test suites: in-app Jest (`LegalAI/__tests__/`) and external test suite (`testing/js/`)

---

## Overview

```
testing/
├── js/                              # External Jest test suite
│   ├── package.json                 # Separate dependencies (no RN)
│   ├── babel.config.js              # @babel/preset-env (Node.js target)
│   ├── jest.config.js               # Test patterns + module mappings
│   ├── __mocks__/                   # Manual mocks for all native dependencies
│   ├── tests/
│   │   ├── integration/             # End-to-end pipeline tests
│   │   ├── services/                # Unit tests per service (15 files)
│   │   ├── store/                   # Unit tests for Zustand stores (3 files)
│   │   ├── stress/                  # Crash/edge-case tests (7 files)
│   │   └── utils/                   # Utility tests (1 file)
│   └── soak/                        # Long-running GPU stress tests
├── python/                          # Python evaluation helpers
├── README.md                        # Full testing setup guide
└── run_all.py                       # Master Python test runner
```

---

## Running Tests

```bash
# In-app tests (basic component tests)
cd LegalAI
npm test

# Full external service test suite
cd testing/js
npm install
npm test

# External tests with coverage
npx jest --coverage

# Specific service test
npx jest tests/services/retrievalService.test.js

# Run only stress tests
npx jest tests/stress/

# Run all external test types
python ../../testing/run_all.py
```

---

## Mock Setup (`testing/js/__mocks__/`)

All native modules are mocked so tests run in Node.js without a device:

| Mock | What It Replaces |
|---|---|
| `llama.rn` mock | `initLlama()` → returns fake context with `completion()` that returns `{ text: 'Mock response', tokens_generated: 10 }` |
| `react-native-fs` mock | All RNFS methods return resolved Promises |
| `@react-native-async-storage/async-storage` mock | In-memory Map implementation |
| `react-native` mock | `NativeModules.PdfExtractor` → returns stub text |
| `@react-native-documents/picker` mock | Returns fake file URI |

---

## Service Unit Tests (`testing/js/tests/services/`)

| Test File | Covers |
|---|---|
| `retrievalService.test.js` | BM25 scoring, tokenization, stop word removal, k-results |
| `answerVerifier.test.js` | Hallucination detection logic, confidence scoring |
| `clientQuestionGenerator.test.js` | Category generation per case type |
| `contextBudget.test.js` | Token budget calculation, greedy fill, drop counts |
| `contradictionDetector.test.js` | JSON parse, multi-format fallback, severity scoring |
| `corpusManager.test.js` | Corpus chunk retrieval |
| `draftGenerator.test.js` | Template type dispatch, LLM prompt construction |
| `entityTracker.test.js` | Entity extraction, grouping by type |
| `evidenceChainTracker.test.js` | Chain strength, gap detection |
| `hearingPrep.test.js` | Brief generation, date formatting |
| `missingDocDetector.test.js` | Completeness scoring, case-type-aware gaps |
| `opponentPredictor.test.js` | Argument likelihood ranking |
| `pdfService.test.js` | Chunk splitting (paragraph/line/sentence/hard boundaries) |
| `sectionExtractor.test.js` | Act identification, section numbering |
| `telemetry.test.js` | tokens/sec calculation, reset behavior |
| `precedentService.test.js` | Stub return structure validation |

---

## Store Tests (`testing/js/tests/store/`)

| Test File | Covers |
|---|---|
| `useCaseStore.test.js` | addCase, updateCase, deleteCase, addDocumentToCase, notes, tags, all AI report setters, clearAll |
| `useChatStore.test.js` | addMessage, getHistory, clearHistory per-case, clearAll, perspective/caseType metadata |
| `useDocumentStore.test.js` | addDocument, deleteDocument, getById, chunks stored correctly |

---

## Integration Tests (`testing/js/tests/integration/`)

| Test File | Covers |
|---|---|
| `retrievalPipeline.test.js` | End-to-end: extract → chunk → BM25 rank → contextBudget → mocked LLM answer |

---

## Stress Tests (`testing/js/tests/stress/`)

These tests verify correct behavior under adversarial/edge-case inputs:

| Test File | Scenario Covered |
|---|---|
| `bm25Crash.test.js` | Empty queries, single-char queries, all-stopword queries, 10K chunk arrays |
| `budgetCrash.test.js` | Zero budget, negative budget, chunks larger than budget, 10K chunks |
| `pdfChunkCrash.test.js` | Empty text, single char text, repeated newlines, Unicode heavy text, 500KB documents |
| `pipelineCrash.test.js` | Full RAG pipeline with null values, empty arrays, malformed context |
| `storeCrash.test.js` | Invalid case IDs, duplicate documents, note/tag operations on missing IDs |
| `tokenizeCrash.test.js` | Unicode text, Arabic/Hindi/CJK scripts, emojis, very long tokens |
| `verifierCrash.test.js` | Empty answer, empty context, null model response, extreme confidence |

---

## Soak Tests (`testing/js/soak/`)

Long-running tests to detect GPU/CPU memory leaks and performance degradation:

```bash
# GPU soak test (requires physical device or GPU-enabled emulator)
cd testing/js
node soak/gpuSoak.js

# Runs 100+ sequential inference calls, monitors memory, checks for context corruption
```

**Requirements for GPU soak tests:**
- Physical Android device with Snapdragon/MediaTek GPU **OR**
- Android emulator with GPU acceleration enabled in AVD settings
- Model file pre-loaded (`qwen2.5-3b-instruct-q4_k_m.gguf` in device storage)
- Timeout protection: each inference aborts after 120 seconds via `AbortController`

---

## Evaluation Tests (`LegalAI/src/evaluation/`)

These are run against real documents and LLM models for quality evaluation:

```bash
# BM25 retrieval recall evaluation (no LLM needed)
cd LegalAI
npm run test:retrieval

# Benchmark screen evaluation (in-app, requires loaded model)
# Launch the app → tap Benchmark in HomeScreen
```

| Script | Purpose |
|---|---|
| `retrievalBenchmark.js` | Measures BM25 recall@1, recall@3, recall@5 against 200+ benchmark Q&A pairs |
| `performanceBenchmark.js` | Measures inference tokens/sec and latency for selected model |
| `modelComparison.js` | Side-by-side quality comparison across 3 models |
| `verifyAnswerTest.js` | Runs LLM answer verifier against expected answers |
| `generateBenchmarkData.js` | Re-generates the benchmark dataset from source documents |

---

## Test Coverage Goals

| Category | Target Coverage |
|---|---|
| Service business logic | 80%+ |
| Store mutations | 95%+ |
| Utility functions | 90%+ |
| Stress (edge cases) | All identified crash vectors |
| Integration | Happy path + 3 failure modes |
