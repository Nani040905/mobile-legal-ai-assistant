import { cleanPdfText } from '../../../../LegalAI/src/utils/textCleaner';

describe('textCleaner - cleanPdfText', () => {
  test('should return empty string for null, undefined, or empty inputs', () => {
    expect(cleanPdfText(null)).toBe('');
    expect(cleanPdfText(undefined)).toBe('');
    expect(cleanPdfText('')).toBe('');
  });

  test('should normalize CRLF line endings to LF', () => {
    expect(cleanPdfText('Line 1\r\nLine 2\r\nLine 3')).toBe('Line 1\nLine 2\nLine 3');
  });

  test('should remove control characters except tab and newline', () => {
    expect(cleanPdfText('Hello\x00World\x1F')).toBe('HelloWorld');
  });

  test('should remove zero-width and format characters', () => {
    expect(cleanPdfText('Hello\u200BWorld\uFEFF')).toBe('HelloWorld');
  });

  test('should remove common page markers like Page X of Y or Page X case-insensitively', () => {
    expect(cleanPdfText('Some legal content\npage 1 of 10\nMore content')).toBe('Some legal content\n\nMore content');
    expect(cleanPdfText('Some legal content\nPage 12\nMore content')).toBe('Some legal content\n\nMore content');
  });

  test('should collapse multiple horizontal spaces or tabs into a single space', () => {
    expect(cleanPdfText('Hello    World\t\t\tGood  Morning')).toBe('Hello World Good Morning');
  });

  test('should limit consecutive newlines to maximum of 2', () => {
    expect(cleanPdfText('Line 1\n\n\n\n\nLine 2')).toBe('Line 1\n\nLine 2');
  });

  test('should trim leading/trailing whitespace from each line and from the overall text', () => {
    expect(cleanPdfText('   Line 1   \n\tLine 2\t  ')).toBe('Line 1\nLine 2');
  });
});
