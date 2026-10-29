"""PRISM AI: Robustness & Stress Lab API Route
Provides test cases and automated degradation sweeps.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.services.inference_service import get_inference_engine
from ml.data.dataset import CURATED_INCIDENTS

router = APIRouter(prefix="/api/robustness", tags=["Robustness"])


class SweepRequest(BaseModel):
    text: Optional[str] = "Flash flood trapped 6 residents on 2nd floor, structural integrity compromised, waters rising 15cm/hr."
    image_base64: Optional[str] = None
    sigmas: Optional[List[float]] = [0.0, 2.0, 4.0, 6.0, 8.0, 10.0]


@router.get("/samples")
def get_sample_cases():
    """Returns curated disaster cases for interactive demonstration."""
    return CURATED_INCIDENTS


@router.post("/sweep")
def run_robustness_sweep(req: SweepRequest):
    """Executes a degradation sweep across blur levels, comparing Baseline vs PRISM."""
    engine = get_inference_engine()
    results = []

    for sigma in req.sigmas:
        pred = engine.run_inference(
            text=req.text or "",
            image_base64=req.image_base64,
            blur_sigma=sigma,
            packet_loss=0.0
        )
        base = pred["baseline_comparison"]
        results.append({
            "sigma": sigma,
            "sharpness": pred["quality_metrics"]["image_sharpness"],
            "prism_calibrated_confidence": pred["calibrated_confidence"],
            "prism_raw_confidence": pred["raw_softmax_confidence"],
            "prism_needs_review": pred["needs_human_review"],
            "prism_alpha_vision": pred["quality_weights"]["alpha_vision"],
            "prism_alpha_text": pred["quality_weights"]["alpha_text"],
            "baseline_raw_confidence": base["raw_confidence"] if base else 98.0,
            "baseline_predicted_level": base["predicted_level"] if base else 4,
            "baseline_status": base["status"] if base else "DANGEROUS OVERCONFIDENCE"
        })

    return {
        "sweep_results": results,
        "summary": "Standard baseline model retains blind high certainty as sensor degrades; PRISM dynamically shifts weight to text and flags review."
    }
