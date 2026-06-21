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

---

## GPU Soak Tests

GPU soak tests stress-test the actual local LLM inference engines (such as `llama.cpp` or `llama.rn`) to check for context window leaks, VRAM fragmentation, stop-token loop hangs, and thermal limits.

### 0. Model Setup (Recommended)
To run GPU soak tests on real hardware rather than simulated fallbacks, download a small GGUF model (e.g., SmolLM 135M):
* **Recommended Model:** `smollm-135m-instruct-add-basics-q8_0.gguf` (approx. 145 MB).
* Save the file to a local path, e.g. `testing/python/model.gguf`. (GGUF files are ignored by git in `.gitignore`).

---

### 1. Python GPU Soak Test

To install `llama-cpp-python` without requiring Visual Studio compilers or CUDA build environments, install precompiled wheels:

```bash
cd python

# For CPU mode:
pip install llama-cpp-python==0.3.30 --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu

# For CUDA GPU mode (replace cu121 with your CUDA version, e.g., cu121, cu124):
pip install llama-cpp-python==0.3.4 --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

# Run the GPU soak runner (specify duration in minutes):
$env:MODEL_PATH="model.gguf"
$env:SOAK_DURATION=15
python -u soak/gpu_soak_runner.py
```
> [!NOTE]
> If CUDA runtime DLLs (e.g. `cudart64_12.dll`) are missing or not in the environment path on Windows, `llama-cpp-python` will fail to import. The runner will automatically print a warning and fall back to the **simulated GPU mock mode** to prevent any execution crashes.

---

### 2. JavaScript GPU Soak Test

The JS GPU soak runner is powered by `node-llama-cpp`. It automatically uses precompiled Vulkan, Direct3D, or CUDA backends, making GPU inference accessible on Windows even without a CUDA installation.

* **Install node-llama-cpp**:
  ```bash
  cd js
  npm install node-llama-cpp
  ```

* **Run the runner**:
  ```bash
  cd js
  # Run for 15 minutes with model path
  $env:MODEL_PATH="../python/model.gguf"
  $env:SOAK_DURATION=15
  node soak/gpu_run.js
  ```

> [!TIP]
> * **Timeout Protection**: The runner utilizes `AbortController` timeout protection (30s limit per prompt) to automatically cancel and log iterations that get stuck in infinite stop-token repetition loops.
> * **Mock Fallback**: If `node-llama-cpp` is missing or fails to load, the runner automatically falls back to the **simulated mock runner**.
