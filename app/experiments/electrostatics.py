"""
Electrostatics experiment — Glass vs Plastic (Silk & Wool).
"""
from __future__ import annotations
import math
from typing import Any

from app.experiments.registry import BaseExperiment, register

COULOMB_K = 8.99e9  # N·m²/C²


class ElectrostaticsExperiment(BaseExperiment):

    @property
    def id(self) -> str:
        return "electrostatics"

    @property
    def name(self) -> str:
        # Returns an i18n key — frontend translates via t()
        return "exp.electrostatics.name"

    # ------------------------------------------------------------------

    def default_state(self) -> dict[str, Any]:
        return {
            "glassChargeMicroC": 0.0,
            "plasticChargeMicroC": 0.0,
            "distanceMeters": 2.5,
            "showCharges": True,
            "showForces": False,
            "running": True,
            # animation helpers (angular positions in degrees)
            "glassAngleDeg": 2.0,
            "plasticAngleDeg": -2.0,
            "glassVel": 0.0,
            "plasticVel": 0.0,
        }

    def controls_schema(self) -> list[dict[str, Any]]:
        return [
            {
                "type": "button",
                "id": "rubGlass",
                "label": "exp.electrostatics.rubGlass",
                "icon": "auto_awesome",
                "action": "rubGlass",
            },
            {
                "type": "button",
                "id": "rubPlastic",
                "label": "exp.electrostatics.rubPlastic",
                "icon": "texture",
                "action": "rubPlastic",
            },
            {
                "type": "slider",
                "id": "glassCharge",
                "label": "exp.electrostatics.glassCharge",
                "field": "glassChargeMicroC",
                "min": -100.0,
                "max": 100.0,
                "step": 0.5,
                "unit": " µC",
            },
            {
                "type": "slider",
                "id": "plasticCharge",
                "label": "exp.electrostatics.plasticCharge",
                "field": "plasticChargeMicroC",
                "min": -100.0,
                "max": 100.0,
                "step": 0.5,
                "unit": " µC",
            },
            {
                "type": "slider",
                "id": "distance",
                "label": "exp.electrostatics.distance",
                "field": "distanceMeters",
                "min": 0.01,
                "max": 10.0,
                "step": 0.01,
                "unit": " m",
            },
            {
                "type": "toggle",
                "id": "showCharges",
                "label": "exp.electrostatics.showCharges",
                "field": "showCharges",
            },
            {
                "type": "toggle",
                "id": "showForces",
                "label": "exp.electrostatics.showForces",
                "field": "showForces",
            },
        ]

    def compute(self, state: dict[str, Any]) -> dict[str, Any]:
        q1_micro = state.get("glassChargeMicroC", 0.0)
        q2_micro = state.get("plasticChargeMicroC", 0.0)
        r = max(1e-6, state.get("distanceMeters", 2.5))  # prevent division by zero

        q1_c = q1_micro * 1e-6  # convert µC to C
        q2_c = q2_micro * 1e-6

        # Coulomb's Law: F = k · |q₁·q₂| / r²
        force = 0.0
        if q1_c != 0 and q2_c != 0:
            force = COULOMB_K * abs(q1_c * q2_c) / (r * r)

        product = q1_c * q2_c
        if q1_c == 0 or q2_c == 0:
            force_label = "force.none"
        elif product < 0:
            force_label = "force.attractive"
        else:
            force_label = "force.repulsive"

        # Target angles for the pendulum-like animation
        # Use logarithmic scaling so animation stays visible at any magnitude
        glass_target = 2.0
        plastic_target = -2.0
        if q1_c != 0 and q2_c != 0:
            angle_mag = min(2.0 + 3.0 * math.log10(1.0 + force), 25.0)
            if product < 0:
                glass_target = -angle_mag
                plastic_target = angle_mag
            else:
                glass_target = angle_mag
                plastic_target = -angle_mag

        return {
            "force": force,
            "forceFormatted": self._fmt_force(force),
            "forceLabel": force_label,
            "q1Formatted": self._fmt_micro(q1_micro),
            "q2Formatted": self._fmt_micro(q2_micro),
            "glassTarget": glass_target,
            "plasticTarget": plastic_target,
            "showCharges": state.get("showCharges", True),
            "showForces": state.get("showForces", False),
        }

    def learning_content(self) -> dict[str, Any]:
        # Return i18n keys — frontend translates
        return {
            "summary": "learning.summary",
            "concepts": [
                {
                    "num": "01",
                    "title": "learning.concept1.title",
                    "desc": "learning.concept1.desc",
                },
                {
                    "num": "02",
                    "title": "learning.concept2.title",
                    "desc": "learning.concept2.desc",
                },
            ],
        }

    def report_fields(self) -> list[str]:
        return ["glassChargeMicroC", "plasticChargeMicroC", "distanceMeters"]

    # helpers
    @staticmethod
    def _fmt_micro(val: float) -> str:
        sign = "+" if val > 0 else ("-" if val < 0 else "")
        return f"{sign}{abs(val):.1f} µC"

    @staticmethod
    def _fmt_force(force: float) -> str:
        if not math.isfinite(force):
            return "0.000 N"
        if force >= 1e6:
            return f"{force:.3e} N"
        if force >= 1000:
            return f"{force:,.1f} N"
        return f"{force:.3f} N"


# ---- auto-register ---------------------------------------------------
register(ElectrostaticsExperiment())
