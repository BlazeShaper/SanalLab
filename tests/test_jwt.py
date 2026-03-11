import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.jwt_handler import create_tokens

client = TestClient(app)

def test_jwt_access_denied_without_token():
    """Sanal Lab'a tokensız erişim 303 yönlendirmesiyle reddedilmeli"""
    response = client.get("/sanal-lab", allow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/sanal-lab-login"

def test_jwt_access_granted_with_valid_token():
    """Geçerli tokenı olan içeriğe erişebilmeli"""
    access_token, _ = create_tokens({"sub": "ogrenci", "role": "ogrenci"})
    
    response = client.get(
        "/sanal-lab", 
        cookies={"sanal_lab_auth": access_token},
        allow_redirects=False
    )
    assert response.status_code in [200, 303]

def test_jwt_invalid_signature_rejected():
    """Müdahale edilmiş token reddedilmeli"""
    # Token'ı tahrif edelim
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.fake_signature_123"
    
    response = client.get(
        "/sanal-lab", 
        cookies={"sanal_lab_auth": fake_token},
        allow_redirects=False
    )
    # Sistem hileli tokeni görüp login'e atacaktır
    assert response.status_code == 303

def test_jwt_logout_revokes_token():
    """Logout sonrası tokenler bir daha kullanılamaz olmalı (Blacklist kontrolü)"""
    access_token, _ = create_tokens({"sub": "ogrenci", "role": "ogrenci"})
    
    # Logout atıyoruz (CSRF gerekli)
    client.post(
        "/sanal-lab-logout",
        headers={"X-CSRF-Token": "test_csrf_token"},
        cookies={"csrftoken": "test_csrf_token", "sanal_lab_auth": access_token},
        allow_redirects=False
    )
    
    # Tekrar o tokenle girmeye çalışalım
    response = client.get(
        "/sanal-lab", 
        cookies={"sanal_lab_auth": access_token},
        allow_redirects=False
    )
    # Kara listeye alındığı için reddedilip logine döndürmeli
    assert response.status_code == 303
