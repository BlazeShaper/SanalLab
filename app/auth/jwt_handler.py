import time
import os
from datetime import datetime, timedelta
import jwt
from typing import Optional, Dict, Any

# JWT konfigürasyonu
# Gerçek uygulamalarda bu anahtar .env dosyasından okutulmalıdır
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "b402eaeb883b0f5b13824bb8d4cbecf879ab1f22e70d4f3b")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 günlük geçerlilik

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Verilen verilerden güvenli bir JWT Session Token üreten fonksiyon"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Gelen JWT tokeninin imzasını ve süresini doğrulayan, validse içindeki veriyi dönen fonksiyon"""
    try:
        decoded_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_data
    except jwt.ExpiredSignatureError:
        # Token süresi dolmuş
        return None
    except jwt.InvalidTokenError:
        # İmza geçersiz veya token bozuk
        return None
