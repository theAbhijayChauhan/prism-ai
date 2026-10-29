"""PRISM AI: Predict API Route
Handles multimodal inference requests with live quality estimation and calibration.
"""

from fastapi import APIRouter, HTTPException
from backend.app.schemas.models import InferenceRequest, InferenceResponse
from backend.app.services.inference_service import get_inference_engine

router = APIRouter(prefix="/api", tags=["Inference"])


@router.post("/predict", response_model=InferenceResponse)
def predict(request: InferenceRequest):
    engine = get_inference_engine()
    try:
        result = engine.run_inference(
            text=request.text or "",
            image_base64=request.image_base64,
            blur_sigma=request.blur_sigma or 0.0,
            packet_loss=request.packet_loss or 0.0,
            drop_vision=request.drop_vision or False,
            drop_text=request.drop_text or False
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
