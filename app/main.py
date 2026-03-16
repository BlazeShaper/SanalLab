"""
Interactive Physics Lab — Secure FastAPI application entry point.
"""
from __future__ import annotations

import os
import logging
from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, FileResponse
import tempfile

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.db import init_db
from app.routers import experiments, reports, files
from app.auth.external_auth import ExternalAPIClient
from app.auth.jwt_handler import create_tokens, verify_token, revoke_token
from app.auth.csrf import generate_csrf_token, csrf_protect
from app.auth.roles import get_current_user_payload, RequireRole
from app.auth.rate_limit import limiter, get_login_key

from app.middleware.log_sanitizer import LogSanitizerMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

from app.experiments.registry import REGISTRY, get_experiment
from app.config import settings

logger = logging.getLogger("sanal_lab.main")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialize FastAPI with generic error obfuscation in non-debug mode
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc"
)

# 1. ADD RATE LIMITER
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 2. ADD SECURITY MIDDLEWARES
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LogSanitizerMiddleware)

# Initialize external API client
external_client = ExternalAPIClient()

# Mount static assets
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Jinja2 templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Include API routers
app.include_router(experiments.router)
app.include_router(reports.router)
app.include_router(files.router)


@app.on_event("startup")
def on_startup():
    init_db()


# -------------------------------------------------------------
# GENERIC EXCEPTION HANDLER (Sızıntı Önleyici)
# -------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Production'da 500 hatalarının detaylarını (Stack Trace) kullanıcıdan gizler"""
    logger.error(f"Global Exception on {request.url}: {str(exc)}", exc_info=True)
    return templates.TemplateResponse("login.html", {
        "request": request,
        "error": "Sistemde beklenmeyen bir hata oluştu. Lütfen yöneticinize başvurun."
    }, status_code=500)


# -------------------------------------------------------------
# COMMON ROUTES
# -------------------------------------------------------------
@app.get("/")
@limiter.limit(settings.RATE_LIMIT_GLOBAL)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/experiments/{exp_id}")
async def experiment_page(exp_id: str, request: Request):
    exp = get_experiment(exp_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiments_list = [{"id": e.id, "name": e.name} for e in REGISTRY.values()]
    template_name = f"{exp_id}.html"
    return templates.TemplateResponse(template_name, {
        "request": request,
        "exp_id": exp.id,
        "exp_name": exp.name,
        "experiments": experiments_list
    })


# -------------------------------------------------------------
# SANAL LAB SECURE AUTHENTICATION ROUTES
# -------------------------------------------------------------
@app.get("/sanal-lab-login")
@limiter.limit(settings.RATE_LIMIT_GLOBAL)
async def sanal_lab_login_page(request: Request, error: str | None = None):
    # Kullanıcıya güvenli bir giriş yapabilmesi için CSRF token atıyoruz
    csrf_token = generate_csrf_token()
    response = templates.TemplateResponse("login.html", {
        "request": request,
        "error": error,
        "csrf_token": csrf_token # Gizli form alanına basılacak
    })
    
    # Cookie tabanlı double-submit doğrulaması için HttpOnly olmayan çerez
    response.set_cookie(
        "csrftoken", 
        csrf_token, 
        httponly=False, # JS'nin formu doldurabilmesi için (veya backend template'e basıyorsa True da olabilir)
        secure=True if settings.ENVIRONMENT == "production" else False,
        samesite="lax"
    )
    return response

@app.post("/sanal-lab-login", dependencies=[Depends(csrf_protect)])
@limiter.limit(settings.RATE_LIMIT_LOGIN, key_func=get_login_key)
async def sanal_lab_login_post(request: Request, username: str = Form(...), password: str = Form(...)):
    """
    Login Route'u Brute Force korumasına, CSRF korumasına ve Async Mock'a sahiptir.
    User & IP limitleri devreye girer.
    """
    user_data = await external_client.authenticate_user(username, password)
    
    if user_data:
        # Başarılı Giriş: Access + Refresh Tokens
        access_token, refresh_token = create_tokens(data={
            "sub": username, 
            "role": user_data.get("role", "ogrenci"),
            "full_name": user_data.get("full_name", "")
        })
        
        response = RedirectResponse(url="/sanal-lab", status_code=303)
        
        # Access Token Cookie
        response.set_cookie(
            key="sanal_lab_auth", 
            value=access_token, 
            httponly=True, 
            secure=True if settings.ENVIRONMENT == "production" else False,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            domain=settings.COOKIE_DOMAIN
        )
        
        # Refresh Token Cookie (Daha uzun ömürlü, farklı isimde)
        response.set_cookie(
            key="sanal_lab_refresh", 
            value=refresh_token, 
            httponly=True, 
            secure=True if settings.ENVIRONMENT == "production" else False,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/api/auth/refresh", # Sadece refresh endpointine gitsin
            domain=settings.COOKIE_DOMAIN
        )
        logger.info(f"User '{username}' successfully logged in.")
        return response
    else:
        logger.warning(f"Failed login attempt for username: {username}")
        # Hatalı Şifre - Güvenlik İçin Generic Hata (Kullanıcı Yok mu, Şifremi mi yanlış gizlenir)
        csrf_token = generate_csrf_token()
        response = templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Geçersiz kullanıcı adı veya şifre.",
            "csrf_token": csrf_token
        })
        response.set_cookie("csrftoken", csrf_token, secure=True if settings.ENVIRONMENT == "production" else False, samesite="lax")
        return response

@app.post("/api/auth/refresh", dependencies=[Depends(csrf_protect)])
async def refresh_access_token(request: Request):
    """Refresh token kullanarak yeni Access Token alır ve Eski Refresh Token'i Revoke (Rotation) eder."""
    refresh_token = request.cookies.get("sanal_lab_refresh")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    payload = verify_token(refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    # Eski token'i blacklist'e al (Token Rotation)
    revoke_token(refresh_token)
    
    # Yeni token seti
    new_access, new_refresh = create_tokens(data={"sub": payload["sub"], "role": payload.get("role", "ogrenci")})
    
    # Güvenlik riski olduğu için JSON değil CSRF korumalı API olarak veriyoruz
    response = RedirectResponse(url="/sanal-lab", status_code=303)
    response.set_cookie("sanal_lab_auth", new_access, httponly=True, secure=True if settings.ENVIRONMENT == "production" else False, samesite="lax")
    response.set_cookie("sanal_lab_refresh", new_refresh, httponly=True, secure=True if settings.ENVIRONMENT == "production" else False, samesite="lax", path="/api/auth/refresh")
    return response

@app.post("/sanal-lab-logout", dependencies=[Depends(csrf_protect)])
async def sanal_lab_logout(request: Request):
    """Kullanıcıyı sistemden atar ve elindeki Tokenleri Blacklist'e ekler."""
    access = request.cookies.get("sanal_lab_auth")
    if access:
        revoke_token(access)
        
    response = RedirectResponse(url="/sanal-lab-login", status_code=303)
    response.delete_cookie("sanal_lab_auth")
    response.delete_cookie("sanal_lab_refresh", path="/api/auth/refresh")
    logger.info("User logged out successfully.")
    return response


# -------------------------------------------------------------
# SECURE LAB ROUTES
# -------------------------------------------------------------

@app.get("/sanal-lab")
@limiter.limit(settings.RATE_LIMIT_GLOBAL)
async def sanal_lab_index(request: Request):
    try:
        user_payload = get_current_user_payload(request)
    except HTTPException:
        return RedirectResponse(url="/sanal-lab-login", status_code=303)

    first_exp = next(iter(REGISTRY.values()), None)
    if first_exp:
        return RedirectResponse(url=f"/sanal-lab/{getattr(first_exp, 'id', '')}")
    return templates.TemplateResponse("sanal_lab_exp.html", {"request": request, "error": "No experiments found"})

@app.get("/sanal-lab/{exp_id}")
async def sanal_lab_page(exp_id: str, request: Request):
    # Yetki kontrolü (Manuel redirect yapabilmek için Dependency'i try ile sarmalarız veya endpointte yakalarız)
    try:
        user_payload = get_current_user_payload(request)
    except HTTPException:
        return RedirectResponse(url="/sanal-lab-login", status_code=303)

    exp = get_experiment(exp_id)
    if exp is None:
        raise HTTPException(status_code=404, detail="Deney bulunamadı")
    
    experiments_list = [{"id": e.id, "name": e.name} for e in REGISTRY.values()]
    return templates.TemplateResponse("sanal_lab_exp.html", {
        "request": request,
        "exp_id": exp.id,
        "exp_name": exp.name,
        "learning": exp.learning_content(),
        "experiments": experiments_list,
        "user_name": user_payload.get("sub", "Öğrenci"),
        "user_role": user_payload.get("role", "ogrenci")
    })

# -------------------------------------------------------------
# ROLE-BASED ACCESS CONTROL (RBAC) ROUTES (Sadece Yetkililer)
# -------------------------------------------------------------
@app.get("/api/admin/reports", dependencies=[Depends(RequireRole(["admin", "ogretmen"]))])
async def secure_teacher_reports(request: Request):
    """Sadece 'admin' ve 'ogretmen' rollerinin görebileceği örnek endpoint"""
    return {"message": "Güvenli Öğretmen/Admin Raporlar Alanı", "status": "access_granted"}


@app.get("/api/download-sanal-lab/{exp_id}", dependencies=[Depends(get_current_user_payload)])
@limiter.limit(settings.RATE_LIMIT_GLOBAL)
async def download_sanal_lab_doc(request: Request, exp_id: str, format: str = "txt"):
    """Yetki kontrolü eklenmiş doküman indirme rotası."""
    exp = get_experiment(exp_id)
    if not exp:
         raise HTTPException(status_code=404, detail="Bulunamadı")
    
    learning = exp.learning_content()
    summary = learning.get("summary", "Bu deneyin temel amacı, belirlenen fizik prensiplerini incelemektir.")
    concepts = learning.get("concepts", [])

    if format == "excel":
        import csv
        fd, path = tempfile.mkstemp(suffix=".csv")
        with os.fdopen(fd, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["Deney Adı", exp.name])
            writer.writerow([])
            writer.writerow(["Amacı", summary])
            writer.writerow([])
            if concepts:
                writer.writerow(["No", "Kavram", "Açıklama"])
                for c in concepts:
                    writer.writerow([c.get('num', ''), c.get('title', ''), c.get('desc', '')])
        return FileResponse(path=path, filename=f"{exp.id}_rapor.csv", media_type="text/csv")

    elif format in ["html", "pdf"]:
        html_content = f"""<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>{exp.name} - Rapor</title></head><body><h1>{exp.name} - Deney Raporu</h1><h2>Deneyin Amacı</h2><p>{summary}</p><h2>Temel Kavramlar</h2>"""
        for c in concepts:
            html_content += f"""<div><h3>[{c.get('num', '')}] {c.get('title', '')}</h3><p>{c.get('desc', '')}</p></div>"""
        
        html_content += "</body></html>"
        if format == "pdf":
            html_content = html_content.replace("</body>", "<script>window.onload=function(){window.print();}</script></body>")

        fd, path = tempfile.mkstemp(suffix=".html")
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(html_content)
        return FileResponse(path=path, filename=f"{exp.id}_rapor.html", media_type="text/html")
        
    else:
        content = f"--- Deney Raporu ---\nDeney Adı: {exp.name}\nAmacı:\n{summary}\n\nNotlar:\nSimülasyon yerine masaüstü dökümantasyonu içindir.\n"
        fd, path = tempfile.mkstemp(suffix=".txt")
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(content)
        return FileResponse(path=path, filename=f"{exp.id}_rapor.txt", media_type="text/plain")
