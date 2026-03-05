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
        return "Electrostatics: Glass vs Plastic (Silk & Wool)"

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
                "label": "Rub Glass Rod with Silk",
                "icon": "auto_awesome",
                "action": "rubGlass",
            },
            {
                "type": "button",
                "id": "rubPlastic",
                "label": "Rub Plastic Rod with Wool",
                "icon": "texture",
                "action": "rubPlastic",
            },
            {
                "type": "slider",
                "id": "distance",
                "label": "Rod Distance",
                "field": "distanceMeters",
                "min": 0.5,
                "max": 5.0,
                "step": 0.1,
                "unit": "m",
            },
            {
                "type": "toggle",
                "id": "showCharges",
                "label": "Show Charges",
                "field": "showCharges",
            },
            {
                "type": "toggle",
                "id": "showForces",
                "label": "Show Force Arrows",
                "field": "showForces",
            },
        ]

    def compute(self, state: dict[str, Any]) -> dict[str, Any]:
        q1_micro = state.get("glassChargeMicroC", 0.0)
        q2_micro = state.get("plasticChargeMicroC", 0.0)
        r = max(0.05, state.get("distanceMeters", 2.5))

        q1_c = q1_micro * 1e-6
        q2_c = q2_micro * 1e-6

        force = 0.0
        if q1_c != 0 and q2_c != 0:
            force = COULOMB_K * abs(q1_c * q2_c) / (r * r)

        product = q1_c * q2_c
        if q1_c == 0 or q2_c == 0:
            force_label = "No Force (Neutral)"
        elif product < 0:
            force_label = "Attractive Force"
        else:
            force_label = "Repulsive Force"

        # Target angles for the pendulum-like animation
        glass_target = 2.0
        plastic_target = -2.0
        if q1_c != 0 and q2_c != 0:
            angle_mag = min(force * 120, 10)
            if product < 0:
                glass_target = angle_mag
                plastic_target = -angle_mag
            else:
                glass_target = -angle_mag
                plastic_target = angle_mag

        return {
            "force": force,
            "forceFormatted": f"{force:.3f} N" if math.isfinite(force) else "0.000 N",
            "forceLabel": force_label,
            "q1Formatted": self._fmt_micro(q1_micro),
            "q2Formatted": self._fmt_micro(q2_micro),
            "glassTarget": glass_target,
            "plasticTarget": plastic_target,
            "showCharges": state.get("showCharges", True),
            "showForces": state.get("showForces", False),
        }

    def learning_content(self) -> dict[str, Any]:
        return {
            "summary": (
                'When you rub materials together, electrons move. '
                'Rubbing <span class="font-bold text-sky-600 dark:text-sky-400">glass with silk</span> '
                'leaves the glass positively charged (+). Rubbing '
                '<span class="font-bold text-amber-700 dark:text-amber-500">plastic with wool</span> '
                'leaves the plastic negatively charged (-).'
            ),
            "concepts": [
                {
                    "num": "01",
                    "title": "Charging by Friction",
                    "desc": "The transfer of electrons from one uncharged object to another.",
                },
                {
                    "num": "02",
                    "title": "Coulomb's Law",
                    "desc": "Force between two charges is proportional to their product and inverse to distance².",
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


# ---- auto-register ---------------------------------------------------
register(ElectrostaticsExperiment())
