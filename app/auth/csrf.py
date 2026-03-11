import secrets
import logging
from fastapi import Request, HTTPException, status

from app.config import settings

logger = logging.getLogger("sanal_lab.security.csrf")

def generate_csrf_token() -> str:
    """
    Rastgele, tahmin edilemez bir CSRF (Cross-Site Request Forgery) tokenı üretir.
    Üretilen bu token giriş yapan kullanıcı için "Set-Cookie" olarak atanmalıdır.
    """
    return secrets.token_urlsafe(32)

def verify_csrf_token(request: Request) -> bool:
    """
    Gelen bir POST/PUT/DELETE isteğinin CSRF saldırısı olup olmadığını;
    hem Origin ve Referer header'leri hem de 'Double Submit Cookie' yöntemi 
    çerçevesinde doğrular.
    """
    if request.method not in ["POST", "PUT", "DELETE", "PATCH"]:
        return True # GET istekleri state (durum) değiştirmediği için güvenlidir
        
    # 1. ORIGIN ve REFERER KONTROLÜ (Savunma Hattı 1)
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    host_url = str(request.base_url).rstrip('/')
    
    # Modern tarayıcılar Origin gönderir. Göndermezse referer'e düşeriz.
    if origin:
        if origin != host_url:
            logger.warning(f"CSRF Alert: Origin '{origin}' does not match Host '{host_url}'")
            return False
    elif referer:
        if not referer.startswith(host_url):
            logger.warning(f"CSRF Alert: Referer '{referer}' does not match Host '{host_url}'")
            return False
            
    # 2. DOUBLE SUBMIT COOKIE KONTROLÜ (Savunma Hattı 2)
    # Tarayıcının gönderdiği Cookie (csrf_token) ile form veya header'daki (X-CSRF-Token) aynı olmak zorundadır
    cookie_token = request.cookies.get("csrftoken")
    header_token = request.headers.get("X-CSRF-Token")
    
    # Form'dan geliyorsa kontrol etmek için request.form() çağrılabilir ancak bu asynctir, 
    # API'lerde genelde header üzerinden CSRF token iletilir.
    
    if not cookie_token or not header_token:
        logger.warning("CSRF Alert: Missing CSRF token in Cookie or Header")
        return False
        
    # Constant-time comparison ile Timing Acks (Zamanlama Saldırıları) engellenir.
    if not secrets.compare_digest(cookie_token, header_token):
        logger.warning("CSRF Alert: Tokens do not match (Header vs Cookie)")
        return False
        
    return True

def csrf_protect(request: Request):
    """
    FastAPI endpointlerinde bağımlılık (Dependency) olarak kullanılacak ana fonksiyon.
    Eğer yetki doğrulanamazsa standart 403 HTTP atar.
    """
    if not verify_csrf_token(request):
        # Bilgi sızıntısını engellemek için spesifik CSRF hatası dönmeyiz 
        # (Yarı jenerik Forbidden önerilir)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing security verification (CSRF)"
        )
