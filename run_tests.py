import pytest
import sys

if __name__ == '__main__':
    with open('test_out.txt', 'w', encoding='utf-8') as f:
        # Redirect stdout and stderr
        # pytest.main overrides sys.stdout, so we pass it as an argument or just run it via subprocess
        pass

import subprocess
with open('test_out.txt', 'w', encoding='utf-8') as f:
    subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "--disable-warnings"], stdout=f, stderr=subprocess.STDOUT)
