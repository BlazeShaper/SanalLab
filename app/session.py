"""
Lightweight cookie-based session handling.
Each visitor gets a UUID stored in a signed cookie.
The experiment state is kept in an in-memory dict keyed by session ID.
"""
import uuid
from typing import Any

from fastapi import Request, Response

COOKIE_NAME = "lab_session"
# In-memory session store: session_id -> {experiment states, etc.}
_store: dict[str, dict[str, Any]] = {}


def get_session_id(request: Request) -> str:
    """Return existing session id from cookie, or empty string."""
    return request.cookies.get(COOKIE_NAME, "")


def ensure_session(request: Request, response: Response) -> str:
    """Return session id, creating one if missing, and set cookie."""
    sid = get_session_id(request)
    if not sid:
        sid = str(uuid.uuid4())
        response.set_cookie(COOKIE_NAME, sid, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7)
    if sid not in _store:
        _store[sid] = {}
    return sid


def get_state(sid: str) -> dict[str, Any]:
    """Get the full session state dict."""
    return _store.setdefault(sid, {})


def get_experiment_state(sid: str, exp_id: str) -> dict[str, Any] | None:
    """Get experiment-specific state for a session, or None."""
    return get_state(sid).get(f"exp:{exp_id}")


def set_experiment_state(sid: str, exp_id: str, state: dict[str, Any]) -> None:
    """Persist experiment state in the in-memory store."""
    get_state(sid)[f"exp:{exp_id}"] = state
