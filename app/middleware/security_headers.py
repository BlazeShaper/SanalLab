from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Sisteme giren her response (yanıt) objesine endüstri standardı
    güvenlik başlıklarını (Security Headers) ekleyen katman.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)
        
        # Clickjacking Koruması: Uygulama başka bir sitenin iFrame'inde çalıştırılamaz
        response.headers["X-Frame-Options"] = "DENY"
        
        # MIME type sniffing engellemesi: Tarayıcı dosya tipini tahmin etmez, gönderilene güvenir
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS (Cross-Site Scripting) Koruması (Modern tarayıcılar için CSP daha etkilidir ama eski tarayıcıları destekler)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Security Policy (CSP): Yalnızca kendi domainimizden kaynakları yüklemeye izin ver.
        # Strict ayarıdır, dışarıdan (CDN dahil) yüklenen script varsa 'unsafe-inline' gibi esneklikler gerekebilir,
        # ancak Sanal Lab gereksinimi için Tailwindcdn vb. var, bu yüzden onları beyaz listeye alıyoruz.
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; "
            "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "object-src 'none'"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # HTTPS yönlendirme zorunluluğu (HSTS - Production ortamlarında geçerlidir)
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # İstek referans bilgisinin hangi sitelere gönderileceği (Privacy)
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
