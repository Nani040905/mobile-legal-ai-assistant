# App Screens

## Screen Navigation Map

```mermaid
graph TD
    HOME["HomeScreen"] -->|"Chat card"| CHAT["ChatScreen"]
    HOME -->|"Documents card"| DOCS["DocumentsScreen"]
    HOME -->|"Settings card"| SETTINGS["SettingsScreen"]
    DOCS -->|"Tap document"| DETAILS["DocumentDetailsScreen"]
    DETAILS -->|"Analyze Risks (Planned)"| RISK["RiskReportScreen"]
    SETTINGS -->|"Back"| HOME

    style HOME fill:#d4af37,color:#000
    style CHAT fill:#1a1a2e,color:#fff,stroke:#d4af37
    style DOCS fill:#1a1a2e,color:#fff,stroke:#d4af37
    style SETTINGS fill:#1a1a2e,color:#fff,stroke:#d4af37
    style DETAILS fill:#1a1a2e,color:#fff,stroke:#d4af37
    style RISK fill:#1a1a2e,color:#fff,stroke:#d4af37,stroke-dasharray: 5
```

---

## 1. Home Screen

Features:

- Quick-action cards: Chat, Documents, Settings
- AI model status badge (Ready / Loading / Idle / Error / Downloading)
- App branding and tagline

```mermaid
graph TB
    subgraph HomeScreen
        HEADER["Header: Legal AI Assistant"]
        STATUS["Model Status Badge"]
        CARDS["Action Cards Grid"]
        CHAT_CARD["💬 Chat Card"]
        DOCS_CARD["📄 Documents Card"]
        SETTINGS_CARD["⚙️ Settings Card"]

        HEADER --> STATUS
        STATUS --> CARDS
        CARDS --> CHAT_CARD
        CARDS --> DOCS_CARD
        CARDS --> SETTINGS_CARD
    end
```

---

## 2. Chat Screen

Features:

- Scrollable message list (FlatList)
- User and AI message bubbles with distinct styling
- Text input with send button
- Stop/cancel button (red) appears during AI generation
- Loading indicator: "AI is thinking..."
- ELI5 mode toggle (Phase 15 — planned)
- Source citation panel below AI messages (Phase 8.7 — planned)
- Hallucination warning banner (Phase 8.6 — planned)

```mermaid
sequenceDiagram
    participant User
    participant ChatInput
    participant ChatStore as useChatStore
    participant LLM as llmService
    participant Model as modelManager

    User->>ChatInput: Types message + taps Send
    ChatInput->>ChatStore: sendMessage(text)
    ChatStore->>ChatStore: Add user message to state
    ChatStore->>LLM: generateResponse(prompt)
    LLM->>Model: getContext()
    Model-->>LLM: LlamaContext
    LLM->>Model: context.completion()
    loop Streaming Tokens
        Model-->>LLM: { token }
        LLM-->>ChatStore: onToken callback
        ChatStore-->>User: Real-time display
    end
    LLM-->>ChatStore: Final response
    ChatStore->>ChatStore: Update AI message
```

---

## 3. Documents Screen

Features:

- Upload PDF via native document picker
- List all stored documents with file size and date
- Delete individual documents with swipe or tap
- Navigate to Document Details

---

## 4. Document Details Screen

Features:

- View document name, size, chunk count
- Generate AI summary (streaming)
- Ask questions about the document (RAG with BM25 retrieval)
- View extracted text chunks
- Analyze Risks button (Phase 13 — planned)

```mermaid
sequenceDiagram
    participant User
    participant DDS as DocumentDetailsScreen
    participant Retrieval as retrievalService
    participant LLM as llmService

    User->>DDS: Asks question about document
    DDS->>Retrieval: search(query, chunks, topK=3)
    Retrieval->>Retrieval: BM25 scoring
    Retrieval-->>DDS: Top K scored chunks
    DDS->>Retrieval: getRelevantContext()
    Retrieval-->>DDS: Formatted context with [Chunk X] labels
    DDS->>LLM: answerQuestion(question, context)
    loop Streaming
        LLM-->>DDS: Tokens
    end
    LLM-->>DDS: Complete answer
    DDS-->>User: Display answer
```

---

## 5. Settings Screen

Features:

- **Change Active Model** card — select from 3 model options with size badges
- **AI Model Controller** card — shows active model name, format, engine, status
  - Download model button with progress bar
  - Load / Unload model buttons
  - Cancel download button
- **Storage Info** card — document count, total size
- **Performance Dashboard** (Phase 16 — planned)
- **Privacy & Security** controls (Phase 17 — planned)
- **Danger Zone** — clear all documents, clear chat history

```mermaid
stateDiagram-v2
    [*] --> NotDownloaded
    NotDownloaded --> Downloading: User taps Download
    Downloading --> NotDownloaded: User cancels
    Downloading --> Idle: Download complete
    Idle --> Loading: User taps Load
    Loading --> Ready: Model loaded
    Loading --> Error: Load failed
    Ready --> Idle: User taps Unload
    Error --> Idle: User retries
    Error --> Loading: User taps Reload
    Ready --> Idle: Switch model
```

---

## 6. Risk Report Screen (Phase 13 — Planned)

Features:

- Color-coded risk cards (red=high, amber=medium, green=low)
- Missing clauses section
- Recommendations list
- Accessed from Document Details Screen
