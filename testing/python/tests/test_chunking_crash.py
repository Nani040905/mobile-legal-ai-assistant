import pytest
from test_retrieval_accuracy import split_into_chunks
from test_text_cleaning import clean_pdf_text

def test_chunking_1mb_paragraph():
    huge_text = "a" * 1000000
    res = split_into_chunks(huge_text, chunk_size=1000)
    assert len(res) > 0

def test_chunking_empty_string():
    assert split_into_chunks("", chunk_size=100) == [""]

def test_chunking_no_spaces_long():
    long_word = "a" * 10000
    res = split_into_chunks(long_word, chunk_size=500)
    assert len(res) > 0

def test_chunking_consecutive_breaks_flood():
    text = "Part 1" + "\n\n" * 10000 + "Part 2"
    # Should not throw or hang
    res = split_into_chunks(text, chunk_size=500)
    assert len(res) > 0

def test_chunking_clean_null_bytes():
    bad_text = "First paragraph.\x00\x01\x02\n\nSecond\x00\x00\x00 paragraph."
    cleaned = clean_pdf_text(bad_text)
    chunks = split_into_chunks(cleaned, chunk_size=20)
    assert len(chunks) == 2
    assert "\x00" not in chunks[0]
    assert "\x00" not in chunks[1]

def test_chunking_hindi():
    hindi_text = "यह पहला पैराग्राफ है।\n\nयह दूसरा पैराग्राफ है।"
    chunks = split_into_chunks(hindi_text, chunk_size=25)
    assert len(chunks) == 2
    assert chunks[0] == "यह पहला पैराग्राफ है।"

def test_chunking_sequential_runs():
    doc_text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    for _ in range(50):
        chunks = split_into_chunks(doc_text, chunk_size=100)
        assert len(chunks) == 1

def test_chunking_size_invariant():
    texts = [
        "A " * 5000,
        "Sentence one. Sentence two. Sentence three. Sentence four.",
        "\n\n\n\n",
        "Short.",
        "Long sentence with many words that goes on and on " * 50
    ]
    sizes = [10, 50, 100, 500, 1000]
    for text in texts:
        for size in sizes:
            chunks = split_into_chunks(text, chunk_size=size)
            assert len(chunks) > 0
            for chunk in chunks:
                # If a single sentence/word is longer than chunk_size, it will exceed it,
                # but it should not crash, and the length should be <= len(text).
                assert len(chunk) <= max(size, len(text))
