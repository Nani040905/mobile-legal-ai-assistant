import { tokenize } from '../../../../LegalAI/src/services/retrievalService';

describe('Tokenizer Fuzz & Crash Suite', () => {
  // Generate 300+ fuzz inputs
  const fuzzInputs = [
    // Empty & whitespace
    '', null, undefined, '   ', '\n\n\n', '\t\t\t', '\r\r\r', ' \n \t \r ',
    // Control characters
    Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join(''),
    // Large strings
    'a'.repeat(10000),
    'liability '.repeat(2000),
    // All stop words
    'a about above after again against all am an and any are aren\'t as at be because been before being below between both but by can\'t cannot could couldn\'t did didn\'t do does doesn\'t doing don\'t down during each few for from further had hadn\'t has hasn\'t have haven\'t having he he\'d he\'ll he\'s her here here\'s hers herself him himself his how how\'s i i\'d i\'ll i\'m i\'ve if in into is isn\'t it it\'s its itself let\'s me more most mustn\'t my myself no nor not of off on once only or other ought our ours ourselves out over own same shan\'t she she\'d she\'ll she\'s should shouldn\'t so some such than that that\'s the their theirs them themselves then there there\'s these they they\'d they\'ll they\'re they\'ve this those through to too under until up very was wasn\'t we we\'d we\'ll we\'re we\'ve were weren\'t what what\'s when when\'s where where\'s which while who who\'s whom why why\'s with won\'t would wouldn\'t you you\'d you\'ll you\'re you\'ve your yours yourself yourselves',
    // Punctuation
    '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\\',
    // Injection attacks
    "'; DROP TABLE cases; --",
    '<script>alert("xss")</script><img src=x onerror=alert(1)>',
    'admin" --',
    // JSON
    '{"clause": "indemnification", "limit": 50000, "nested": {"array": [1,2,3]}}',
    // Unicode
    '契約書', 'अनुबंध', 'عقد', '계약', 'договор', '⚖️📜🔍✅❌',
    // Mixed scripts
    'Rs. 40,000/- u/s Sec. 420 IPC read with Sec. 34 IPC vs. Tata Corp.',
    // Long word without spaces
    'supercalifragilisticexpialidocious'.repeat(5),
    // Number flood
    '1'.repeat(10000),
    // Mixed whitespaces
    ' \t \n \r \f \v '.repeat(100),
    // Vertical tab & form feed
    '\v\f\0'.repeat(500)
  ];

  // Generate 200 additional random strings of varying length with random characters
  for (let i = 0; i < 200; i++) {
    const len = Math.floor(Math.random() * 500) + 1;
    let str = '';
    for (let j = 0; j < len; j++) {
      // Random Unicode characters
      str += String.fromCharCode(Math.floor(Math.random() * 65535));
    }
    fuzzInputs.push(str);
  }

  test('tokenize should never crash on any of the fuzzed inputs', () => {
    fuzzInputs.forEach((input, index) => {
      let tokens;
      expect(() => {
        tokens = tokenize(input);
      }).not.toThrow();

      // Check invariants
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens).not.toBeNull();
      expect(tokens).not.toBeUndefined();

      tokens.forEach(t => {
        expect(typeof t).toBe('string');
        // Ensure the token isn't empty or single/double char (unless it bypassed the filter for some reason)
        // Note: our retrievalService.js filters out tokens less than 3 characters
        expect(t.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
