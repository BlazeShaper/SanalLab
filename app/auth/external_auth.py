import requests
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ExternalAPIClient:
    """
    Resmi kurumun API'si ile (REST tabanlı) güvenli HTTPS bağlantısı kuran client sınıfı.
    Bu kod gerçek bir kurum entegrasyonuna referans olarak "mock" (taklit) moduna sahiptir,
    fakat prodüksiyon kalitesinde hata ve güvenlik yaklaşımları barındırır.
    """
    
    def __init__(self, api_base_url: str = "https://kurum-api.gov.tr/v1"):
        self.api_base_url = api_base_url
        # Kurumun API'si için gerekebilecek olası token / anahtarlar
        self.api_key = "MOCK_API_KEY_123"

    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Kullanıcı adı ve şifresini alarak kurumun veri merkezine güvenli sorgu atar.
        Kullanıcı parolası **Sanal Lab** tarafında kaydedilmez (Zero-Knowledge).
        """
        # =====================================================================
        # UYARI: Bu kısım kurumun GERÇEK dökümantasyonuna göre şekillenecektir.
        # Aşağıdaki requests kodu, "taklit" edilmesi amacıyla Mock edilmiştir.
        # =====================================================================
        
        # MOCK IMPLEMENTATION (GERÇEKTE BURASI AŞAĞIDAKİ HTTP ISTEĞI OLACAKTIR)
        return self._mock_authenticate(username, password)
        
        # --- GERÇEK API TASLAĞI (ÖRNEK): ---
        """
        endpoint = f"{self.api_base_url}/auth/login"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "username": username,
            "password": password
        }
        
        try:
            # timeout parametresi güvenlik ve sistem kararlılığı için zorunludur
            response = requests.post(
                endpoint, 
                json=payload, 
                headers=headers, 
                timeout=5.0 # Max 5 saniye
            )
            
            if response.status_code == 200:
                # Başarılı - Kurum bize kullanıcının Adını/Soyadını dönebilir
                data = response.json()
                return {
                    "username": username,
                    "full_name": data.get("full_name", "Kullanıcı"),
                    "role": data.get("role", "student"),
                    "institution_id": data.get("id")
                }
            elif response.status_code in [401, 403]:
                # Yanlış şifre
                return None
            else:
                logger.error(f"Kurum API Hatası, Status: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"Kurum API'sine bağlanılamadı: {str(e)}")
            return None
        """

    def _mock_authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Sadece test amaçlı çalışan taklit sunucu."""
        # Basit bir simülasyon gecikmesi
        import time
        time.sleep(0.5) 
        
        # Varsayılan test hesapları
        valid_users = {
            "ogrenci": {"password": "fizik123", "full_name": "Test Öğrencisi", "role": "student"},
            "ogretmen": {"password": "fizik123", "full_name": "Fizik Öğretmeni", "role": "teacher"}
        }
        
        if username in valid_users and valid_users[username]["password"] == password:
            user_data = valid_users[username]
            return {
                "username": username,
                "full_name": user_data["full_name"],
                "role": user_data["role"]
            }
        
        return None
