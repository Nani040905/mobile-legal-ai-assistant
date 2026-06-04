# Folder Structure

```
mobile-legal-ai-assistant/
│
├── docs/                                    # Project documentation
│   ├── 01-project-overview.md
│   ├── 02-app-screens.md
│   ├── 03-folder-structure.md
│   ├── 04-data-flow.md
│   ├── 05-tech-stack.md
│   ├── 06-document-processing.md
│   └── 07-roadmap.md
│
├── LegalAI/                                 # React Native project root
│   │
│   ├── android/                             # Android native code
│   │   └── app/src/main/java/com/legalai/
│   │       ├── PdfExtractorModule.kt        # Native PDF text extraction
│   │       └── PdfExtractorPackage.kt       # Module registration
│   │
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── DocumentsScreen.tsx
│   │   │   ├── DocumentDetailsScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── RiskReportScreen.tsx          # Phase 13 — planned
│   │   │
│   │   ├── components/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── Header.tsx
│   │   │   └── CitationPanel.tsx             # Phase 8.7 — planned
│   │   │
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── llmService.ts                # LLM inference API
│   │   │   ├── modelManager.ts              # Model lifecycle singleton
│   │   │   ├── pdfService.ts                # PDF extraction & chunking
│   │   │   ├── retrievalService.ts          # BM25 text retrieval
│   │   │   ├── storageService.ts            # AsyncStorage persistence
│   │   │   ├── contextBudget.ts             # Phase 8 — planned
│   │   │   ├── answerVerifier.ts            # Phase 8.6 — planned
│   │   │   ├── corpusManager.ts             # Phase 10.5 — planned
│   │   │   ├── riskAnalyzer.ts              # Phase 13 — planned
│   │   │   ├── telemetry.ts                 # Phase 16 — planned
│   │   │   └── secureStorage.ts             # Phase 17 — planned
│   │   │
│   │   ├── store/
│   │   │   ├── useChatStore.ts              # Zustand chat state
│   │   │   └── useDocumentStore.ts          # Zustand document state
│   │   │
│   │   ├── evaluation/                      # Phase 8.5/9 — planned
│   │   │   ├── retrievalBenchmark.ts
│   │   │   ├── performanceBenchmark.ts
│   │   │   ├── benchmarkQuestions.json
│   │   │   └── benchmarkDocuments/
│   │   │
│   │   ├── utils/
│   │   │   ├── theme.ts                     # Design tokens (colors, fonts, spacing)
│   │   │   └── textCleaner.ts               # Phase 8 — planned
│   │   │
│   │   ├── types/                           # TypeScript type definitions
│   │   │
│   │   └── assets/
│   │       └── legal/                       # Phase 10.5 — planned
│   │           ├── constitution/
│   │           ├── bns/
│   │           ├── bnss/
│   │           ├── bsa/
│   │           ├── cpc/
│   │           ├── consumer_protection/
│   │           └── rti/
│   │
│   ├── App.tsx                              # Root component
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

## Module Dependency Diagram

```mermaid
graph TD
    subgraph Screens
        HS["HomeScreen"]
        CS["ChatScreen"]
        DS["DocumentsScreen"]
        DDS["DocumentDetailsScreen"]
        SS["SettingsScreen"]
    end

    subgraph Components
        CI["ChatInput"]
        CM["ChatMessage"]
        DC["DocumentCard"]
        HD["Header"]
    end

    subgraph Stores
        CHAT["useChatStore"]
        DOC["useDocumentStore"]
    end

    subgraph Services
        LLM["llmService"]
        MM["modelManager"]
        PDF["pdfService"]
        RET["retrievalService"]
        STG["storageService"]
    end

    subgraph Utils
        THEME["theme.ts"]
    end

    CS --> CI
    CS --> CM
    CS --> HD
    CS --> CHAT

    DS --> DC
    DS --> HD
    DS --> DOC

    DDS --> HD
    DDS --> DOC
    DDS --> LLM
    DDS --> RET

    SS --> HD
    SS --> MM

    HS --> HD

    CHAT --> LLM
    CHAT --> STG
    DOC --> PDF
    DOC --> STG

    LLM --> MM
    MM --> |"llama.rn"| LLAMA["Native LLM"]
    PDF --> |"PdfExtractor"| NATIVE_PDF["Native PDF"]

    CI --> THEME
    CM --> THEME
    DC --> THEME
    HD --> THEME
```

## Service Layer Architecture

```mermaid
graph LR
    subgraph Public["Public API"]
        GR["generateResponse()"]
        GS["generateSummary()"]
        AQ["answerQuestion()"]
    end

    subgraph Model["Model Management"]
        INIT["initializeModel()"]
        REL["releaseModel()"]
        DL["downloadModel()"]
        SW["setActiveModel()"]
        STOP["stopCompletion()"]
    end

    subgraph Retrieval["Retrieval"]
        SEARCH["search()"]
        GET_CTX["getRelevantContext()"]
        TOK["tokenize()"]
    end

    GR --> INIT
    GS --> INIT
    AQ --> SEARCH
    SEARCH --> TOK
    AQ --> GET_CTX
    GET_CTX --> SEARCH

    style Public fill:#4caf50,color:#fff
    style Model fill:#2196f3,color:#fff
    style Retrieval fill:#ff9800,color:#000
```

