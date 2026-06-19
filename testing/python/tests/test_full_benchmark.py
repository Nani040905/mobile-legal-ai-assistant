import pytest
from test_retrieval_accuracy import split_into_chunks
from test_bm25_crossvalidation import bm25_search

def test_full_benchmark_accuracy(benchmark_questions, read_doc):
    total = len(benchmark_questions)
    correct = 0
    failed = []

    for q in benchmark_questions:
        try:
            doc_text = read_doc(q["documentName"])
            chunks = split_into_chunks(doc_text, chunk_size=1000)
            results = bm25_search(q["query"], chunks, top_k=3)
            retrieved_indices = [r["index"] for r in results]
            
            expected_index = q["expectedChunkIndex"]
            if expected_index in retrieved_indices:
                correct += 1
            else:
                failed.append({
                    "id": q["id"],
                    "query": q["query"],
                    "expected": expected_index,
                    "got": retrieved_indices
                })
        except Exception as e:
            pytest.fail(f"Pipeline crashed on question {q.get('id')} with error: {e}")

    accuracy = correct / total
    print(f"\n[Benchmark Report] Ran {total} questions. Correct: {correct}. Accuracy: {accuracy:.4f}")
    
    # Assert a reasonable accuracy threshold (e.g. at least 75% for top-3 BM25 search across all 350 questions)
    assert accuracy >= 0.75, f"Overall benchmark accuracy was too low: {accuracy:.4f}. Failed examples: {failed[:10]}"
