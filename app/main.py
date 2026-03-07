"""
Interactive Physics Lab — FastAPI application entry point.
"""
from __future__ import annotations

import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.db import init_db
from app.routers import experiments, reports, files

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
async def index():
    return RedirectResponse(url="/experiments/electrostatics")

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
