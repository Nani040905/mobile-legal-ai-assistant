import os
import json
import pytest
from pathlib import Path

@pytest.fixture(scope="session")
def benchmark_data_dir():
    # Path relative to testing/python directory
    return Path(__file__).resolve().parent.parent.parent / "LegalAI" / "src" / "evaluation"

@pytest.fixture(scope="session")
def benchmark_questions(benchmark_data_dir):
    questions_path = benchmark_data_dir / "benchmarkQuestions.json"
    if not questions_path.exists():
        pytest.fail(f"benchmarkQuestions.json not found at {questions_path}")
    with open(questions_path, "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture(scope="session")
def benchmark_docs_dir(benchmark_data_dir):
    docs_dir = benchmark_data_dir / "benchmarkDocuments"
    if not docs_dir.exists():
        pytest.fail(f"benchmarkDocuments directory not found at {docs_dir}")
    return docs_dir

@pytest.fixture(scope="session")
def read_doc(benchmark_docs_dir):
    def _read_doc(name):
        doc_path = benchmark_docs_dir / name
        if not doc_path.exists():
            # Try finding it lowercase or matching case
            # Find in directory case-insensitively
            for child in benchmark_docs_dir.iterdir():
                if child.name.lower() == name.lower():
                    doc_path = child
                    break
        if not doc_path.exists():
            raise FileNotFoundError(f"Document {name} not found in {benchmark_docs_dir}")
        with open(doc_path, "r", encoding="utf-8") as f:
            return f.read()
    return _read_doc
