import pytest
import math

def estimate_tokens(text):
    if not text:
        return 0
    return math.ceil(len(text) / 4)

def build_budgeted_context(system_prompt, chunks, question='', max_context=1800, reserve_answer=200):
    system_tokens = estimate_tokens(system_prompt)
    question_tokens = estimate_tokens(question)
    template_overhead = 50
    
    baseline = system_tokens + question_tokens + template_overhead
    available = max_context - reserve_answer - baseline
    
    current_tokens = 0
    selected = []
    used = []
    
    for idx, chunk in enumerate(chunks):
        formatted = f"[Chunk {idx + 1}]:\n{chunk}"
        chunk_tokens = estimate_tokens(formatted)
        
        separator = estimate_tokens('\n\n---\n\n') if len(selected) > 0 else 0
        if current_tokens + chunk_tokens + separator <= available:
            selected.append(formatted)
            used.append(chunk)
            current_tokens += chunk_tokens + separator
        else:
            break
            
    context_text = '\n\n---\n\n'.join(selected)
    return {
        'context_text': context_text,
        'used_chunks': used,
        'estimated_tokens': baseline + current_tokens
    }

def test_estimate_tokens():
    assert estimate_tokens(None) == 0
    assert estimate_tokens("") == 0
    assert estimate_tokens("abcd") == 1
    assert estimate_tokens("a" * 400) == 100

def test_build_budgeted_context():
    system = "System prompt"
    chunks = [
        "First short chunk of text.",
        "Second short chunk of text.",
        "Third short chunk of text."
    ]
    
    # Large budget fits everything
    res = build_budgeted_context(system, chunks, "query", 1800, 200)
    assert len(res['used_chunks']) == 3
    assert res['estimated_tokens'] <= 1800 - 200
    
    # Small budget fits only 1 chunk
    res_small = build_budgeted_context(system, chunks, "query", 120, 50)
    assert len(res_small['used_chunks']) == 1
