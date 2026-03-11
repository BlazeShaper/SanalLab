import time
import uuid
import logging
from datetime import datetime, timedelta, timezone
import jwt
from typing import Optional, Dict, Any, Tuple

from app.config import settings

logger = logging.getLogger("sanal_lab.security.jwt")

# Siyah liste: Çıkış yapılmış (logout) veya iptal edilmiş JTI (JWT ID) değerlerini tutar.
# Production'da bu liste Redis gibi bellek içi bir veritabanında tutulmalıdır!
TOKEN_BLACKLIST = set()

def create_tokens(data: dict) -> Tuple[str, str]:
    """
    Login başarılı olduğunda hem kısa ömürlü (15dk) Access Token 
    hem de uzun ömürlü (Örn 7 gün) Refresh Token oluşturur.
    
    JWT Claim Detayları:
    aud: Hedef Kitle (Audience)
    iss: Token'i basan (Issuer)
    exp: Son Kullanım (Expiration)
    iat: Başlangıç (Issued At)
    jti: Benzersiz ID (JWT ID - iptal edilebilmesi için)
    """
    to_encode = data.copy()
    
    # 1. Access Token (Ana Yetkilendirme)
    access_jti = str(uuid.uuid4())
    access_expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_payload = to_encode.copy()
    access_payload.update({
        "exp": access_expire,           
        "iat": datetime.now(timezone.utc),
        "iss": settings.APP_NAME,
        "aud": ["sanal_lab_api"],       # Audience restriction
        "jti": access_jti,              # Blacklist mekanizması için
        "type": "access"
    })
    
    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    # 2. Refresh Token (Rotasyon Amaçlı)
    refresh_jti = str(uuid.uuid4())
    refresh_expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    refresh_payload = {
        "sub": to_encode.get("sub"),    # username
        "exp": refresh_expire,
        "iat": datetime.now(timezone.utc),
        "iss": settings.APP_NAME,
        "aud": ["sanal_lab_api"],
        "jti": refresh_jti,
        "type": "refresh"
    }
    
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    return access_token, refresh_token

def revoke_token(token: str) -> bool:
    """Bir tokeni karalisteye (Blacklist) alır. Logout sonrası tetiklenmeli."""
    payload = verify_token(token, ignore_exp=True)
    if payload and "jti" in payload:
        TOKEN_BLACKLIST.add(payload["jti"])
        logger.info(f"Token revoked. JTI: {payload['jti']}")
        return True
    return False

def verify_token(token: str, expected_type: str = "access", ignore_exp: bool = False) -> Optional[Dict[str, Any]]:
    """Gelen JWT tokeninin imzasını, claim'lerini (exp, iat, aud, iss) ve blacklist'i doğrular."""
    try:
        decoded_data = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM],
            audience="sanal_lab_api",   # Audience değiştiyse hata atar
            issuer=settings.APP_NAME,   # Uygulama adı dışında biri ürettiyse hata atar
            options={"verify_exp": not ignore_exp}
        )
        
        # Token tipi kontrolü (Access token ile refresh atılamaz, Refresh ile yetki alınamaz)
        if decoded_data.get("type") != expected_type:
            logger.warning(f"Invalid token type provided. Expected {expected_type}, got {decoded_data.get('type')}")
            return None
            
        # Blacklist (Revoke) Kontrolü
        if decoded_data.get("jti") in TOKEN_BLACKLIST:
            logger.warning("Attempted use of a revoked token.")
            return None
            
        return decoded_data
        
    except jwt.ExpiredSignatureError:
        # Token süresi dolmuş. Sadece access ise refresh yapılması gerekir.
        # logger.debug("Token has expired.") # İsteğe bağlı debug
        return None
    except jwt.InvalidTokenError as e:
        # İmza geçersiz, yanlış secret, bozuk veri
        logger.error(f"Invalid JWT Token signature attempt: {str(e)}")
        return None
