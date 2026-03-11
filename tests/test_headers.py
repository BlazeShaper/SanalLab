import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_security_headers_present():
    """Global SecurityHeadersMiddleware başlıkları kontrol edilir."""
    response = client.get("/")
    
    assert "x-frame-options" in response.headers
    assert response.headers["x-frame-options"] == "DENY"
    
    assert "x-content-type-options" in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"
    
    assert "content-security-policy" in response.headers
    assert "default-src 'self'" in response.headers["content-security-policy"]
    
    assert "x-xss-protection" in response.headers
    assert response.headers["x-xss-protection"] == "1; mode=block"

def test_cookie_security_flags():
    """
    Login sonrası dönen auth çerezlerinde HttpOnly ve SameSite 
    flag'lerinin kesinlikle olduğundan emin olunur.
    """
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "fizik123"},
        headers={"X-CSRF-Token": "test"},
        cookies={"csrftoken": "test"},
        allow_redirects=False
    )
    
    cookies = response.headers.get_list("set-cookie")
    auth_cookie = next((c for c in cookies if "sanal_lab_auth=" in c), None)
    
    assert auth_cookie is not None
    assert "HttpOnly" in auth_cookie
    assert "SameSite=lax" in auth_cookie
    # Secure testleri ortam değişkeni production olmadığı için kapalı olabilir, pass.
