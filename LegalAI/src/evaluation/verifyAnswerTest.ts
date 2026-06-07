import { verifyAnswer } from '../services/answerVerifier';

console.log('====================================================');
console.log('   RUNNING HALLUCINATION DETECTOR VALIDATION TESTS  ');
console.log('====================================================');

const sourceChunks = [
  'The Lessee shall pay a monthly rent of Rs. 25,000 on or before the 5th of each calendar month. Late payments shall incur a penalty of 10% per day.',
  'This agreement shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Delhi.',
  'The Security Deposit of Rs. 75,000 shall be refunded to the Lessee within 15 days from the date of vacating the premises, subject to deductions for damages.'
];

const testCases = [
  {
    name: '1. Fully Grounded Answer',
    answer: 'The monthly rent is Rs. 25,000. It must be paid by the 5th of each month. Otherwise, a penalty of 10% per day will apply.',
    expectedMinConfidence: 0.9,
    expectWarning: false
  },
  {
    name: '2. Grounded Answer with Indian Law jurisdiction details',
    answer: 'Any dispute arising under this lease agreement will be resolved in Delhi courts under the laws of India.',
    expectedMinConfidence: 0.8,
    expectWarning: false
  },
  {
    name: '3. Partially Hallucinated Answer (unsupported rent amount and date)',
    answer: 'The tenant must pay a monthly rent of Rs. 40,000. The payment should be made by the 10th of every month. The disputes are resolved in Delhi.',
    // Claims: "The tenant must pay a monthly rent of Rs. 40,000" (no match)
    //         "The payment should be made by the 10th of every month" (no match)
    //         "The disputes are resolved in Delhi" (matches Delhi and disputes in chunk 2)
    // Overlap: 1 / 3 verified. Confidence: ~0.33
    expectedMaxConfidence: 0.5,
    expectWarning: true
  },
  {
    name: '4. Fully Hallucinated Answer (unrelated details)',
    answer: 'The landlord is Bill Gates. He owns a pet monkey named George who is allowed in the building.',
    expectedMaxConfidence: 0.1,
    expectWarning: true
  },
  {
    name: '5. Answer containing standard Legal Disclaimers (should be skipped from claims)',
    answer: 'The security deposit is Rs. 75,000. It is refunded within 15 days. Note that this response is for informational purposes only and does not constitute legal advice.',
    expectedMinConfidence: 0.9,
    expectWarning: false
  }
];

let failedCount = 0;

testCases.forEach((tc) => {
  console.log(`\nTest Case: ${tc.name}`);
  console.log(`Answer   : "${tc.answer}"`);
  
  const result = verifyAnswer(tc.answer, sourceChunks);
  
  console.log(`Result   : Confidence = ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Warning  : ${result.warning || 'None'}`);
  if (result.unverifiedClaims.length > 0) {
    console.log(`Unverified Claims:`);
    result.unverifiedClaims.forEach(c => console.log(`  - "${c}"`));
  }
  
  let passed = true;
  if (tc.expectedMinConfidence !== undefined && result.confidence < tc.expectedMinConfidence) {
    console.error(`❌ FAILED: Confidence ${result.confidence} is below expected minimum ${tc.expectedMinConfidence}`);
    passed = false;
  }
  if (tc.expectedMaxConfidence !== undefined && result.confidence > tc.expectedMaxConfidence) {
    console.error(`❌ FAILED: Confidence ${result.confidence} exceeds expected maximum ${tc.expectedMaxConfidence}`);
    passed = false;
  }
  if (tc.expectWarning && !result.warning) {
    console.error(`❌ FAILED: Expected a warning but got none`);
    passed = false;
  }
  if (!tc.expectWarning && result.warning) {
    console.error(`❌ FAILED: Expected no warning but got "${result.warning}"`);
    passed = false;
  }
  
  if (passed) {
    console.log(`✅ PASSED`);
  } else {
    failedCount++;
  }
});

console.log('\n====================================================');
if (failedCount === 0) {
  console.log('🎉 ALL TEST CASES PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`❌ ${failedCount} TEST CASE(S) FAILED.`);
  process.exit(1);
}
