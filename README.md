# Interactive Physics Lab

A backend-driven web application for interactive physics experiments, powered by **Python FastAPI**.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv .venv

# 2. Activate (Windows)
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the development server
uvicorn app.main:app --reload
```

Then open **http://localhost:8000** in your browser.

## Project Structure

```
app/
  main.py              # FastAPI entry-point
  db.py                # SQLite + SQLAlchemy setup
  models.py            # ORM models (ReportItem, UploadedFile)
  session.py           # Lightweight session middleware
  routers/
    experiments.py     # /api/experiments/* endpoints
    reports.py         # /api/reports/*   endpoints
    files.py           # /api/files/*     endpoints
  experiments/
    __init__.py
    registry.py        # Base class + experiment registry
    electrostatics.py  # Electrostatics experiment
templates/
  index.html           # Jinja2 UI template
static/
  app.js               # Frontend logic
data/
  uploads/             # User-uploaded files (auto-created)
```
