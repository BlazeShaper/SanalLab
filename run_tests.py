import sys
import subprocess

if __name__ == '__main__':
    with open('test_out.txt', 'w', encoding='utf-8') as f:
        # Redirect stdout and stderr
        # We run pytest via subprocess to capture all output
        subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "--disable-warnings"], stdout=f, stderr=subprocess.STDOUT)
