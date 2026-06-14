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

# Run all tests
python run_all.py
```

## Running Individually

### JavaScript Tests (Jest)

```bash
cd js
npm test
```

### Python Tests (pytest)

```bash
cd python
python -m pytest tests/ -v
```
