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


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
