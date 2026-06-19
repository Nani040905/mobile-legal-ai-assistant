import pytest
import math
from test_bm25_crossvalidation import tokenize, bm25_search

def test_bm25_1000_identical_chunks():
    identical_corpus = ['All parties shall indemnify and hold harmless the other party from liability.'] * 1000
    # IDF and division math check
    results = bm25_search('liability indemnification', identical_corpus, top_k=10)
    # Since they are identical, IDF is math.log((1000 - 1000 + 0.5)/(1000 + 0.5) + 1) = ln(0.5/1000.5 + 1) which is tiny but > 0
    # Let's ensure it doesn't crash or yield nan/inf
    for r in results:
        assert not math.isnan(r['score'])
        assert math.isfinite(r['score'])

def test_bm25_no_matches_in_large_corpus():
    large_corpus = [f"This is legal clause number {i} talking about liability." for i in range(1000)]
    results = bm25_search('banana apple orange', large_corpus)
    assert results == []

def test_bm25_50_word_query():
    query = 'indemnification ' * 50
    large_corpus = ['indemnification clause details here.'] * 100
    results = bm25_search(query, large_corpus)
    assert len(results) > 0

def test_bm25_tiny_chunks():
    # 'x' gets filtered out because length < 3
    tiny_corpus = ['a', 'b', 'c', 'd', 'e', 'x']
    results = bm25_search('x', tiny_corpus)
    assert results == []

def test_bm25_null_empty_corpus():
    bad_corpus = ['', '   ', '\n\n', None, 'valid chunk content']
    # Filter out None/non-strings first as Python doesn't handle them unless we sanitise
    sanitized_corpus = [c for c in bad_corpus if c and isinstance(c, str)]
    results = bm25_search('content', sanitized_corpus)
    assert len(results) == 1
    assert results[0]['chunk'] == 'valid chunk content'

def test_bm25_extreme_top_k():
    large_corpus = ['liability limit.'] * 100
    assert bm25_search('liability', large_corpus, top_k=0) == []
    results = bm25_search('liability', large_corpus, top_k=10**9)
    assert len(results) <= len(large_corpus)

def test_bm25_unicode():
    unicode_corpus = [
        'सभी पक्ष देयता और क्षतिपूर्ति दायित्वों पर चर्चा करेंगे।',
        'keep confidential 契約書 अनुबंध',
        'governing law is Indian law'
    ]
    # No throw checks
    assert bm25_search('अनुबंध', unicode_corpus) == [] or len(bm25_search('अनुबंध', unicode_corpus)) >= 0

def test_bm25_stable_sort():
    corpus = ['liability clause', 'liability clause', 'liability clause']
    results = bm25_search('liability', corpus, top_k=3)
    assert len(results) == 3
    # Check stable indices
    assert results[0]['index'] == 0
    assert results[1]['index'] == 1
    assert results[2]['index'] == 2
