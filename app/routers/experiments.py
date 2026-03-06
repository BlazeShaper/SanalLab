"""
/api/experiments/* — list experiments, get/update state, run actions, compute.
"""
from __future__ import annotations
from typing import Any

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from app.session import ensure_session, get_experiment_state, set_experiment_state

# Import experiments so they auto-register
import app.experiments.electrostatics  # noqa: F401
from app.experiments.registry import REGISTRY, get_experiment

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


# ---- schemas ----------------------------------------------------------

class ActionPayload(BaseModel):
    action: str
    params: dict[str, Any] | None = None


class UpdatePayload(BaseModel):
    field: str
    value: Any


# ---- helpers ----------------------------------------------------------

def _ensure_exp_state(sid: str, exp_id: str) -> dict[str, Any]:
    """Get or create the experiment state for this session."""
    st = get_experiment_state(sid, exp_id)
    if st is None:
        exp = get_experiment(exp_id)
        if exp is None or not exp.implemented:
            return {}
        st = exp.default_state()
        set_experiment_state(sid, exp_id, st)
    return st


# ---- endpoints --------------------------------------------------------

@router.get("")
def list_experiments(request: Request, response: Response):
    """Return every registered experiment (id, name, implemented)."""
    ensure_session(request, response)
    return [
        {"id": e.id, "name": e.name, "implemented": e.implemented}
        for e in REGISTRY.values()
    ]


@router.get("/{exp_id}")
def get_experiment_detail(exp_id: str, request: Request, response: Response):
    exp = get_experiment(exp_id)
    if exp is None:
        return {"error": "not_found"}
    sid = ensure_session(request, response)
    st = _ensure_exp_state(sid, exp_id)
    computed = exp.compute(st) if exp.implemented else {}
    return {
        "id": exp.id,
        "name": exp.name,
        "implemented": exp.implemented,
        "state": st,
        "computed": computed,
        "controls": exp.controls_schema() if exp.implemented else [],
        "learning": exp.learning_content() if exp.implemented else {},
    }


@router.post("/{exp_id}/action")
def experiment_action(exp_id: str, payload: ActionPayload, request: Request, response: Response):
    exp = get_experiment(exp_id)
    if exp is None or not exp.implemented:
        return {"error": "not_found"}

    sid = ensure_session(request, response)
    st = _ensure_exp_state(sid, exp_id)

    action = payload.action
    log_msg = ""

    if exp_id == "electrostatics":
        if action == "rubGlass":
            st["glassChargeMicroC"] = 5.0
            log_msg = "exp.electrostatics.rubGlassLog"
        elif action == "rubPlastic":
            st["plasticChargeMicroC"] = -5.0
            log_msg = "exp.electrostatics.rubPlasticLog"
        elif action == "pause":
            st["running"] = False
            log_msg = "log.simPaused"
        elif action == "resume":
            st["running"] = True
            log_msg = "log.simResumed"
        elif action == "togglePause":
            st["running"] = not st.get("running", True)
            log_msg = "log.simResumed" if st["running"] else "log.simPaused"
        elif action == "reset":
            st = exp.default_state()
            log_msg = "log.simReset"

    set_experiment_state(sid, exp_id, st)
    computed = exp.compute(st)
    return {"state": st, "computed": computed, "log": log_msg}


@router.post("/{exp_id}/update")
def experiment_update(exp_id: str, payload: UpdatePayload, request: Request, response: Response):
    exp = get_experiment(exp_id)
    if exp is None or not exp.implemented:
        return {"error": "not_found"}

    sid = ensure_session(request, response)
    st = _ensure_exp_state(sid, exp_id)

    field = payload.field
    allowed = {c["field"] for c in exp.controls_schema() if "field" in c}
    if field in allowed:
        st[field] = payload.value

    set_experiment_state(sid, exp_id, st)
    computed = exp.compute(st)
    return {"state": st, "computed": computed}


@router.get("/{exp_id}/compute")
def experiment_compute(exp_id: str, request: Request, response: Response):
    """Stateless read — returns current computed values for the animation loop."""
    exp = get_experiment(exp_id)
    if exp is None or not exp.implemented:
        return {"error": "not_found"}

    sid = ensure_session(request, response)
    st = _ensure_exp_state(sid, exp_id)
    computed = exp.compute(st)
    return {"state": st, "computed": computed}
