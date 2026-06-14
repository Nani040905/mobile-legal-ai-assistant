# Runs both Jest and pytest, prints combined report
import subprocess
import sys
import os

def run():
    print("=== Running JavaScript Jest Tests ===")
    js_result = subprocess.run(['npm', 'test'], cwd='js', shell=True)
    
    print("\n=== Running Python pytest Tests ===")
    # Run using the local venv python executable
    py_result = subprocess.run(['..\\venv\\Scripts\\python.exe', '-m', 'pytest', 'tests/', '-v'], cwd='python', shell=True)
    
    passed = (js_result.returncode == 0) and (py_result.returncode == 0)
    if passed:
        print("\nALL TESTS PASSED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print("\nSOME TESTS FAILED!")
        sys.exit(1)

if __name__ == '__main__':
    run()
