import time
import sys
import random
import os

# Set Python path to include parent tests directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tests")))

from test_bm25_crossvalidation import tokenize, bm25_search
from test_retrieval_accuracy import split_into_chunks
from test_context_budget_math import build_budgeted_context, estimate_tokens
from test_text_cleaning import clean_pdf_text

LEGAL_WORDS = [
    'agreement', 'liability', 'indemnification', 'confidentiality', 'termination',
    'jurisdiction', 'arbitration', 'party', 'contractor', 'client', 'payment',
    'retainer', 'disclose', 'proprietary', 'breach', 'remedies', 'notice',
    'governing', 'statute', 'clause', 'schedule', 'annexure', 'witness',
    'prosecution', 'accused', 'plaintiff', 'defendant', 'court', 'judge'
]

def generate_random_text(word_count):
    words = [random.choice(LEGAL_WORDS) for _ in range(word_count)]
    return " ".join(words) + "."

def generate_adversarial_text():
    mode = random.randint(0, 4)
    if mode == 0:
        return generate_random_text(100)
    elif mode == 1:
        # Unicode script mixed
        return 'सभी पक्ष देयता और क्षतिपूर्ति ' + generate_random_text(50) + ' 契約書'
    elif mode == 2:
        # Nulls and control chars mixed
        return 'Control chars: \x00\x01\x02\n\n' + generate_random_text(30) + '\x00\t'
    elif mode == 3:
        # Large text
        return generate_random_text(2000)
    elif mode == 4:
        # Empty/whitespace only
        return '   \n  \t   '
    return ''

def random_legal_query():
    count = random.randint(1, 4)
    return " ".join(random.choice(LEGAL_WORDS) for _ in range(count))

def ask_duration():
    # Fallback to env var or CLI argument if present
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

    print('\n=== LegalAI Python Soak Test ===')
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
        # Fallback if stdin is not a TTY or is empty
        return 5


def run_soak(minutes):
    start_time = time.time()
    deadline = start_time + minutes * 60
    iteration = 0
    failures = []
    print(f"\n[START] Python Soak running for {minutes} minutes. Press Ctrl+C to stop.\n")

    try:
        while time.time() < deadline:
            try:
                # 1. Generate and clean/chunk
                raw = generate_adversarial_text()
                cleaned = clean_pdf_text(raw)
                chunks = split_into_chunks(cleaned, chunk_size=random.randint(50, 500))

                # 2. Search
                query = random_legal_query()
                search_results = bm25_search(query, chunks, top_k=random.randint(1, 5))

                # 3. Context budget
                # Flatten the list of dicts to chunk texts for python helper
                chunk_texts = [r['chunk'] for r in search_results]
                budget = random.randint(200, 2000)
                reserve = random.randint(50, 150)
                
                budget_result = build_budgeted_context(
                    'System prompt instructions',
                    chunk_texts,
                    query,
                    max_context=budget,
                    reserve_answer=reserve
                )

                # Invariant checks
                if not isinstance(chunks, list):
                    raise ValueError('split_into_chunks did not return a list')
                if not isinstance(search_results, list):
                    raise ValueError('bm25_search did not return a list')
                if any(r['score'] < 0 for r in search_results):
                    raise ValueError('Negative BM25 score detected')
                
                # Check budget limit (allow baseline buffer if budget is too small)
                system_tokens = estimate_tokens('System prompt instructions') # 6 tokens
                query_tokens = estimate_tokens(query)
                baseline = system_tokens + query_tokens + 50
                if budget_result['estimated_tokens'] > max(budget, baseline):
                    raise ValueError(f"Budget exceeded: {budget_result['estimated_tokens']} vs max({budget}, {baseline})")

            except Exception as e:
                failures.append({'iter': iteration, 'err': str(e)})
                print(f"[CRASH] Iter {iteration}: {e}")

            iteration += 1
            if iteration % 5000 == 0:
                elapsed = (time.time() - start_time) / 60
                remaining = (deadline - time.time()) / 60
                print(f"[{elapsed:.1f}m elapsed | {remaining:.1f}m left | {iteration} iters | {len(failures)} failures]")

    except KeyboardInterrupt:
        print("\n[STOP] Soak test interrupted by user.")

    elapsed = (time.time() - start_time) / 60
    print(f"\n=== SOAK COMPLETE ===")
    print(f"Duration: {elapsed:.2f} minutes")
    print(f"Iterations: {iteration}")
    print(f"Failures: {len(failures)}")
    if failures:
        print("Sample errors:")
        for f in failures[:10]:
            print(f"  [Iter {f['iter']}] {f['err']}")
    
    sys.exit(0 if len(failures) == 0 else 1)

if __name__ == '__main__':
    minutes = ask_duration()
    run_soak(minutes)
