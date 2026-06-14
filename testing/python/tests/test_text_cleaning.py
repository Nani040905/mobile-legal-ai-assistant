import pytest
import re

def clean_pdf_text(raw):
    if not raw:
        return ''
    
    text = raw
    
    # 1. Normalize line endings (CRLF -> LF)
    text = text.replace('\r\n', '\n')
    
    # 2. Remove non-printable or control characters (except tabs and newlines)
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    
    # 3. Remove zero-width spaces, soft hyphens, and other special characters
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    
    # 4. Remove common PDF header/footer page patterns (e.g., "Page 1 of 10", "Page 5", etc.)
    text = re.sub(r'page\s+\d+\s+of\s+\d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'page\s+\d+', '', text, flags=re.IGNORECASE)
    
    # 5. Replace multiple spaces with a single space (avoiding breaking newlines)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # 6. Normalize paragraph breaks: replace 3 or more consecutive newlines with exactly 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 7. Remove leading and trailing spaces from each line
    text = '\n'.join([line.strip() for line in text.split('\n')])
    
    # 8. Clean up final leading/trailing whitespace
    return text.strip()

@pytest.mark.parametrize("raw,expected", [
    ("Hello\r\nWorld", "Hello\nWorld"),
    ("\x00Hello\x1FWorld", "HelloWorld"),
    ("Page 1 of 10\nSome text", "Some text"),
    ("Hello    World", "Hello World"),
    ("A\n\n\n\nB", "A\n\nB"),
    ("", ""),
    (None, ""),
    ("  hello  \n  world  ", "hello\nworld"),
    ("Page 3\nContent", "Content"),
    ("\u200BHello\uFEFF", "Hello"),        # zero-width chars
    ("test\x0Btest", "testtest"),          # vertical tab/control character
    ("No Page markers here", "No Page markers here"),
    ("multi   spaces   here", "multi spaces here"),
])
def test_clean_text(raw, expected):
    assert clean_pdf_text(raw) == expected
