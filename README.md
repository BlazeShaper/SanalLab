# Interactive Physics Lab

Interactive Physics Lab is a backend-driven web application for running and visualizing interactive physics experiments in the browser.  
The system is powered by **FastAPI**, allowing fast API responses, experiment execution, and dynamic data processing.

The project combines:

- ⚡ FastAPI backend
- 🧮 Python-based physics experiment modules
- 🌐 HTML + JavaScript frontend
- 💾 SQLite + SQLAlchemy data storage

Users can run experiments, generate reports, and upload related files directly from the web interface.

---

# Features

- Interactive physics experiments
- Modular experiment engine
- Report generation and management
- File upload system
- Lightweight session handling
- REST-style API endpoints
- FastAPI automatic documentation

---

# Tech Stack

| Layer | Technology |
|------|-------------|
Backend | FastAPI |
Database | SQLite |
ORM | SQLAlchemy |
Frontend | HTML + JavaScript |
Templating | Jinja2 |
Server | Uvicorn |

---

# Quick Start

## 1. Clone the repository

```bash
git clone <repository-url>
cd interactive-physics-lab
```

## 2. Create a virtual environment

```bash
python -m venv .venv
```

## 3. Activate the environment

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

## 4. Install dependencies

```bash
pip install -r requirements.txt
```

## 5. Start the development server

```bash
uvicorn app.main:app --reload
```

## 6. Open the application

Visit:

```
http://localhost:8000
```

FastAPI documentation is available at:

```
http://localhost:8000/docs
```

---

# Project Structure

```
interactive-physics-lab/
│
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── db.py                # SQLite database configuration and engine
│   ├── models.py            # SQLAlchemy ORM models
│   ├── session.py           # Lightweight session middleware
│   │
│   ├── routers/
│   │   ├── experiments.py   # Experiment API endpoints
│   │   ├── reports.py       # Report management endpoints
│   │   └── files.py         # File upload and retrieval endpoints
│   │
│   └── experiments/
│       ├── __init__.py
│       ├── registry.py      # Base experiment class and registry system
│       └── electrostatics.py # Example physics experiment
│
├── templates/
│   └── index.html           # Main user interface template
│
├── static/
│   └── app.js               # Frontend logic and API calls
│
├── data/
│   └── uploads/             # Directory for user-uploaded files
│
└── tests/                   # Automated tests
```

---

# Architecture

The project follows a **modular backend-driven architecture** where the FastAPI server handles experiment execution, data processing, and API communication, while a lightweight frontend interacts with the backend through REST endpoints.

---

## Backend Layer

The backend is built with **FastAPI** and is responsible for:

- Handling API requests
- Executing physics experiments
- Managing database operations
- Handling file uploads
- Serving frontend templates

The main application entry point is located in:

```
app/main.py
```

---

## Database Layer

The application uses **SQLite** for lightweight storage and **SQLAlchemy** as the ORM layer.

This layer is responsible for:

- Storing experiment results
- Managing report metadata
- Persisting uploaded file references
- Supporting lightweight development and local deployment

Main database-related files:

```
app/db.py
app/models.py
```

---

## Experiment Layer

Physics experiments are implemented as **modular Python components**.

This design allows new experiments to be added easily by registering them in the experiment registry.

Responsibilities include:

- Defining experiment logic
- Running calculations and simulations
- Returning structured output for visualization
- Supporting extensibility for future experiments

Main files:

```
app/experiments/registry.py
app/experiments/electrostatics.py
```

---

## API Layer

The API is organized into routers for separation of concerns.

Available route groups include:

- `/api/experiments` — run and manage experiments
- `/api/reports` — create and retrieve reports
- `/api/files` — upload and access user files

Main router files:

```
app/routers/experiments.py
app/routers/reports.py
app/routers/files.py
```

---

## Frontend Layer

The frontend is built using **HTML, JavaScript, and Jinja2 templates**.

It is responsible for:

- Rendering the user interface
- Sending requests to backend APIs
- Displaying experiment results
- Supporting file uploads and report interactions

Frontend files:

```
templates/index.html
static/app.js
```

---

# Example Workflow

A typical user flow looks like this:

1. The user opens the web interface in the browser.
2. The frontend sends a request to the FastAPI backend.
3. The backend runs the selected experiment module.
4. Results are processed and optionally stored in SQLite.
5. The frontend visualizes the returned data.
6. The user may generate a report or upload related files.

---

# Extending the Project

To add a new physics experiment:

1. Create a new Python module inside:

```
app/experiments/
```

2. Implement the experiment logic.

3. Register the experiment in `registry.py`.

4. Expose it through the experiment API router if needed.

5. Update the frontend to allow user interaction with the new experiment.

This modular approach keeps the application scalable and easy to maintain.

---

# Testing

Run tests with:

```bash
pytest
```

Make sure your virtual environment is activated and dependencies are installed before running tests.

---

# Future Improvements

Possible enhancements for the project include:

- More physics experiment modules
- User authentication
- Better visualization tools
- Exportable PDF reports
- Experiment history tracking
- Real-time simulation updates
- Improved frontend styling and dashboards

---

# License

Add your preferred license here.

Example:

```
MIT License
```

---

# Contributing

Contributions are welcome. You can contribute by:

- Adding new experiment modules
- Improving frontend interactivity
- Enhancing API design
- Writing tests
- Improving documentation

---

# Summary

Interactive Physics Lab is a lightweight, modular, and extensible platform for running browser-based physics experiments with a FastAPI backend.

It combines experiment execution, report generation, file handling, and visualization in a clean web-based architecture.
