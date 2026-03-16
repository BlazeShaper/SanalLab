import sys
import os

# Add project root to path
project_root = os.path.abspath(".")
if project_root not in sys.path:
    sys.path.insert(0, project_root)

modules_to_test = [
    "fastapi", "pydantic", "sqlalchemy", "httpx", "jwt", "slowapi", 
    "pydantic_settings", "openpyxl", "starlette",
    "app.config", "app.main", "app.db", "app.models", "app.session",
    "app.auth.jwt_handler", "app.auth.csrf", "app.auth.external_auth"
]

results = []
for module in modules_to_test:
    try:
        __import__(module)
        results.append(f"OK: {module}")
    except ImportError as e:
        results.append(f"FAIL: {module} - {e}")
    except Exception as e:
        results.append(f"ERROR: {module} - {e}")

print("\n".join(results))
