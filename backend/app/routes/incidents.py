"""PRISM AI: Incidents & Review Queue API Route
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.models import IncidentItem, IncidentCreateRequest, ReviewUpdateRequest
from backend.app.services.database import list_incidents, update_incident_review, add_incident
from backend.app.services.inference_service import get_inference_engine
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentItem])
def get_incidents(status: Optional[str] = Query(default="ALL")):
    return list_incidents(status_filter=status)


@router.post("", response_model=IncidentItem)
def create_incident(req: IncidentCreateRequest):
    engine = get_inference_engine()
    prediction = engine.run_inference(
        text=req.text,
        image_base64=req.image_base64
    )

    incident_id = f"INC-{str(uuid.uuid4())[:6].upper()}"
    new_item = {
        "id": incident_id,
        "title": req.title,
        "text": req.text,
        "image_type": "user_evidence_upload",
        "severity_level": prediction["predicted_severity"],
        "severity_name": prediction["severity_name"],
        "calibrated_confidence": prediction["calibrated_confidence"],
        "raw_softmax_confidence": prediction["raw_softmax_confidence"],
        "status": "UNREVIEWED",
        "review_notes": "",
        "lat": req.lat,
        "lng": req.lng,
        "region": req.region,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "needs_review": prediction["needs_human_review"],
        "entities": {
            "urgency": prediction["severity_name"].split()[0],
            "recommended_action": prediction["recommended_action"],
            "quality_weights": prediction["quality_weights"]
        }
    }
    saved = add_incident(new_item)
    return saved


@router.patch("/{incident_id}/review")
def review_incident(incident_id: str, req: ReviewUpdateRequest):
    result = update_incident_review(
        incident_id=incident_id,
        status=req.status,
        notes=req.reviewer_notes or "",
        override_severity=req.override_severity
    )
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"success": True, "updated": result}
