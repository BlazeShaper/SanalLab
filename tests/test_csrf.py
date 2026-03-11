import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_post_without_csrf_token_rejected():
    """CSRF Token olmadan yapılan Login POST isteği (veya herhangi bir state-change) 403 Forbidden almalı."""
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "fizik123"}
        # Bilerek X-CSRF-Token header'i ve Cookie gönderilmiyor
    )
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]

def test_post_with_mismatched_csrf_rejected():
    """Double Submit Cookie mismatch (Uyumsuzluğu) tespit edilmeli."""
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "fizik123"},
        headers={"X-CSRF-Token": "valid_token_A"},
        cookies={"csrftoken": "hacked_token_B"} # Tokenlar eşleşmiyor
    )
    assert response.status_code == 403
    assert "CSRF" in response.json()["detail"]

def test_csrf_origin_check():
    """Yanlış Origin Header'ı reddedilmeli"""
    response = client.post(
        "/sanal-lab-login",
        data={"username": "ogrenci", "password": "fizik123"},
        headers={
            "X-CSRF-Token": "test_token", 
            "Origin": "http://evil-hacker-site.com" # Kötü niyetli site
        },
        cookies={"csrftoken": "test_token"}
    )
    assert response.status_code == 403
