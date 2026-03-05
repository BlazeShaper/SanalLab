"""
Base experiment class and global registry.
Every experiment module registers itself at import time.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class BaseExperiment(ABC):
    """Abstract base that each experiment must implement."""

    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    def implemented(self) -> bool:
        return True

    # ------------------------------------------------------------------

    @abstractmethod
    def default_state(self) -> dict[str, Any]:
        """Return the default mutable state dict for a fresh session."""
        ...

    @abstractmethod
    def controls_schema(self) -> list[dict[str, Any]]:
        """Return a JSON-serialisable list describing the UI controls."""
        ...

    @abstractmethod
    def compute(self, state: dict[str, Any]) -> dict[str, Any]:
        """Derive values (force, labels, angles…) from current state."""
        ...

    def learning_content(self) -> dict[str, Any]:
        """Return learning panel content."""
        return {"summary": "", "concepts": []}

    def step(self, state: dict[str, Any], dt: float) -> dict[str, Any]:
        """Optional per-tick simulation step.  Default = no-op."""
        return state

    def report_fields(self) -> list[str]:
        """Fields that can be captured into a report."""
        return []


# ---- registry --------------------------------------------------------

REGISTRY: dict[str, BaseExperiment] = {}


def register(exp: BaseExperiment) -> None:
    REGISTRY[exp.id] = exp


def get_experiment(exp_id: str) -> BaseExperiment | None:
    return REGISTRY.get(exp_id)
