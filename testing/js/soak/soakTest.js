import { tokenize, search } from '../../../LegalAI/src/services/retrievalService';
import { splitIntoChunks } from '../../../LegalAI/src/services/pdfService';
import { buildBudgetedContext } from '../../../LegalAI/src/services/contextBudget';
import { verifyAnswer } from '../../../LegalAI/src/services/answerVerifier';
import readline from 'readline';

const LEGAL_WORDS = [
  'agreement', 'liability', 'indemnification', 'confidentiality', 'termination',
  'jurisdiction', 'arbitration', 'party', 'contractor', 'client', 'payment',
  'retainer', 'disclose', 'proprietary', 'breach', 'remedies', 'notice',
  'governing', 'statute', 'clause', 'schedule', 'annexure', 'witness',
  'prosecution', 'accused', 'plaintiff', 'defendant', 'court', 'judge'
];

function generateRandomText(wordsCount) {
  const result = [];
  for (let i = 0; i < wordsCount; i++) {
    result.push(LEGAL_WORDS[Math.floor(Math.random() * LEGAL_WORDS.length)]);
  }
  return result.join(' ') + '.';
}

function generateAdversarialText() {
  const mode = Math.floor(Math.random() * 5);
  switch (mode) {
    case 0:
      return generateRandomText(100);
    case 1:
      // Unicode script mixed
      return 'सभी पक्ष देयता और क्षतिपूर्ति ' + generateRandomText(50) + ' 契約書';
    case 2:
      // Nulls and control chars mixed
      return 'Control chars: \x00\x01\x02\n\n' + generateRandomText(30) + '\x00\t';
    case 3:
      // Large text
      return generateRandomText(2000);
    case 4:
      // Empty/whitespace only
      return '   \n  \t   ';
    default:
      return '';
  }
}

function randomLegalQuery() {
  const terms = [];
  const count = Math.floor(Math.random() * 4) + 1;
  for (let i = 0; i < count; i++) {
    terms.push(LEGAL_WORDS[Math.floor(Math.random() * LEGAL_WORDS.length)]);
  }
  return terms.join(' ');
}

async function askDuration() {
  if (process.env.SOAK_DURATION) {
    const val = parseInt(process.env.SOAK_DURATION, 10);
    if (!isNaN(val)) return val;
  }
  const args = process.argv;
  // Node argv contains: ['node', 'script.js', 'arg1', ...]
  if (args.length > 2) {
    const val = parseInt(args[2], 10);
    if (!isNaN(val)) return val;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n=== LegalAI JavaScript Soak Test ===');
  console.log('How long should the soak run?');
  console.log('  [1] 5 minutes   (quick smoke test)');
  console.log('  [2] 30 minutes  (medium soak)');
  console.log('  [3] 60 minutes  (full soak)');
  console.log('  [4] 120 minutes (2-hour crash test)');
  console.log('  [5] Custom — enter minutes manually');
  
  return new Promise((resolve) => {
    rl.question('\nYour choice [1-5]: ', (answer) => {
      rl.close();
      const map = { '1': 5, '2': 30, '3': 60, '4': 120 };
      if (map[answer] !== undefined) {
        resolve(map[answer]);
      } else if (answer === '5') {
        const tempRl = readline.createInterface({ input: process.stdin, output: process.stdout });
        tempRl.question('Enter minutes: ', (customVal) => {
          tempRl.close();
          resolve(parseInt(customVal, 10) || 60);
        });
      } else {
        resolve(60);
      }
    });
  });
}

async function runSoak(minutes) {
  const startTime = Date.now();
  const deadline = startTime + minutes * 60 * 1000;
  let iteration = 0;
  const failures = [];
  console.log(`\n[START] Soak running for ${minutes} minutes. Press Ctrl+C to stop.\n`);

  while (Date.now() < deadline) {
    try {
      // 1. Generate text and clean/chunk it
      const raw = generateAdversarialText();
      const chunks = splitIntoChunks(raw, Math.floor(Math.random() * 500) + 50);

      // 2. Query search
      const query = randomLegalQuery();
      const searchResults = search(query, chunks, Math.floor(Math.random() * 5) + 1);

      // 3. Context budget
      const budget = Math.floor(Math.random() * 2000) + 200;
      const reserve = Math.floor(Math.random() * 150) + 50;
      const budgetResult = buildBudgetedContext('System prompt instructions', searchResults, query, budget, reserve);

      // 4. Verification
      const simulatedAnswer = generateRandomText(10);
      const verification = verifyAnswer(simulatedAnswer, [budgetResult.contextText]);

      // Assert Invariants
      if (!Array.isArray(chunks)) throw new Error('splitIntoChunks did not return an array');
      if (!Array.isArray(searchResults)) throw new Error('search did not return an array');
      if (searchResults.some(r => r.score < 0)) throw new Error('Negative BM25 score detected');
      if (budgetResult.estimatedTokens > budget) throw new Error('Budget exceeded');
      if (verification.confidence < 0.0 || verification.confidence > 1.0) throw new Error('Confidence out of [0, 1] range');

    } catch (e) {
      failures.push({ iteration, error: e.message });
      console.log(`[CRASH] Iter ${iteration}: ${e.message}`);
    }

    iteration++;
    if (iteration % 5000 === 0) {
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      const remaining = ((deadline - Date.now()) / 60000).toFixed(1);
      console.log(`[${elapsed}m elapsed | ${remaining}m left | ${iteration} iters | ${failures.length} failures]`);
    }
  }

  console.log(`\n=== SOAK COMPLETE ===`);
  console.log(`Duration: ${minutes} minutes`);
  console.log(`Iterations: ${iteration}`);
  console.log(`Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log('Sample errors:');
    failures.slice(0, 10).forEach(f => {
      console.log(`  [Iter ${f.iteration}] ${f.error}`);
    });
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

(async () => {
  const minutes = await askDuration();
  await runSoak(minutes);
})();
