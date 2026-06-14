import pytest
from test_bm25_crossvalidation import bm25_search

def split_into_chunks(text, chunk_size=1000):
    if len(text) <= chunk_size:
        return [text]
        
    chunks = []
    current_pos = 0
    
    while current_pos < len(text):
        chunk = text[current_pos:current_pos + chunk_size]
        
        if current_pos + chunk_size < len(text):
            paragraph_break = chunk.rfind('\n\n')
            line_break = chunk.rfind('\n')
            sentence_end = chunk.rfind('. ')
            
            if paragraph_break > chunk_size * 0.5:
                chunk = chunk[:paragraph_break]
            elif line_break > chunk_size * 0.5:
                chunk = chunk[:line_break]
            elif sentence_end > chunk_size * 0.5:
                chunk = chunk[:sentence_end + 1]
                
        chunks.append(chunk.strip())
        current_pos += len(chunk)
        
        while current_pos < len(text) and text[current_pos] == '\n':
            current_pos += 1
            
    return chunks

def test_retrieval_accuracy(benchmark_questions, read_doc):
    # Run retrieval accuracy check on first 30 benchmark questions
    # to verify that BM25 retrieves the expected chunk within top 3 results.
    failed_queries = []
    tested_count = 0
    
    for q in benchmark_questions[:30]:
        doc_text = read_doc(q["documentName"])
        chunks = split_into_chunks(doc_text, chunk_size=1000)
        
        results = bm25_search(q["query"], chunks, top_k=3)
        retrieved_indices = [r["index"] for r in results]
        
        expected_index = q["expectedChunkIndex"]
        tested_count += 1
        
        if expected_index not in retrieved_indices:
            failed_queries.append({
                "id": q["id"],
                "query": q["query"],
                "expected": expected_index,
                "got": retrieved_indices
            })
            
    # We expect high retrieval accuracy (e.g. at least 80% of top-3 contain the expected chunk)
    accuracy = (tested_count - len(failed_queries)) / tested_count
    assert accuracy >= 0.8, f"Retrieval accuracy too low: {accuracy:.2f}. Failed queries: {failed_queries}"
