import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.jwt_handler import create_tokens

client = TestClient(app)

def test_rbac_admin_access_granted():
    """Admin rolündeki kullanıcı /api/admin/reports endpointine girebilmeli."""
    access_token, _ = create_tokens({"sub": "admin_user", "role": "admin"})
    response = client.get(
        "/api/admin/reports", 
        cookies={"sanal_lab_auth": access_token}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Güvenli Öğretmen/Admin Raporlar Alanı", "status": "access_granted"}

def test_rbac_student_access_denied():
    """Ogrenci rolündeki kullanıcı admin endpointine girememeli (403 Forbidden)."""
    access_token, _ = create_tokens({"sub": "ogrenci_user", "role": "ogrenci"})
    response = client.get(
        "/api/admin/reports", 
        cookies={"sanal_lab_auth": access_token}
    )
    assert response.status_code == 403
    assert "You do not have permission" in response.json()["detail"]
