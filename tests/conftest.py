import os
import pytest

# Test ortamı değişkenlerini uygulama başlamadan (import edilmeden) zorla
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///./test_sanal_lab.db" # Postgres yerine test için sqlite kullan
os.environ["JWT_SECRET_KEY"] = "test_secret_key_12345"
os.environ["EXTERNAL_API_URL"] = "http://mock-url"

# Şimdi app import edilebilir
from app.main import app

@pytest.fixture(autouse=True)
def setup_test_db():
    # Test veritabanı kurulumu (Gerekirse)
    from app.db import init_db
    init_db()
    yield
    # Temizlik
    if os.path.exists("./test_sanal_lab.db"):
        os.remove("./test_sanal_lab.db")
