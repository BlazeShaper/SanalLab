import logging
import json
import re
from typing import Callable, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure basic logging securely
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("sanal_lab.security")

class LogSanitizerMiddleware(BaseHTTPMiddleware):
    """
    Tüm gelen istekleri (Request) loglarken, `password`, `Bearer`, 
    ve `cookie` gibi hassas verilerin `[REDACTED]` ile maskelenmesini 
    sağlayan Middleware katmanı.
    """
    
    # Sansürlenecek kelimeler (Case-insensitive)
    SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "sanal_lab_auth", "csrf_token"}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        
        # 1. İstek (Request) Loglaması - Hedef URL ve Metod
        client_ip = request.client.host if request.client else "Unknown"
        logger.info(f"Incoming {request.method} request to {request.url.path} from IP: {client_ip}")
        
        # 2. Header Filtreleme
        safe_headers = {}
        for key, value in request.headers.items():
            if any(sensitive.lower() in key.lower() for sensitive in self.SENSITIVE_KEYS):
                safe_headers[key] = "[REDACTED]"
            elif "cookie" in key.lower():
                # Cookie string'ini parse edip auth veya jwt olanları sansürle
                safe_cookie = re.sub(
                    r'(sanal_lab_auth|session|csrftoken)=[^;\s]+', 
                    r'\1=[REDACTED]', 
                    value, 
                    flags=re.IGNORECASE
                )
                safe_headers[key] = safe_cookie
            else:
                safe_headers[key] = value
                
        # Sadece hata ayıklama (DEBUG) modunda header'ları logla
        # logger.debug(f"Headers: {safe_headers}")
        
        try:
            # İşlemi yönlendir (Route'u çalıştır)
            response = await call_next(request)
            
            # Response Loglaması
            logger.info(f"Completed {request.method} {request.url.path} with status: {response.status_code}")
            return response
            
        except Exception as e:
            # Hataları logla fakat detayı kullanıcıya yansıtma katmanını ayrı tut
            logger.error(f"Error processing {request.method} {request.url.path}: {str(e)}")
            raise e
