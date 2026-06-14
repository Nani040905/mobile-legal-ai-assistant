import pytest
import os

def test_benchmark_questions_structure(benchmark_questions):
    assert len(benchmark_questions) > 0, "No benchmark questions found."
    for q in benchmark_questions:
        assert "id" in q, "Question missing id field."
        assert "documentName" in q, f"Question {q.get('id')} missing documentName field."
        assert "query" in q, f"Question {q.get('id')} missing query field."
        assert "expectedChunkIndex" in q, f"Question {q.get('id')} missing expectedChunkIndex field."
        assert "expectedText" in q, f"Question {q.get('id')} missing expectedText field."

def test_benchmark_documents_exist(benchmark_questions, benchmark_docs_dir):
    for q in benchmark_questions:
        doc_name = q["documentName"]
        doc_path = benchmark_docs_dir / doc_name
        
        # Check case-insensitively if needed
        if not doc_path.exists():
            found = False
            for child in benchmark_docs_dir.iterdir():
                if child.name.lower() == doc_name.lower():
                    found = True
                    break
            assert found, f"Referenced document {doc_name} not found in {benchmark_docs_dir} for question {q['id']}"
        else:
            assert doc_path.is_file()

def test_expected_text_is_present_in_document(benchmark_questions, read_doc):
    # Test only first 50 questions to keep execution fast and focused, or all if we wish.
    # Let's test all of them since it's just local I/O and very fast in Python!
    for q in benchmark_questions:
        doc_text = read_doc(q["documentName"])
        expected = q["expectedText"]
        assert expected in doc_text, f"Expected text '{expected}' not found in document '{q['documentName']}' for question {q['id']}"
