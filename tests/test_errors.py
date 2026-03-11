import pytest
from fastapi.testclient import TestClient
from app.main import app
import builtins
from unittest.mock import patch, MagicMock

client = TestClient(app)

def test_internal_server_error_obfuscation():
    """
    Sistemde oluşabilecek sunucu kaynaklı bir hata durumunda
    API'ın kullanıcıya detaylı (stack trace) bilgisini sızdırmadığından 
    ve generic bir 500 hatası döndüğünden emin olunur.
    """
    
    # Kasıtlı olarak /sanal-lab-logout endpointini bir 
    # Exception fırlatmaya zorluyoruz
    with patch('app.main.revoke_token', side_effect=Exception("Database Connection Lost! THIS IS A SECRET")):
        response = client.post(
            "/sanal-lab-logout",
            headers={"X-CSRF-Token": "test"},
            cookies={"csrftoken": "test", "sanal_lab_auth": "dummy_token"}
        )
        # Global Exception Handler'ın 500 koduyla "Sistemde hata" sayfasına yöneltmesi beklenir
        assert response.status_code == 500
        # Yanıt metninin (HTML) içinde asla gerçek hatanın izi geçmemeli
        assert "THIS IS A SECRET" not in response.text
        assert "Sistemde beklenmeyen bir hata oluştu" in response.text
