const readline = require('readline');
const fs = require('fs');
 
const CRASH_PROMPTS = [
  'Explain Section 302 IPC.',
  'List every fundamental right in the Indian Constitution.',
  'A'.repeat(50000),
  '',
  '\x00'.repeat(1000),
  'liability '.repeat(5000),
  '契約書 अनुबंध عقد '.repeat(500),
];

const ADVERSARIAL_PARAMS = [
  { maxTokens: -1, temp: 0.7 },
  { maxTokens: 99999, temp: 0.0 },
  { maxTokens: 1, temp: 1.0 },
  { maxTokens: 512, temp: 2.0 },
];

async function askDuration() {
  if (process.env.SOAK_DURATION) {
    const val = parseInt(process.env.SOAK_DURATION, 10);
    if (!isNaN(val)) return val;
  }
  const args = process.argv;
  if (args.length > 2) {
    const val = parseInt(args[2], 10);
    if (!isNaN(val)) return val;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n=== LegalAI JavaScript GPU Soak Test ===');
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

async function runGpuSoak(minutes) {
  // Try to load a real GPU runner or fallback to llama.rn mock
  let context;
  let isMock = false;

  try {
    const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
    const modelPath = process.env.MODEL_PATH || 'model.gguf';
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found at: ${modelPath}`);
    }
    console.log(`[GPU] Loading real model using node-llama-cpp from: ${modelPath}`);
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    const nativeContext = await model.createContext();
    const session = new LlamaChatSession({
      contextSequence: nativeContext.getSequence()
    });
    context = {
      completion: async (opts) => {
        session.setChatHistory([]);
        const promptText = opts.messages[opts.messages.length - 1].content;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const responseText = await session.prompt(promptText, {
            maxTokens: opts.n_predict > 0 ? opts.n_predict : undefined,
            temperature: opts.temperature,
            signal: controller.signal,
          });
          clearTimeout(timer);
          return { text: responseText };
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      }
    };
  } catch (e) {
    console.log(`[GPU] node-llama-cpp failed to load or model missing: ${e.message}`);
    console.log('Falling back to simulated llama.rn mock context.');
    console.log('To run real GPU tests in JS/Node, run: npm install node-llama-cpp');
    isMock = true;
    
    // Create a mock context that simulates latency & potential VRAM leaks
    context = {
      completion: async (opts) => {
        // Simulate inference latency (50-200ms) plus a tiny degradation factor to test leak detector
        const degradation = isMockLeaking ? 1.05 : 1.0;
        simulatedLatency = simulatedLatency * degradation;
        await new Promise(r => setTimeout(r, simulatedLatency));
        return { text: `Mock LLM response for: ${opts.messages[0].content.substring(0, 20)}...` };
      }
    };
  }

  let simulatedLatency = 100; // start at 100ms
  const isMockLeaking = Math.random() < 0.2; // 20% chance to simulate a leak in mock mode to verify leak detection works!

  const deadline = Date.now() + minutes * 60 * 1000;
  let iteration = 0;
  const failures = [];
  const latencies = [];

  console.log(`\n[GPU SOAK START] Running ${minutes} min on GPU. Ctrl+C to stop.\n`);

  while (Date.now() < deadline) {
    const prompt = CRASH_PROMPTS[Math.floor(Math.random() * CRASH_PROMPTS.length)];
    const params = ADVERSARIAL_PARAMS[Math.floor(Math.random() * ADVERSARIAL_PARAMS.length)];

    try {
      const t0 = Date.now();
      const result = await context.completion({
        messages: [{ role: 'user', content: prompt }],
        n_predict: params.maxTokens,
        stop: ['<|im_end|>', '<|endoftext|>'],
        temperature: params.temp,
      });
      const latencyMs = Date.now() - t0;
      latencies.push(latencyMs);

      // Invariants
      if (typeof result.text !== 'string') throw new Error('result.text must be string');
      if (latencyMs > 120_000) throw new Error(`Inference timeout: ${latencyMs}ms`);

      // Throughput degradation check (VRAM leak/throttle signature)
      if (latencies.length > 50) {
        const first10 = latencies.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const last10 = latencies.slice(-10).reduce((a, b) => a + b, 0) / 10;
        if (last10 > first10 * 3) {
          throw new Error(`Inference degraded 3x: ${first10.toFixed(0)}ms → ${last10.toFixed(0)}ms (VRAM leak or throttle)`);
        }
      }

    } catch (e) {
      failures.push({ iteration, error: e.message });
      console.log(`[GPU CRASH] Iter ${iteration}: ${e.message}`);
      if (isMock) {
        // Reset latency simulation on crash to recover
        simulatedLatency = 100;
      }
    }

    iteration++;
    const printInterval = isMock ? 500 : 5;
    if (iteration % printInterval === 0) {
      const elapsed = ((Date.now() - (deadline - minutes * 60 * 1000)) / 60000).toFixed(1);
      const remaining = ((deadline - Date.now()) / 60000).toFixed(1);
      const avgMs = latencies.slice(-20).reduce((a, b) => a + b, 0) / Math.max(latencies.slice(-20).length, 1);
      console.log(`[${elapsed}m elapsed | ${remaining}m left | ${iteration} iters | ${failures.length} failures | avg ${avgMs.toFixed(0)}ms/inference]`);
    }
  }

  console.log(`\n=== GPU SOAK COMPLETE ===`);
  console.log(`Duration: ${minutes} minutes`);
  console.log(`Iterations: ${iteration}`);
  console.log(`Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log("Sample errors:");
    failures.slice(0, 10).forEach(f => console.log(`  [Iter ${f.iteration}] ${f.error}`));
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

(async () => {
  const minutes = await askDuration();
  await runGpuSoak(minutes);
})();
