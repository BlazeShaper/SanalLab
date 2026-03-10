"""
Interactive Physics Lab — FastAPI application entry point.
"""
from __future__ import annotations

import os
from fastapi import FastAPI, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.db import init_db
from app.routers import experiments, reports, files
from app.auth.external_auth import ExternalAPIClient
from app.auth.jwt_handler import create_access_token, verify_token

# Initialize external API client
external_client = ExternalAPIClient()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Interactive Physics Lab")

# Mount static assets
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Jinja2 templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Include API routers
app.include_router(experiments.router)
app.include_router(reports.router)
app.include_router(files.router)


from fastapi.responses import RedirectResponse
from app.experiments.registry import REGISTRY, get_experiment

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
    })

@app.get("/experiments/{exp_id}")
async def experiment_page(exp_id: str, request: Request):
    exp = get_experiment(exp_id)
    if exp is None:
        return {"error": "not_found"}
    
    # Pass all active experiments to populate the dropdown
    experiments_list = [{"id": e.id, "name": e.name} for e in REGISTRY.values()]
    exp_name = exp.name
    
    # We expect template files to be named identically to the exp_id
    template_name = f"{exp_id}.html"
    return templates.TemplateResponse(template_name, {
        "request": request,
        "exp_id": exp.id,
        "exp_name": exp_name,
        "experiments": experiments_list
    })

# --- Sanal Lab Routes ---
@app.get("/sanal-lab-login")
async def sanal_lab_login_page(request: Request, error: str | None = None):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "error": error
    })

@app.post("/sanal-lab-login")
async def sanal_lab_login_post(request: Request, username: str = Form(...), password: str = Form(...)):
    # 1. Dış kurum API'sine (Mock Modu üzerinden) güvenli HTTPS bağlantısı yap
    user_data = external_client.authenticate_user(username, password)
    
    if user_data:
        # Başarılı giriş: Sıfır-Bilgi yaklaşımıyla şifreyi yok sayıp sadece Yetki Jetonu oluştur.
        access_token = create_access_token(data={"sub": username, "role": user_data.get("role", "student")})
        
        response = RedirectResponse(url="/sanal-lab", status_code=303)
        
        # Secure ve HttpOnly Cookie ayarı ile XSS saldırılarına karşı token çalınmasını engelliyoruz
        response.set_cookie(
            key="sanal_lab_auth", 
            value=access_token, 
            httponly=True, 
            secure=True,     # Prod ortamlarında sadece HTTPS üzerinden iletilmeli.
            samesite="lax",  # CSRF saldırılarına karşı koruma
            max_age=86400    # 1 günlük yetkilendirme (24 saat)
        )
        return response
    else:
        # 2. Hatalı Şifre / Login Başarısız
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Kimlik bilgileri kurum sistemlerimizle eşleşmedi!"
        })

def require_auth(request: Request) -> bool:
    """Helper method to check auth cookie."""
    token = request.cookies.get("sanal_lab_auth")
    if not token:
        return False
    
    payload = verify_token(token)
    return payload is not None

@app.get("/sanal-lab")
async def sanal_lab_index(request: Request):
    if not require_auth(request):
        return RedirectResponse(url="/sanal-lab-login", status_code=303)

    # Redirect to the first available experiment
    try:
        first_exp = next(iter(REGISTRY.values()))
        return RedirectResponse(url=f"/sanal-lab/{first_exp.id}")
    except StopIteration:
        return {"error": "No experiments found"}

@app.get("/sanal-lab/{exp_id}")
async def sanal_lab_page(exp_id: str, request: Request):
    if not require_auth(request):
        return RedirectResponse(url="/sanal-lab-login", status_code=303)

    exp = get_experiment(exp_id)
    if exp is None:
        return {"error": "not_found"}
    
    experiments_list = [{"id": e.id, "name": e.name} for e in REGISTRY.values()]
    
    return templates.TemplateResponse("sanal_lab_exp.html", {
        "request": request,
        "exp_id": exp.id,
        "exp_name": exp.name,
        "learning": exp.learning_content(),
        "experiments": experiments_list
    })

from fastapi.responses import FileResponse
import tempfile

@app.get("/api/download-sanal-lab/{exp_id}")
async def download_sanal_lab_doc(exp_id: str, format: str = "txt"):
    exp = get_experiment(exp_id)
    if not exp:
         return {"error": "not_found"}
    
    learning = exp.learning_content()
    summary = learning.get("summary", "Bu deneyin temel amacı, belirlenen fizik prensiplerini incelemektir.")
    concepts = learning.get("concepts", [])

    if format == "excel":
        import csv
        fd, path = tempfile.mkstemp(suffix=".csv")
        # Use utf-8-sig to ensure Excel opens the CSV correctly with Turkish characters
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
        html_content = f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>{exp.name} - Rapor</title>
<style>
  body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: auto; }}
  h1 {{ color: #0ea5e9; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
  h2 {{ color: #555; margin-top: 30px; }}
  .concept {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0ea5e9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
  .concept h3 {{ margin-top: 0; color: #0ea5e9; margin-bottom: 5px; }}
  .concept p {{ margin-bottom: 0; color: #475569; }}
</style>
</head>
<body>
    <h1>{exp.name} - Deney Raporu</h1>
    <h2>Deneyin Amacı</h2>
    <p>{summary}</p>
    <h2>Temel Kavramlar</h2>
"""
        for c in concepts:
            html_content += f"""
    <div class="concept">
        <h3>[{c.get('num', '')}] {c.get('title', '')}</h3>
        <p>{c.get('desc', '')}</p>
    </div>"""
        
        html_content += "</body></html>"
        
        if format == "pdf":
            html_content = html_content.replace("</body>", "<script>window.onload=function(){window.print();}</script></body>")

        fd, path = tempfile.mkstemp(suffix=".html")
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # If it's HTML downloading, we might want it to be an attachment. Wait, FileResponse defaults to attachment if we set filename.
        # For PDF(Print) we can let the browser open it. By omitting filename or sending inline content disposition, but FileResponse handles it.
        # A simpler way is to just let FileResponse serve it.
        return FileResponse(path=path, filename=f"{exp.id}_rapor.html", media_type="text/html")
        
    else:
        # Default text format
        content = f"--- Deney Raporu ve Kuramsal Bilgiler ---\n\n"
        content += f"Deney Adı: {exp.name}\n"
        content += "=========================================\n\n"
        content += f"Amacı:\n{summary}\n\n"
        if concepts:
            content += "Temel Kavramlar:\n"
            for c in concepts:
                content += f" - [{c.get('num', '')}] {c.get('title', '')}: {c.get('desc', '')}\n"
        content += "\nNotlar:\nSimülasyon yerine bu ortam kuramsal raporlama ve masaüstü dökümantasyonu içindir.\n"

        fd, path = tempfile.mkstemp(suffix=".txt")
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return FileResponse(path=path, filename=f"{exp.id}_rapor.txt", media_type="text/plain")
