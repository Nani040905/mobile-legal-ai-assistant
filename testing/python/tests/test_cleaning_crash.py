import pytest
import re
from test_text_cleaning import clean_pdf_text

def test_cleaner_massive_string():
    # 2MB string
    huge_text = "Page 1\n" + "A " * 1000000 + "\nPage 2 of 2"
    result = clean_pdf_text(huge_text)
    assert "Page 1" not in result
    assert "Page 2" not in result
    assert len(result) > 0

def test_cleaner_control_characters_flood():
    bad_chars = "".join(chr(i) for i in range(128) if i not in (9, 10, 13))
    cleaned = clean_pdf_text(bad_chars)
    # Check that printable ascii and tabs/newlines remain
    for c in cleaned:
        assert ord(c) >= 32 or c in ('\t', '\n')

def test_cleaner_only_zero_width_chars():
    text = "\u200B\u200C\u200D\uFEFF" * 1000
    assert clean_pdf_text(text) == ""

def test_cleaner_consecutive_newlines_random():
    text = "A" + "\n" * 500 + "B" + "\n\n\n\n\n" + "C"
    assert clean_pdf_text(text) == "A\n\nB\n\nC"

def test_cleaner_empty_and_spaces():
    assert clean_pdf_text("") == ""
    assert clean_pdf_text("   ") == ""
    assert clean_pdf_text("\n\n\n") == ""
    assert clean_pdf_text(None) == ""

def test_cleaner_unicode_preservation():
    hindi_text = "यह एक उदाहरण है।\nपेज 1\nयह दूसरा वाक्य है।"
    cleaned = clean_pdf_text(hindi_text)
    assert "यह एक उदाहरण है।" in cleaned
    assert "पेज" in cleaned # text cleaner only strips "Page X", not hindi "पेज X"
