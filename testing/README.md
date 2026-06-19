# Standalone Testing Agent

This directory contains standalone JavaScript (Jest) and Python (pytest) tests for testing services, utilities, stores, and integration pipeline of the LegalAI application.

It runs completely offline, without needing a mobile emulator, device, or Metro packager.

## Prerequisites

- Node.js (v18+)
- Python 3.10+

## Setup & Running All Tests

You can run both suites using the orchestrator script:

```bash
cd testing
# Install JS dependencies
cd js && npm install && cd ..
# Install Python dependencies (optional: use a virtual environment)
cd python && pip install -r requirements.txt && cd ..

# Run all tests (unit tests, stress tests, and accuracy benchmarks)
python run_all.py
```

## Running Individually

### JavaScript Tests (Jest)

```bash
cd js
# Run unit & stress tests
npm test
```

### Python Tests (pytest)

```bash
cd python
# Run unit, stress, & benchmark tests
python -m pytest tests/ -v
```

---

## Stress & Crash Tests

We have implemented rigorous fuzzer and edge-case suites designed to test stability under extreme conditions:
- **Search Queries**: Fuzzing with empty strings, massive arrays, and identical-score document chunks.
- **Text Normalization**: 2MB streams, zero-width spaces, null bytes, and mixed Unicode characters.
- **Context Budget**: Out-of-bounds, negative, and zero token limits.
- **PDF Chunking**: Edge cases with extremely short or long texts.
- **Accuracy Verification**: Full 350-question retrieval benchmark suite.

---

## Standalone Interactive Soak Tests

For longer running sessions (e.g., 1 to 2 hours or custom durations) to stress test memory, stability, and tokenization under rapid sequential operations, standalone soak tests are available.

### JavaScript Soak Test

```bash
cd js
# Start interactive runner
node soak/run.js
```
*Supports headless/CI execution:*
```bash
# Pass minutes as argument
node soak/run.js 5

# Or via environment variable
$env:SOAK_DURATION=10; node soak/run.js
```

### Python Soak Test

```bash
cd python
# Start interactive runner
python soak/soak_runner.py
```
*Supports headless/CI execution:*
```bash
# Pass minutes as argument (run in unbuffered mode to see output immediately)
python -u soak/soak_runner.py 5

# Or via environment variable
$env:SOAK_DURATION=10; python -u soak/soak_runner.py
```

