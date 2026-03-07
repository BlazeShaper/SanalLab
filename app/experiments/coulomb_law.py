"""
Coulomb's Law Step-by-Step experiment.
Users enter charge, mass, distance and time values;
the module computes electrostatic force, acceleration, etc.
"""
from __future__ import annotations
import math
from typing import Any

from app.experiments.registry import BaseExperiment, register

COULOMB_K = 8.99e9  # N·m²/C²


class CoulombLawExperiment(BaseExperiment):

    @property
    def id(self) -> str:
        return "coulomb_law"

    @property
    def name(self) -> str:
        return "exp.coulomb_law.name"

    # ------------------------------------------------------------------

    def default_state(self) -> dict[str, Any]:
        return {
            "q1": 5.0,           # Charge q₁ (µC)
            "q2": -5.0,          # Charge q₂ (µC)
            "mass1": 10.0,       # Mass m₁ (g)
            "mass2": 10.0,       # Mass m₂ (g)
            "distance": 50.0,    # Distance r (cm)
            "time": 10.0,        # Time t (ms)
            "currentStep": 1,
            "running": True,
        }

    def controls_schema(self) -> list[dict[str, Any]]:
        return []

    def compute(self, state: dict[str, Any]) -> dict[str, Any]:
        q1_micro = state.get("q1", 5.0)
        q2_micro = state.get("q2", -5.0)
        m1_g = state.get("mass1", 10.0)
        m2_g = state.get("mass2", 10.0)
        r_cm = max(1e-10, abs(state.get("distance", 50.0)))
        t_ms = state.get("time", 10.0)

        # Convert to SI units
        q1 = q1_micro * 1e-6
        q2 = q2_micro * 1e-6
        m1 = m1_g * 1e-3
        m2 = m2_g * 1e-3
        r = r_cm * 1e-2
        t = t_ms * 1e-3

        # Coulomb's Law: F = k · |q₁·q₂| / r²
        force = 0.0
        if q1 != 0 and q2 != 0:
            force = COULOMB_K * abs(q1 * q2) / (r * r)

        product = q1 * q2
        if q1 == 0 or q2 == 0:
            force_label = "force.none"
        elif product < 0:
            force_label = "force.attractive"
        else:
            force_label = "force.repulsive"

        # Acceleration a = F / m
        a1 = force / max(abs(m1), 1e-50) if m1 != 0 else 0.0
        a2 = force / max(abs(m2), 1e-50) if m2 != 0 else 0.0

        # Velocity after time t:  v = a * t
        v1 = a1 * t
        v2 = a2 * t

        # Displacement after time t: s = ½ a t²
        s1 = 0.5 * a1 * t * t
        s2 = 0.5 * a2 * t * t

        return {
            "force": force,
            "forceFormatted": self._fmt_sci(force, "N"),
            "forceLabel": force_label,
            "q1Formatted": self._fmt_sci(q1, "C"),
            "q2Formatted": self._fmt_sci(q2, "C"),
            "a1": a1,
            "a1Formatted": self._fmt_sci(a1, "m/s²"),
            "a2": a2,
            "a2Formatted": self._fmt_sci(a2, "m/s²"),
            "v1": v1,
            "v1Formatted": self._fmt_sci(v1, "m/s"),
            "v2": v2,
            "v2Formatted": self._fmt_sci(v2, "m/s"),
            "s1": s1,
            "s1Formatted": self._fmt_sci(s1, "m"),
            "s2": s2,
            "s2Formatted": self._fmt_sci(s2, "m"),
            "currentStep": state.get("currentStep", 1),
            "isAttractive": product < 0 if (q1 != 0 and q2 != 0) else False,
        }

    def learning_content(self) -> dict[str, Any]:
        return {
            "summary": "learning.coulomb.summary",
            "concepts": [
                {
                    "num": "01",
                    "title": "learning.coulomb.concept1.title",
                    "desc": "learning.coulomb.concept1.desc",
                },
                {
                    "num": "02",
                    "title": "learning.coulomb.concept2.title",
                    "desc": "learning.coulomb.concept2.desc",
                },
                {
                    "num": "03",
                    "title": "learning.coulomb.concept3.title",
                    "desc": "learning.coulomb.concept3.desc",
                },
            ],
        }

    def report_fields(self) -> list[str]:
        return ["q1", "q2", "mass1", "mass2", "distance", "time"]

    # helpers
    @staticmethod
    def _fmt_sci(val: float, unit: str) -> str:
        if not math.isfinite(val):
            return f"0.000 {unit}"
        if abs(val) == 0:
            return f"0 {unit}"
        return f"{val:.3e} {unit}"


# ---- auto-register ---------------------------------------------------
register(CoulombLawExperiment())
