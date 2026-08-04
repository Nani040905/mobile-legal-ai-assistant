# Technology Stack

> **Branch:** `javascript` — React Native implementation

---

## Runtime

| Component | Technology | Version | Notes |
|---|---|---|---|
| Framework | React Native | 0.85.3 | JavaScript-driven cross-platform mobile |
| Language | JavaScript (JSX) | ES2022+ | No TypeScript in this branch |
| JS Engine | Hermes | (bundled with RN 0.85) | Fast startup, low memory |
| Min Node.js | `>= 22.11.0` | — | Required by RN 0.85+ toolchain |

---

## UI & Navigation

| Component | Technology | Version | Notes |
|---|---|---|---|
| Navigation | React Navigation | 7.x | Native Stack navigator |
| Stack Driver | `@react-navigation/native-stack` | 7.16.0 | Native fragments, 60fps transitions |
| Safe Area | `react-native-safe-area-context` | 5.5.2 | Notch/inset handling |
| Screens | `react-native-screens` | 4.25.2 | Native screen optimization |
| Design System | Custom `COLORS` / `FONTS` / `SPACING` in `utils/theme.js` | — | Dark navy + gold brand palette |

---

## State Management

| Component | Technology | Version | Notes |
|---|---|---|---|
| State | Zustand | 5.0.14 | Lightweight global state |
| Persistence | `zustand/middleware persist` | (bundled) | Serializes store to storage adapter |
| Storage Adapter | `secureStorage.js` (AES-256) | — | Wraps AsyncStorage with encryption |
| Raw Storage | `@react-native-async-storage/async-storage` | 3.1.1 | Key-value device storage |

---

## AI / LLM

| Component | Technology | Version | Notes |
|---|---|---|---|
| LLM Runtime | `llama.rn` | 0.12.4 | React Native bindings for llama.cpp |
| Native Engine | `llama.cpp` | (bundled in llama.rn) | C++ GGUF inference engine |
| Model Format | GGUF Q4_K_M | — | 4-bit quantized (best quality/size ratio) |
| Primary Model | Qwen 2.5 3B Instruct | 1.96 GB | Best reasoning for Indian law |
| Light Model | Qwen 2.5 1.5B Instruct | 1.13 GB | Faster, less RAM |
| Ultra-Light | Llama 3.2 1B Instruct | 0.81 GB | Minimum footprint |
| Inference Mode | CPU-only (`n_gpu_layers: 0`) | — | Prevents Adreno GPU flash-attention crashes |
| Context Window | 2048 tokens (`n_ctx`) | — | Conservative for 6 GB device safety |
| Memory Lock | `use_mlock: true` | — | Prevents OS paging model weights |

---

## Document Processing

| Component | Technology | Notes |
|---|---|---|
| PDF Picker | `@react-native-documents/picker` 12.0.1 | Native file picker dialog |
| PDF Text Extraction | `PdfExtractorModule.kt` (Kotlin) | Custom native module |
| PDF Library | Apache PDFBox (Android port) `com.tom-roush:pdfbox-android:2.0.27.0` | Offline PDF parsing |
| Text Chunking | `pdfService.splitIntoChunks()` | Custom JS, 1000-char chunks |
| Text Cleaning | `textCleaner.cleanText()` | Normalize whitespace, control chars |
| Retrieval | `retrievalService.js` BM25 | Pure JS, zero dependencies |
| File I/O | `react-native-fs` 2.20.0 | RNFS — read/write device filesystem |

---

## Security & Storage

| Component | Technology | Notes |
|---|---|---|
| Encryption | `crypto-js` 4.2.0 | AES-256 for data at rest |
| Storage Backend | `AsyncStorage` | Key-value, device local |
| Encrypted Adapter | `secureStorage.js` | Wraps AsyncStorage with AES-256 |
| Model Files | Device filesystem via RNFS | External storage priority, `/sdcard/` fallback |

---

## Testing

| Component | Technology | Version | Notes |
|---|---|---|---|
| Unit Test Runner | Jest | 29.6.3 | Both in-app and external test suite |
| Mock Library | Jest manual mocks (`__mocks__/`) | — | Mocks for llama.rn, RNFS, AsyncStorage |
| In-app Tests | `LegalAI/__tests__/` | — | Basic component tests |
| External Tests | `testing/js/tests/` | — | Comprehensive service/store/stress tests |
| Stress Tests | Custom crash test suites | — | 7 crash-scenario test files |
| Soak Tests | `testing/js/soak/` | — | Long-running GPU memory leak detection |
| Python Evaluation | `testing/python/` | — | LLM answer quality evaluation |
| Linter | ESLint | 8.x | `@react-native/eslint-config` preset |
| Formatter | Prettier | 2.8.8 | Applied via `eslint --fix` |

---

## Build & Dev Tools

| Component | Technology | Version | Notes |
|---|---|---|---|
| Bundler | Metro | (bundled with RN 0.85) | JS bundler for React Native |
| Transpiler | Babel | 7.25.x | `@react-native/babel-preset` |
| Android Build | Gradle | 8.13 | `com.android.tools.build:gradle:8.1.1` |
| Android NDK | NDK | 27.1.12297006 | For llama.cpp C++ compilation |
| Kotlin | Kotlin | 2.1.20 | Native module language |
| Compile SDK | 36 (Android 16) | — | Targets latest Android API |
| Min SDK | 24 (Android 7.0) | — | Broad device coverage |
| Dev Environment | Android Studio | — | JBR JDK bundled |

---

## Permissions Required (Android)

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />  <!-- Model download only -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

---

## Design Tokens (`utils/theme.js`)

```javascript
COLORS = {
  background: '#0B1120',   // Deep navy — screen backgrounds
  surface: '#141E33',      // Elevated surface — cards, panels
  surfaceHigh: '#1E2D4A',  // Higher elevation — modals, inputs
  primary: '#D4A846',      // Gold amber — CTAs, active states, brand
  primaryDark: '#A67C2E',  // Darker gold — pressed states
  textPrimary: '#F0F4FF',  // Near-white — main text
  textSecondary: '#8B9CC8',// Muted blue-gray — secondary labels
  border: '#253352',       // Subtle border — dividers
  success: '#4CAF50',      // Green — success states
  warning: '#FF9800',      // Orange — warnings
  error: '#F44336',        // Red — errors
  info: '#2196F3'          // Blue — info
}
```
