import pytest
import math
import re

STOP_WORDS = {
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    'and', 'or', 'but', 'nor', 'so', 'yet', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'he', 'she', 'it', 'they', 'them', 'his', 'her', 'its', 'their', 'this', 'that',
    'these', 'those', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might',
    'can', 'could', 'not', 'no', 'if', 'then', 'else', 'when', 'where', 'how', 'what',
    'which', 'who', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very'
}

def tokenize(text):
    if not text:
        return []
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    tokens = cleaned.split()
    return [t for t in tokens if len(t) > 2 and t not in STOP_WORDS]

def bm25_search(query, chunks, top_k=3):
    if not chunks:
        return []
    
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
        
    tokenized_chunks = [tokenize(c) for c in chunks]
    
    doc_lengths = [len(tokens) for tokens in tokenized_chunks]
    if not doc_lengths:
        return []
    avg_doc_len = sum(doc_lengths) / len(doc_lengths)
    if avg_doc_len == 0:
        avg_doc_len = 1
        
    N = len(chunks)
    idf_map = {}
    
    for term in query_tokens:
        if term in idf_map:
            continue
        docs_with_term = sum(1 for tokens in tokenized_chunks if term in tokens)
        idf = math.log((N - docs_with_term + 0.5) / (docs_with_term + 0.5) + 1.0)
        idf_map[term] = idf
        
    scored_chunks = []
    K1 = 1.5
    B = 0.75
    
    for idx, tokens in enumerate(tokenized_chunks):
        score = 0.0
        doc_len = len(tokens)
        
        for term in query_tokens:
            idf = idf_map.get(term, 0.0)
            term_freq = sum(1 for t in tokens if t == term)
            if term_freq == 0:
                continue
                
            numerator = term_freq * (K1 + 1.0)
            denominator = term_freq + K1 * (1.0 - B + B * (doc_len / avg_doc_len))
            score += idf * (numerator / denominator)
            
        scored_chunks.append({
            'chunk': chunks[idx],
            'score': score,
            'index': idx
        })
        
    scored_chunks = [sc for sc in scored_chunks if sc['score'] > 0]
    scored_chunks.sort(key=lambda x: x['score'], reverse=True)
    return scored_chunks[:top_k]

def test_tokenize():
    # 'some' is a stop word, so it should be filtered out
    assert tokenize("Some legal terms: liability, jurisdiction.") == ["legal", "terms", "liability", "jurisdiction"]
    assert tokenize("in an of it up or go") == []

@pytest.mark.parametrize("query,chunks,expected_top_index", [
    ("termination notice", ["payment clause details...", "termination with thirty days notice..."], 1),
    ("liability indemnification", ["scope of work...", "indemnification and liability limit..."], 1),
    ("confidentiality obligation", ["parties agree...", "keep confidentiality obligation..."], 1)
])
def test_bm25_top_result(query, chunks, expected_top_index):
    results = bm25_search(query, chunks)
    assert len(results) > 0
    assert results[0]['index'] == expected_top_index

def test_bm25_no_match():
    chunks = ["first chunk text", "second chunk text"]
    results = bm25_search("banana apple", chunks)
    assert len(results) == 0
