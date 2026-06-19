import pytest
import random
from test_context_budget_math import build_budgeted_context, estimate_tokens

def test_budget_max_context_zero():
    system = "System"
    chunks = ["Some chunk"]
    # baseline = 2 (System) + 2 (query) + 50 = 54
    res = build_budgeted_context(system, chunks, "query", 0, 0)
    assert res['used_chunks'] == []
    assert res['context_text'] == ""
    assert res['estimated_tokens'] == 54

def test_budget_negative_max_context():
    system = "System"
    chunks = ["Some chunk"]
    res = build_budgeted_context(system, chunks, "query", -100, 50)
    assert res['used_chunks'] == []
    assert res['context_text'] == ""
    assert res['estimated_tokens'] == 54

def test_budget_reserve_larger_than_max():
    system = "System"
    chunks = ["Some chunk"]
    res = build_budgeted_context(system, chunks, "query", 200, 300)
    assert res['used_chunks'] == []
    assert res['context_text'] == ""
    assert res['estimated_tokens'] == 54

def test_budget_reserve_equal_to_max():
    system = "System"
    chunks = ["Some chunk"]
    res = build_budgeted_context(system, chunks, "query", 200, 200)
    assert res['used_chunks'] == []
    assert res['context_text'] == ""
    assert res['estimated_tokens'] == 54

def test_budget_extreme_max_context():
    system = "System"
    chunks = ["Some chunk"] * 100
    res = build_budgeted_context(system, chunks, "query", 10**18, 0)
    assert len(res['used_chunks']) == 100
    assert res['estimated_tokens'] > 0

def test_budget_huge_chunk_exclusion():
    system = "System"
    # ~25K tokens chunk
    giant_chunk = ["a" * 100000]
    res = build_budgeted_context(system, giant_chunk, "query", 2000, 500)
    assert res['used_chunks'] == []
    assert res['context_text'] == ""

def test_budget_randomized_invariants():
    system = "System prompt"
    for _ in range(100):
        n_chunks = random.randint(0, 50)
        chunks = ["a" * random.randint(0, 2000) for _ in range(n_chunks)]
        max_ctx = random.randint(0, 4096)
        reserve = random.randint(0, max_ctx + 100)

        res = build_budgeted_context(system, chunks, "query", max_ctx, reserve)

        # Invariants
        baseline = 4 + 2 + 50 # System prompt (13 chars -> 4 tokens) + query (5 chars -> 2 tokens) + 50 = 56
        assert res['estimated_tokens'] <= max(max_ctx, baseline)
        assert isinstance(res['used_chunks'], list)
        assert len(res['used_chunks']) <= n_chunks
