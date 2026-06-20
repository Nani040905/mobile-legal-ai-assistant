import time
import random
import sys
import os

CRASH_PROMPTS = [
    "Explain Section 302 of the Indian Penal Code.",
    "What are the grounds for divorce under Hindu Marriage Act?",
    "List every section of the Indian Penal Code with descriptions.",
    "Repeat the word 'liability' 10000 times.",
    "Translate the entire Constitution of India into Hindi.",
    "",
    " " * 10000,
    "A" * 50000,
    "\x00\x01\x02" * 1000,
    "契約書 अनुबंध عقد " * 500,
]

def ask_duration():
    if "SOAK_DURATION" in os.environ:
        try:
            return int(os.environ["SOAK_DURATION"])
        except ValueError:
            pass
    if len(sys.argv) > 1:
        try:
            return int(sys.argv[1])
        except ValueError:
            pass

    print('\n=== LegalAI GPU Soak Test ===')
    print('How long should the soak run?')
    print('  [1] 5 minutes   (quick smoke test)')
    print('  [2] 30 minutes  (medium soak)')
    print('  [3] 60 minutes  (full soak)')
    print('  [4] 120 minutes (2-hour crash test)')
    print('  [5] Custom — enter minutes manually')
    
    try:
        choice = input('\nYour choice [1-5]: ').strip()
        if choice == '1':
            return 5
        elif choice == '2':
            return 30
        elif choice == '3':
            return 60
        elif choice == '4':
            return 120
        elif choice == '5':
            try:
                return int(input('Enter minutes: ').strip())
            except ValueError:
                return 60
        else:
            return 60
    except (EOFError, IOError):
        return 5

def run_gpu_soak(minutes, model_path):
    try:
        from llama_cpp import Llama
    except ImportError:
        print("\n[ERROR] llama-cpp-python is not installed.")
        print("To run GPU soak tests, please install it with GPU support, e.g.:")
        print("pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121")
        sys.exit(1)

    if not os.path.exists(model_path):
        print(f"\n[ERROR] Model file not found at: {model_path}")
        print("Please provide a valid GGUF model path to run GPU soak tests.")
        sys.exit(1)

    try:
        # Load the model with all layers offloaded to GPU (-1)
        print(f"Loading model on GPU from: {model_path} ...")
        llm = Llama(model_path=model_path, n_gpu_layers=-1, n_ctx=2048)
    except Exception as e:
        print(f"\n[ERROR] Failed to load model on GPU: {e}")
        sys.exit(1)

    start_time = time.time()
    deadline = start_time + minutes * 60
    iteration = 0
    failures = []
    latencies = []

    print(f"\n[GPU SOAK START] Running {minutes} min on GPU. Press Ctrl+C to stop.\n")

    try:
        while time.time() < deadline:
            prompt = random.choice(CRASH_PROMPTS)
            try:
                start = time.time()
                output = llm(
                    prompt,
                    max_tokens=512,
                    stop=["<|im_end|>", "<|endoftext|>"],
                    temperature=0.7,
                )
                elapsed_ms = (time.time() - start) * 1000
                latencies.append(elapsed_ms)

                # Invariant checks
                if not isinstance(output, dict) or 'choices' not in output:
                    raise ValueError("Output format invalid")
                text = output['choices'][0]['text']
                if not isinstance(text, str):
                    raise ValueError("Generated text is not a string")
                if elapsed_ms > 120_000:
                    raise TimeoutError(f"Inference took too long: {elapsed_ms:.0f}ms")

                # Track latency degradation
                if len(latencies) > 50:
                    first_10_avg = sum(latencies[:10]) / 10
                    last_10_avg = sum(latencies[-10:]) / 10
                    if last_10_avg > first_10_avg * 3:
                        raise RuntimeError(
                            f"Inference time degraded 3x: {first_10_avg:.0f}ms → {last_10_avg:.0f}ms "
                            f"(possible VRAM leak or thermal throttle)"
                        )

            except Exception as e:
                failures.append({'iter': iteration, 'prompt_len': len(prompt), 'err': str(e)})
                print(f"[GPU CRASH] Iter {iteration}: {type(e).__name__}: {e}")

            iteration += 1
            if iteration % 10 == 0:
                elapsed = (time.time() - start_time) / 60
                remaining = (deadline - time.time()) / 60
                avg_ms = sum(latencies[-20:]) / max(len(latencies[-20:]), 1)
                print(f"[{elapsed:.1f}m elapsed | {remaining:.1f}m left | {iteration} iters | {len(failures)} failures | avg {avg_ms:.0f}ms/inference]")

    except KeyboardInterrupt:
        print("\n[STOP] Soak test interrupted by user.")

    elapsed = (time.time() - start_time) / 60
    print(f"\n=== GPU SOAK COMPLETE ===")
    print(f"Duration: {elapsed:.2f} minutes")
    print(f"Iterations: {iteration}")
    print(f"Failures: {len(failures)}")
    if failures:
        print("Sample errors:")
        for f in failures[:10]:
            print(f"  [Iter {f['iter']}] {f['err']}")
            
    sys.exit(0 if len(failures) == 0 else 1)

if __name__ == '__main__':
    model_path = os.environ.get("MODEL_PATH", "model.gguf")
    # If the user did not supply a model, print a help message instead of crashing
    if not os.path.exists(model_path) and not "SOAK_DURATION" in os.environ:
        print("\n=== LegalAI GPU Soak Helper ===")
        print("To run the GPU soak test, you must specify the path to a .gguf model file.")
        print("Example:")
        print("  $env:MODEL_PATH=\"C:\\path\\to\\model.gguf\"")
        print("  python soak\\gpu_soak_runner.py 5")
        sys.exit(0)
        
    minutes = ask_duration()
    run_gpu_soak(minutes, model_path)
