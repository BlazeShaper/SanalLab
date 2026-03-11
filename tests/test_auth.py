import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    """Doğru kullanıcı adı ve şifre ile giriş denemesi."""
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "fizik123"},
        # Security test: Double Submit CSRF must be present to pass!
        headers={"X-CSRF-Token": "test_csrf_token"},
        cookies={"csrftoken": "test_csrf_token"}
    )
    # Login başarılı olunca yönlendirme(303) yapar
    assert response.status_code == 303
    assert "sanal_lab_auth" in response.cookies
    assert "sanal_lab_refresh" in response.cookies

def test_login_failure_wrong_password():
    """Yanlış şifre ile giriş denemesi."""
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "wrong_password"},
        headers={"X-CSRF-Token": "test_csrf_token"},
        cookies={"csrftoken": "test_csrf_token"}
    )
    # Login başarısız olunca aynı sayfaya 200 döner (Hata mesajıyla)
    assert response.status_code == 200
    assert "sanal_lab_auth" not in response.cookies
    assert "Geçersiz kullanıcı adı veya şifre" in response.text

def test_brute_force_rate_limit():
    """Çok sayıda hatalı giriş denemesinde Rate Limit (429) devreye girmeli."""
    # RATE_LIMIT_LOGIN = "5/minute"
    for _ in range(6):
        response = client.post(
            "/sanal-lab-login",
            data={"username": "hacker", "password": "try"},
            headers={"X-CSRF-Token": "test_csrf_token"},
            cookies={"csrftoken": "test_csrf_token"}
        )
    # 6. denemede 429 dönmeli
    assert response.status_code == 429
