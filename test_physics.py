
import math
from typing import Any

COULOMB_K = 8.99e9

def compute(state: dict[str, Any]) -> dict[str, Any]:
    # Slider values from screenshot: Glass +100, Plastic -100
    q1_micro = state.get("glassChargeMicroC", 100.0)
    q2_micro = state.get("plasticChargeMicroC", -100.0)
    r = state.get("distanceMeters", 2.5)

    q1_c = q1_micro * 1e-6
    q2_c = q2_micro * 1e-6

    # Force magnitude
    force = COULOMB_K * abs(q1_c * q2_c) / (r * r)
    product = q1_c * q2_c
    
    # Target angles
    angle_mag = min(2.0 + 3.0 * math.log10(1.0 + force), 25.0)
    
    if product < 0:
        # Attraction: Should move towards center
        # Glass (Left) -> Positive (Clockwise)
        # Plastic (Right) -> Negative (Counter-Clockwise)
        glass_target = angle_mag
        plastic_target = -angle_mag
    else:
        # Repulsion: Should move away from center
        glass_target = -angle_mag
        plastic_target = angle_mag
        
    return {
        "force": force,
        "product": product,
        "angle_mag": angle_mag,
        "glass_target": glass_target,
        "plastic_target": plastic_target
    }

print(compute({}))
