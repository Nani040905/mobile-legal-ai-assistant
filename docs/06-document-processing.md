# Document Processing Pipeline

> **Branch:** `javascript`

---

## Overview

Document processing converts raw PDF/DOCX/TXT files into indexed, searchable, AI-queryable chunks — entirely offline.

```
File picked by user (PDF / DOCX / TXT)
        ↓
PdfExtractorModule.kt  (Native Kotlin + Apache PDFBox)
        ↓
cleanPdfText()  (textCleaner.js — JS normalization)
        ↓
splitIntoChunks()  (pdfService.js — paragraph-aware splitting)
        ↓
Chunks stored in useDocumentStore
        ↓
BM25 retrieval index built on demand (retrievalService.js)
```

---

## Step 1: File Selection

**Component:** `@react-native-documents/picker` v12.0.1

- Opens native Android file picker dialog
- Supports: `.pdf`, `.docx`, `.txt`
- Returns: `{ uri, name, size, type }` object
- File is copied to app's internal storage before processing

---

## Step 2: Text Extraction (Native Kotlin Module)

**File:** `android/app/src/main/java/com/legalai/modules/PdfExtractorModule.kt`

The native module bridges from JavaScript to Kotlin using React Native's bridge (`NativeModules`):

```javascript
// JavaScript side (pdfService.js)
const { PdfExtractor } = NativeModules;
const text = await PdfExtractor.extractText(fileUri);      // PDF
const text = await PdfExtractor.extractDocxText(fileUri);  // DOCX
const text = await PdfExtractor.extractTxtText(fileUri);   // TXT
```

**Kotlin side (PdfExtractorModule.kt):**
- Uses **Apache PDFBox Android** (`com.tom-roush:pdfbox-android:2.0.27.0`)
- Opens file from filesystem path
- Iterates all pages, strips rendering artifacts
- Returns plain UTF-8 text string via Promise resolution

**Fallback behavior:**
- On iOS or during testing when native module is unavailable → uses simulated legal contract text stub
- Logs warning: `[PdfService] PdfExtractor native module is not available. Falling back to stub.`

---

## Step 3: Text Cleaning

**File:** `src/utils/textCleaner.js`

`cleanPdfText(rawText)` normalizes PDF extraction artifacts:

- Collapse excessive whitespace (3+ spaces → single space)
- Normalize line endings (`\r\n` → `\n`)
- Remove null bytes and control characters
- Strip repeated blank lines (3+ → 2)
- Trim leading/trailing whitespace

---

## Step 4: Chunk Splitting

**File:** `src/services/pdfService.js → splitIntoChunks(text, chunkSize=1000)`

**Why chunk?**
- Legal documents: 50–200 pages → 100K+ characters
- LLM context window: 2048 tokens ≈ ~8000 characters
- We can only send the most relevant parts to the model

**Chunk size:** 1000 characters (~200–250 tokens — safe headroom within context limits)

**Splitting algorithm:**
```
For each chunk window:
1. Take up to 1000 characters
2. If NOT at end of document:
   a. Look for \n\n (paragraph break) in last 50% of chunk → split there
   b. Else look for \n (line break) in last 50% → split there
   c. Else look for '. ' (sentence end) in last 50% → split there
   d. Else: hard-split at 1000 chars
3. Trim whitespace from chunk edges
4. Advance position past processed chars and skip leading newlines
```

**Result:** Natural chunk boundaries that don't cut sentences mid-word.

---

## Step 5: Storage

**Store:** `useDocumentStore` (Zustand + secureStorage persistence)

Each document is stored as:

```javascript
{
  id: 'doc_' + Date.now(),
  name: 'EmploymentAgreement.pdf',
  uri: '/storage/emulated/0/Documents/EmploymentAgreement.pdf',
  size: 45678,           // bytes
  importedAt: 1722789000000,
  wordCount: 2340,
  text: '...',           // full raw text (100K+ chars possible)
  chunks: [              // pre-split array
    'EMPLOYMENT AGREEMENT\n\nThis Agreement is made and entered...',
    'Section 3. Compensation. Employee shall receive...',
    // ...
  ]
}
```

Documents persist across app restarts via AES-256 encrypted AsyncStorage.

---

## Step 6: BM25 Retrieval (On Demand)

**File:** `src/services/retrievalService.js`

When a user asks a question about a document, chunks are ranked by relevance:

```javascript
// API
import { rankChunks } from './retrievalService';

const rankedChunks = rankChunks(
  query,          // user's question string
  document.chunks // all chunks from the document
);
// Returns: [{ chunk: string, score: number }, ...] sorted by score descending
```

**Internal flow:**

```
tokenize(query) → ['employment', 'termination', 'notice']  (stop words removed)
        ↓
For each chunk:
  tokenize(chunk) → term frequency map
  computeIDF(term) = log((N - df + 0.5) / (df + 0.5) + 1)
  BM25_score = Σ IDF(t) × [freq(t,D) × (k1+1)] / [freq(t,D) + k1 × (1 - b + b × |D|/avgdl)]
        ↓
Sort chunks by BM25 score descending
        ↓
Return top-K chunks (default k=3)
```

**Parameters:** K1=1.5, B=0.75 (Okapi BM25 standard defaults)

---

## Step 7: Context Budget Assembly

**File:** `src/services/contextBudget.js → buildBudgetedContext()`

Before sending chunks to the LLM, the token budget manager ensures the total prompt fits within the model's context window:

```javascript
buildBudgetedContext(
  systemPrompt,         // system message text
  rankedChunks,         // sorted array of chunk strings
  userQuestion,         // the user's question
  maxContextTokens,     // 1800 (leaves headroom for system + question overhead)
  reservedOutputTokens  // 512 (reserved for the model's answer)
)

// Returns:
{
  contextText: string,   // joined chunks that fit within budget
  droppedCount: number,  // how many chunks were too large to include
  estimatedTokens: number
}
```

**Token estimation:** `chars / 4` (rough approximation — 1 token ≈ 4 English characters)

**Strategy:** Greedy fill — add chunks in rank order until budget is exhausted.

---

## Supported File Types

| Format | Extraction Method | Notes |
|---|---|---|
| `.pdf` | PDFBox Android | Native Kotlin module, handles text-layer PDFs |
| `.docx` | PDFBox Android | Microsoft Word format (basic text extraction) |
| `.txt` | Direct RNFS read | Instant — no parsing needed |
| Scanned PDF | ❌ Not supported | OCR deferred to future phase |
| `.doc` (old Word) | ❌ Not supported | Legacy format excluded |

---

## Benchmark Documents

The `evaluation/benchmarkDocuments/` directory contains **54 real Indian legal document samples** covering:

| Document Type | Examples |
|---|---|
| Criminal | FirstInformationReport, ChargeSheet, BailApplication, WritPetition |
| Civil | PlaintCivilSuit, WrittenStatementDefense, InjunctionApplication |
| Contract | EmploymentAgreement, NDAAgreement, LoanAgreement, SaaSAgreement |
| Property | SaleDeedProperty, RentalAgreement, MortgageDeed, GiftDeed |
| Corporate | ShareholdersAgreement, JointVentureAgreement, PartnershipDeed |
| IP | PatentLicenseAgreement, SoftwareLicenseAgreement, TrademarkAssignment |
| Consumer/RTI | ConsumerComplaint, RTIRequest, MedicalMalpracticeComplaint |
| Misc | WillAndTestament, PowerOfAttorney, Affidavit, IndemnityBond |

These documents power the `BenchmarkScreen` and `evaluation/retrievalBenchmark.js` recall evaluator.
