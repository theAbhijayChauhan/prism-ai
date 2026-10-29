# PRISM AI // Perception, Reasoning and Intelligent Situational Mapping

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.15.0-red.svg)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.137.0-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vite.dev)
[![Status](https://img.shields.io/badge/Prototype-Competition%20Ready-emerald.svg)]()

> **Core Research Contribution**: Can quality-aware multimodal fusion produce more reliable disaster assessments than standard models when inputs are missing, noisy, or contradictory?

PRISM AI is a reliability-aware multimodal decision-support system designed for crisis response, incident commanders, and deep learning competition evaluation. It fuses aerial/drone surveillance imagery and 911 dispatch text reports, estimates input reliability in real-time, downweights degraded inputs via **Quality-Aware Gating**, and employs **Calibrated Abstention** to route uncertain cases to a Human-in-the-Loop review queue rather than issuing dangerous overconfident classifications.

---

## 🌟 System Architecture & Key Capabilities

```
prism-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI server, CORS & route registration
│   │   ├── schemas/models.py    # Pydantic schemas (Inference, Incidents, Reviews)
│   │   ├── services/
│   │   │   ├── inference_service.py # Core ML coordinator & image corruption injector
│   │   │   └── database.py          # SQLite persistence for incidents & human reviews
│   │   └── routes/
│   │       ├── predict.py       # POST /api/predict (Multimodal inference)
│   │       ├── incidents.py     # GET/POST /api/incidents & PATCH review status
│   │       ├── robustness.py    # GET /samples & POST /api/robustness/sweep
│   │       └── evaluation.py    # GET /api/evaluation (Benchmark metrics)
├── ml/
│   ├── data/
│   │   ├── dataset.py           # Curated flood incidents & synthetic split generator
│   │   └── quality_metrics.py   # Laplacian sharpness, brightness, noise, text clarity
│   ├── models/
│   │   ├── vision_encoder.py    # Multi-scale CNN embedding head (128-d)
│   │   ├── text_encoder.py      # BiGRU + Self-Attention text transformer (128-d)
│   │   ├── gated_fusion.py      # PRISM Quality Gating vs Standard Concatenation
│   │   └── calibrated_model.py  # Platt / Temperature Scaler (T=1.42) & Abstention
│   ├── evaluation/
│   │   └── benchmarks.py        # Macro-F1, Accuracy, ECE, Brier score benchmarks
│   ├── train.py                 # Training script with modality dropout (p=0.15)
│   └── checkpoints/
│       └── prism_model.pt       # Trained model weights (94.0% accuracy)
├── frontend/                    # Tactical Operations Console (Stitch Design System)
│   ├── src/
│   │   ├── components/TopNav.tsx
│   │   ├── pages/
│   │   │   ├── TriageOverview.tsx   # 3-column triage console + bottom stress lab
│   │   │   ├── IncidentMap.tsx      # Dark Leaflet map with verified badges
│   │   │   ├── EvidenceUpload.tsx   # Live evidence upload & preview engine
│   │   │   ├── RobustnessLabPage.tsx# Side-by-side baseline comparison & sweeps
│   │   │   └── EvaluationReport.tsx # Benchmarks, confusion matrix & model card
│   │   ├── api/client.ts
│   │   └── types/index.ts
├── tests/
│   └── test_pipeline.py         # Pytest / Unittest integration suite
├── run_all.bat                  # One-click launcher for Windows
└── run_all.ps1                  # PowerShell launcher
```

---

## 🚀 How to Run the Project

### Option A: One-Click Launch (Recommended)
Double-click `run_all.bat` (or run `run_all.ps1` in PowerShell). This initiates both the FastAPI backend and Vite frontend automatically in separate terminal windows.

---

### Option B: Manual Command Line Execution

#### Step 1: Start the Backend API
In the project root folder:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API Documentation will be live at: **http://127.0.0.1:8000/docs**
* Health check endpoint: **http://127.0.0.1:8000/api/health**

#### Step 2: Start the Frontend UI
In a second terminal window:
```bash
cd frontend
npm run dev
```
* Open your browser and navigate to: **http://127.0.0.1:5173**

---

## 🧪 Running the Verification Test Suite

To verify the PyTorch models, quality gating, database transactions, and calibration logic:
```bash
python -m unittest tests/test_pipeline.py
```
Expected output:
```
Ran 4 tests in 0.153s
OK
[PRISM AI] Loaded trained weights from ml/checkpoints/prism_model.pt
```

---

## 🎯 3-Minute Competition Demo Walkthrough (Page 9 Blueprint Guide)

1. **0:00 – 0:30 (The Problem)**:
   - Open **Triage Overview**. Point out the active incident: `TX-FLOOD-8820 (Category 4 Flash Flood)`.
   - Explain that real-world disaster evidence is fragmented, noisy, and sensor streams often blur or drop out.
2. **0:30 – 1:10 (Multimodal Ingestion)**:
   - Walk through the 3 columns:
     - **Left**: Live UAV drone footage with tactical HUD overlays, Bounding Boxes (`Stranded Population`, `Surge Line`), and Laplacian sharpness metric (`94.2 PASS`).
     - **Center**: 911 dispatch audio waveform, Whisper transcript, extracted NER slots (`6 trapped`, `2.1m inundation`), and Transformer attention weights.
     - **Right**: Calibrated Fusion Decision showing `Level 4 - Critical`, temperature-scaled confidence (`87.4%` vs raw uncalibrated `96.1%`), and quality weights (`α_v = 0.62`, `α_t = 0.38`).
3. **1:10 – 1:50 (The Signature Robustness Lab Demo)**:
   - Look at the bottom **Sensor Stress Lab bar**.
   - Drag the **Gaussian Blur Slider** from `0.0 px` up to `6.0 px`.
   - Watch the **Standard Baseline Model**: it blindly maintains `99.4% raw softmax certainty` even on corrupted data.
   - Watch **PRISM Quality-Aware Fusion**: it automatically attenuates vision weight ($\alpha_v \to 0.15$) and shifts reliance to ground dispatch text.
   - When blur exceeds safe thresholds, PRISM triggers **Calibrated Abstention** and displays: `ATTENTION: VISION MODALITY ATTENUATED • ROUTING TO HUMAN-IN-THE-LOOP`.
4. **1:50 – 2:30 (Geospatial Mapping & Human-in-the-Loop Review)**:
   - Switch to the **SITUATION MAP** tab.
   - Show the interactive dark Leaflet map pins across Houston disaster sectors.
   - Select an incident, click **HUMAN VERIFY (HITL)** or **AUTHORIZE RESCUE DISPATCH**, and watch the badge turn emerald/crimson with real-time SQLite database synchronization.
5. **2:30 – 3:00 (Research Benchmarks & Scientific Rigor)**:
   - Switch to **BENCHMARKS & CARDS**.
   - Review the empirical 4-model comparison table proving PRISM's `+7.5%` Macro-F1 improvement and `66%` calibration error (ECE) reduction.
   - Conclude with the core message: *PRISM does not pretend every prediction is correct; it communicates calibrated uncertainty so emergency responders stay in control.*
