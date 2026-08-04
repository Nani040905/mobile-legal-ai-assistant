# Folder Structure

> **Branch:** `javascript` — React Native implementation

---

## Repository Root

```
mobile-legal-ai-assistant/
├── LegalAI/                         # React Native app source
│   ├── App.jsx                      # Root app component — renders AppNavigator
│   ├── index.js                     # RN entry point — registers App component
│   ├── package.json                 # Dependencies and scripts
│   ├── babel.config.js              # Babel transform for RN
│   ├── metro.config.js              # Metro bundler config
│   ├── jest.config.js               # Jest unit test config (in-app tests)
│   ├── .eslintrc.js                 # ESLint rules (react-native preset)
│   ├── .prettierrc.js               # Prettier formatting rules
│   ├── android/                     # Android native project
│   │   ├── app/
│   │   │   ├── src/main/java/com/legalai/
│   │   │   │   ├── MainApplication.kt       # Android Application class
│   │   │   │   └── modules/
│   │   │   │       └── PdfExtractorModule.kt  # Native PDF text extractor
│   │   │   └── build.gradle
│   │   ├── build.gradle
│   │   └── settings.gradle
│   ├── ios/                         # iOS native project (secondary target)
│   └── src/                         # All JavaScript application code
│       ├── components/              # Shared UI components
│       │   ├── ChatInput.jsx        # Text input bar with send + stop buttons
│       │   ├── ChatMessage.jsx      # Single chat bubble (user or assistant)
│       │   ├── CitationPanel.jsx    # Shows source chunk citations for answers
│       │   ├── DocumentCard.jsx     # PDF document list item card
│       │   ├── Header.jsx           # Custom top navigation header bar
│       │   └── PerspectiveSelector.jsx  # Legal perspective mode picker
│       ├── evaluation/              # Offline evaluation / benchmark data
│       │   ├── benchmarkDocuments/  # 54 real Indian legal document text files
│       │   ├── benchmarkDocumentsData.js   # Programmatic document loader (90 KB)
│       │   ├── benchmarkQuestions.json     # 200+ benchmark Q&A pairs (67 KB)
│       │   ├── generateBenchmarkData.js    # Script to rebuild benchmark dataset
│       │   ├── modelComparison.js          # Multi-model side-by-side comparison runner
│       │   ├── performanceBenchmark.js     # Token/sec and latency benchmarker
│       │   ├── retrievalBenchmark.js       # BM25 recall@k evaluator
│       │   └── verifyAnswerTest.js         # LLM answer correctness verifier
│       ├── navigation/
│       │   └── AppNavigator.jsx     # All routes and NavigationContainer
│       ├── screens/                 # 22 full-feature screen components
│       │   ├── HomeScreen.jsx
│       │   ├── CasesScreen.jsx
│       │   ├── CaseDetailsScreen.jsx
│       │   ├── ChatScreen.jsx
│       │   ├── DocumentsScreen.jsx
│       │   ├── DocumentDetailsScreen.jsx
│       │   ├── SettingsScreen.jsx
│       │   ├── TimelineScreen.jsx
│       │   ├── ContradictionScreen.jsx
│       │   ├── EntityTrackerScreen.jsx
│       │   ├── EvidenceChainScreen.jsx
│       │   ├── MissingDocsScreen.jsx
│       │   ├── HearingPrepScreen.jsx
│       │   ├── OpponentPredictorScreen.jsx
│       │   ├── ClientQuestionsScreen.jsx
│       │   ├── DraftGeneratorScreen.jsx
│       │   ├── SectionExtractorScreen.jsx
│       │   ├── RiskReportScreen.jsx
│       │   ├── StrategyScreen.jsx
│       │   ├── PerspectiveComparisonScreen.jsx
│       │   ├── BenchmarkScreen.jsx
│       │   └── DebugRetrievalScreen.jsx
│       ├── services/                # All business logic and AI services
│       │   ├── llmService.js        # LLM inference API (generate, summarize, Q&A)
│       │   ├── modelManager.js      # LLM lifecycle singleton (download/load/unload)
│       │   ├── pdfService.js        # PDF text extraction + chunk splitting
│       │   ├── retrievalService.js  # BM25 keyword retrieval engine
│       │   ├── storageService.js    # RNFS file read/write helpers
│       │   ├── secureStorage.js     # AES-256 encrypted AsyncStorage adapter
│       │   ├── contextBudget.js     # Token budget allocator for LLM prompts
│       │   ├── telemetry.js         # Inference performance tracker
│       │   ├── corpusManager.js     # Indian law corpus (legal knowledge base)
│       │   ├── riskAnalyzer.js      # Legal risk audit generator
│       │   ├── strategyGenerator.js # Legal strategy report generator
│       │   ├── timelineGenerator.js # Chronological event timeline extractor
│       │   ├── contradictionDetector.js   # Cross-document contradiction scanner
│       │   ├── entityTracker.js           # Named entity index builder
│       │   ├── evidenceChainTracker.js    # Evidence chain validity analyzer
│       │   ├── evidenceAnalyzer.js        # Single document evidence analyzer
│       │   ├── missingDocDetector.js      # Missing document gap detector
│       │   ├── hearingPrep.js             # Hearing preparation brief generator
│       │   ├── opponentPredictor.js       # Opponent argument predictor
│       │   ├── clientQuestionGenerator.js # Client interview question generator
│       │   ├── draftGenerator.js          # Legal document draft template generator
│       │   ├── sectionExtractor.js        # Indian law section identifier/explainer
│       │   ├── perspectiveComparison.js   # Multi-perspective case analyzer
│       │   ├── answerVerifier.js          # LLM answer hallucination checker
│       │   ├── unifiedAnalyzer.js         # Orchestrates multiple analyzers together
│       │   └── precedentService.js        # Precedent case lookup stubs (Phase 26)
│       ├── store/                   # Zustand state stores
│       │   ├── useCaseStore.js      # Case folders, notes, tags, AI report cache
│       │   ├── useChatStore.js      # Chat message history per case
│       │   └── useDocumentStore.js  # PDF document metadata and extracted chunks
│       ├── types/                   # Shared type definitions
│       │   ├── legalPerspective.js  # Perspective enum + focus prompt fragments
│       │   └── caseType.js          # Case type enum + focus topic lists
│       └── utils/
│           ├── theme.js             # COLORS, FONTS, SPACING design tokens
│           └── textCleaner.js       # PDF text normalization utilities
├── docs/                            # Documentation (this directory)
│   ├── 01-project-overview.md
│   ├── 02-app-screens.md
│   ├── 03-folder-structure.md       (this file)
│   ├── 04-data-flow.md
│   ├── 05-tech-stack.md
│   ├── 06-document-processing.md
│   ├── 07-roadmap.md
│   └── 08-implementation-plan.md
├── testing/                         # External test suite (separate from app)
│   ├── README.md                    # Testing guide + GPU soak test setup
│   ├── run_all.py                   # Python runner to execute all test suites
│   ├── manual_testing_strategy_phase_18.5.md
│   ├── js/                          # JavaScript tests (Jest)
│   │   ├── package.json             # Test suite dependencies
│   │   ├── babel.config.js
│   │   ├── jest.config.js
│   │   ├── __mocks__/               # Mock modules for LLM, RNFS, AsyncStorage
│   │   ├── tests/
│   │   │   ├── integration/         # End-to-end retrieval pipeline tests
│   │   │   ├── services/            # Unit tests for all 15+ service modules
│   │   │   ├── store/               # Unit tests for all 3 Zustand stores
│   │   │   ├── stress/              # Crash/edge-case stress tests (7 suites)
│   │   │   └── utils/               # Utility function tests
│   │   └── soak/                    # Long-running GPU soak test runners
│   └── python/                      # Python test/evaluation helpers
└── README.md                        # Root repository readme
```

---

## Key Design Rules

1. **All JavaScript lives in `LegalAI/src/`** — no business logic in screen files
2. **Screens are display-only** — they call services and read from stores; they don't process data directly
3. **Services are stateless** — they take inputs and return outputs; state lives in Zustand stores
4. **One singleton per device resource** — `modelManager` is the only place that calls `initLlama()`
5. **Evaluation data is static** — the `evaluation/` folder contains pre-built benchmark data, never generated at runtime in production
6. **Tests are isolated** — the external `testing/js` suite has its own `package.json` and mocks; it doesn't import from the app
