"""PRISM AI: Pydantic Data Contracts & API Schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class InferenceRequest(BaseModel):
    text: Optional[str] = Field(default="", description="Emergency 911 dispatch text or field report")
    image_base64: Optional[str] = Field(default=None, description="Base64 encoded disaster image or empty")
    blur_sigma: Optional[float] = Field(default=0.0, description="Injected Gaussian blur sigma (0.0 - 10.0)")
    packet_loss: Optional[float] = Field(default=0.0, description="Injected packet loss percentage (0 - 60)")
    drop_vision: Optional[bool] = Field(default=False, description="Simulate missing vision stream")
    drop_text: Optional[bool] = Field(default=False, description="Simulate missing text report")


class QualityMetricsSchema(BaseModel):
    sharpness: float
    sharpness_normalized: float
    brightness: float
    contrast: float
    noise_level: float
    text_length_score: float
    keyword_density: float
    clarity_score: float


class BaselineComparisonSchema(BaseModel):
    predicted_level: int
    predicted_name: str
    raw_confidence: float
    status: str
    flaw_description: str


class InferenceResponse(BaseModel):
    predicted_severity: int
    severity_name: str
    recommended_action: str
    calibrated_confidence: float
    raw_softmax_confidence: float
    class_probabilities: List[float]
    uncertainty: Dict[str, Any]
    quality_weights: Dict[str, float]
    quality_metrics: Dict[str, Any]
    semantic_cosine: float
    needs_human_review: bool
    review_reasons: List[str]
    baseline_comparison: Optional[BaselineComparisonSchema] = None
    processed_image_base64: Optional[str] = None


class IncidentCreateRequest(BaseModel):
    title: str
    text: str
    image_base64: Optional[str] = None
    lat: float
    lng: float
    region: str


class IncidentItem(BaseModel):
    id: str
    title: str
    text: str
    image_type: str
    severity_level: int
    severity_name: str
    calibrated_confidence: float
    raw_softmax_confidence: float
    status: str  # UNREVIEWED, VERIFIED, REJECTED, DISPATCHED
    review_notes: Optional[str] = ""
    lat: float
    lng: float
    region: str
    created_at: str
    needs_review: bool
    entities: Dict[str, Any]


class ReviewUpdateRequest(BaseModel):
    status: str  # VERIFIED, REJECTED, DISPATCHED
    reviewer_notes: Optional[str] = ""
    override_severity: Optional[int] = None
