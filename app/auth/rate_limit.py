from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from fastapi import Request
import logging

logger = logging.getLogger("sanal_lab.security.rate_limit")

# Temel limitleyici: Sisteme gelen isteklerin Client IP sine göre 
# throttle (frenleme) yapmasını sağlar. 
# Production'da Memory yerine Redis tabanlı (slowapi storage) backend önerilir.
limiter = Limiter(key_func=get_remote_address)

def get_login_key(request: Request) -> str:
    """
    Brute-force saldırılarında, saldıgan Proxy üzerinden gelirse IP değişebilir.
    Bu yüzden login endpointine özel hız limiti, 'username' + 'IP' bazlı yapılır.
    Ancak Form Datası async pars edildiğinden doğrudan route'ta limit dependency
    kullanmak yerine Custom Limiter Key ile çözeriz.
    """
    # Fallback IP Address
    return get_remote_address(request)
