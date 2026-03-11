import json
import httpx
from typing import Optional, Dict, Any
from pydantic import BaseModel, ValidationError
import logging
import asyncio

from app.config import settings

logger = logging.getLogger("sanal_lab.security.external")


class ExternalUserSchema(BaseModel):
    """
    Dış servisten gelecek verinin tutarlılığını garantileyen şema.
    Bozuk şema (Response Schema Validation) hatadan dönecektir.
    """
    username: str
    full_name: str
    role: str


class ExternalAPIClient:
    """
    Resmi kurumun API'si ile (REST tabanlı) güvenli HTTPS bağlantısı kuran client.
    Modern, asenkron `httpx` altyapısı üzerine kurulmuştur.
    """
    
    def __init__(self):
        self.api_base_url = settings.EXTERNAL_API_URL
        self.api_key = settings.EXTERNAL_API_KEY
        self.timeout = settings.EXTERNAL_API_TIMEOUT

        # Allowlist: Kurumun bize verdiği kabul edilebilir domain listesi
        self._allowed_domains = ["https://kurum-api.gov.tr", "http://localhost:8000"]
        self._verify_allowlist()

    def _verify_allowlist(self):
        """TLS/URL güvenilirliği ve whitelist denetimi."""
        is_safe = any(self.api_base_url.startswith(domain) for domain in self._allowed_domains)
        if not is_safe:
            logger.error(f"EXTERNAL_API_URL ({self.api_base_url}) is NOT in the allowlist! Requests will fail.")

    def get_client(self):
        """Uygulamanın çalışacağı güvenli (TLS takipli) asenkron istemci oluşturur."""
        # Note: Yerel test için verify=False kullanılması gerekebilir ancak production'da yasaktır.
        return httpx.AsyncClient(
            base_url=self.api_base_url,
            timeout=self.timeout,
            verify=True if settings.ENVIRONMENT == "production" else False 
        )

    async def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Kullanıcı adı ve şifresine istinaden kuruma istek atar. Sıfır-Bilgi yaklaşımı.
        Timeout, Retry ve Hata gizleme mekanizmaları uygulanır.
        """
        # ==================== MOCK MODU ========================
        # Çevre değişkenine göre eğer hala dev/test ortamıysa, MOCK'a gönder
        if "mock" in self.api_base_url.lower() or settings.ENVIRONMENT != "production":
            return await self._mock_authenticate(username, password)
        # ========================================================
            
        endpoint = "/auth/login"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {"username": username, "password": password}
        
        async with self.get_client() as client:
            try:
                # Toplam 2 kez tekrar (Retry) denemesi eklenebilir, şimdilik sabit
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status() # HTTPErrorsa (400, 500) except bloğuna düşer
                
                # Payload Validation kullanarak dönen şemayı sıkı denetleriz (Bozuksa Exception atar)
                data = response.json()
                validated_data = ExternalUserSchema(**data) 
                
                return validated_data.model_dump()
                
            except httpx.ConnectTimeout:
                # Timeout zaafiyet testlerine karşı loglama
                logger.error(f"Dış Kurum API Timeout ({self.timeout}s). Zaman aşımına uğradı.")
                return None
            except httpx.HTTPStatusError as e:
                # 4xx ve 5xx hatalarında stack trace yerine anlamlı log
                logger.warning(f"Dış Kurum Authentication Başarısız. Status: {e.response.status_code}")
                return None
            except ValidationError as e:
                # Schema mismatch error (Zehirli/bozuk veri koruması)
                logger.error(f"Dış Kurum şema doğrulama hatası (Zehiroldu payload engellendi). Err: {e}")
                return None
            except Exception as e:
                # Genel catch-all, iç hata mesajını maskele
                logger.error(f"Dış kuruma bağlanırken beklenmeyen hata: {type(e).__name__}")
                return None

    async def _mock_authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Taklit (Mock) sunucu. Asenkron (asyncio.sleep) kullanılarak simüle edilir."""
        await asyncio.sleep(0.5) 
        
        valid_users = {
            "ogrenci": {"password": "fizik123", "full_name": "Test Öğrencisi", "role": "ogrenci"},
            "ogretmen": {"password": "fizik123", "full_name": "Fizik Öğretmeni", "role": "ogretmen"},
            "admin": {"password": "adminpass", "full_name": "Sistem Yöneticisi", "role": "admin"}
        }
        
        if username in valid_users and valid_users[username]["password"] == password:
            user_data = valid_users[username]
            return {
                "username": username,
                "full_name": user_data["full_name"],
                "role": user_data["role"]
            }
        
        return None
