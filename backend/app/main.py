"""PRISM AI: FastAPI Application Entrypoint
Perception, Reasoning and Intelligent Situational Mapping
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import predict, incidents, robustness, evaluation
from backend.app.services.database import init_db
from backend.app.services.inference_service import get_inference_engine

app = FastAPI(
    title="PRISM AI - Disaster Intelligence Engine",
    description="Quality-Aware Multimodal Fusion & Calibrated Uncertainty Backend",
    version="1.0.0"
)

# Configure CORS for local development and demonstration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(predict.router)
app.include_router(incidents.router)
app.include_router(robustness.router)
app.include_router(evaluation.router)


@app.on_event("startup")
def on_startup():
    print("[PRISM AI] Initializing database...")
    init_db()
    print("[PRISM AI] Pre-loading inference models...")
    get_inference_engine()
    print("[PRISM AI] System ready on http://127.0.0.1:8000")


@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "system": "PRISM AI Tactical Triage Platform",
        "version": "1.0.0",
        "models": {
            "vision": "Multi-Scale CNN Embedder (128-d)",
            "text": "BiGRU Self-Attention Transformer (128-d)",
            "fusion": "Quality-Aware Gated MLP Head",
            "calibration": "Platt / Temperature Scaled (T=1.42)"
        }
    }
