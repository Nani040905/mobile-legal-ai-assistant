# Tech Stack

## Stack Overview

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        RN["React Native 0.85"]
        NAV["React Navigation 7.x"]
        TS["TypeScript 5.8"]
    end

    subgraph State["State Layer"]
        ZUS["Zustand 5.x"]
        AS["AsyncStorage 3.x"]
    end

    subgraph Services["Service Layer"]
        LLM_SVC["llmService"]
        MM_SVC["modelManager"]
        PDF_SVC["pdfService"]
        RET_SVC["retrievalService"]
        STG_SVC["storageService"]
    end

    subgraph Native["Native Layer"]
        LLAMA_RN["llama.rn 0.12"]
        PDF_EXT["PdfExtractor (Kotlin)"]
        PDFBOX["PDFBox Android"]
        RNFS["react-native-fs 2.x"]
    end

    subgraph AI["AI Models (GGUF)"]
        Q3B["Qwen 2.5 3B (1.96 GB)"]
        Q15B["Qwen 2.5 1.5B (1.13 GB)"]
        L1B["Llama 3.2 1B (0.81 GB)"]
    end

    Presentation --> State
    State --> Services
    Services --> Native
    Native --> AI

    style Presentation fill:#1a1a2e,color:#fff,stroke:#d4af37
    style State fill:#16213e,color:#fff,stroke:#d4af37
    style Services fill:#0f3460,color:#fff,stroke:#d4af37
    style Native fill:#533483,color:#fff,stroke:#d4af37
    style AI fill:#e94560,color:#fff,stroke:#d4af37
```

---

## Frontend

- React Native 0.85.3
- React 19.2.3
- React Navigation 7.x (Native Stack)
- TypeScript 5.8.3

## State Management

- Zustand 5.x (lightweight store with selectors)

## Local Storage

- @react-native-async-storage/async-storage 3.x
- react-native-encrypted-storage (Phase 17 — planned)

## File Handling

- @react-native-documents/picker 12.x (SAF-compatible document picker)
- react-native-fs 2.x (filesystem access, model downloads)

## PDF Processing

- Custom PdfExtractor native module (Kotlin)
- PDFBox Android (com.tom-roush:pdfbox-android) for offline text extraction

## Local AI Inference

- llama.rn 0.12.x (React Native bindings for llama.cpp)
- GGUF model format (Q4_K_M quantization)

## Available Models

| Model | Size | RAM Required | Use Case |
| :--- | :--- | :--- | :--- |
| Qwen 2.5 3B Instruct | 1.96 GB | 6 GB+ | Best quality — recommended |
| Qwen 2.5 1.5B Instruct | 1.13 GB | 4 GB+ | Balanced — lower memory |
| Llama 3.2 1B Instruct | 0.81 GB | 3 GB+ | Ultra-light — fits all devices |

## Text Retrieval

- BM25 (pure TypeScript, zero dependencies)
- Hybrid BM25 + Embeddings (Phase 11 — planned)

## UI Framework

- react-native-safe-area-context 5.x
- react-native-screens 4.x
- Custom design system (theme.ts with COLORS, FONTS, SPACING, RADIUS tokens)

## Development

- Git
- npm
- Android Studio (Ladybug)
- Android SDK 36 (API level 36)
- Gradle 9.3.1

## Dependency Graph

```mermaid
graph LR
    APP["App.tsx"] --> NAV["AppNavigator"]
    NAV --> SCREENS["Screens (5)"]
    SCREENS --> COMPS["Components (4)"]
    SCREENS --> STORES["Stores (2)"]
    STORES --> SERVICES["Services (5)"]
    SERVICES --> LLAMA["llama.rn"]
    SERVICES --> RNFS["react-native-fs"]
    SERVICES --> ASYNC["AsyncStorage"]
    COMPS --> THEME["theme.ts"]

    style APP fill:#d4af37,color:#000
```
