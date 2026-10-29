# PRISM AI // Perception, Reasoning & Intelligent Situational Mapping

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.15.0-red.svg)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.137.0-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-15803d.svg)](https://leafletjs.com)
[![Status](https://img.shields.io/badge/Prototype-Competition%20Ready-emerald.svg)]()

> **Central Research Question**: *Can quality-aware multimodal fusion produce more reliable disaster assessments than standard models when inputs are missing, noisy, or contradictory?*

---

## 📑 Table of Contents
1. [Executive Summary & Core Novelty](#-executive-summary--core-novelty)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [Deep Learning Mechanics & Mathematics](#-deep-learning-mechanics--mathematics)
4. [Platform Features Deep Dive](#-platform-features-deep-dive)
5. [Step-by-Step User & Testing Guide](#-step-by-step-user--testing-guide)
6. [How to Ingest Custom Images & Reports](#-how-to-ingest-custom-images--reports)
7. [Experimental Benchmarks & Research Findings](#-experimental-benchmarks--research-findings)
8. [REST API Documentation](#-rest-api-documentation)
9. [3-Minute Competition Demo Walkthrough](#-3-minute-competition-demo-walkthrough)
10. [Governance, Ethics & Limitations](#-governance-ethics--limitations)

---

## 🔬 Executive Summary & Core Novelty

In rapid-onset crises such as urban flash floods, levee breaches, and hurricane surges, emergency operation centers receive heterogeneous, fragmented, and noisy data. Aerial drone footage is frequently obscured by atmospheric spray, propeller turbulence, turbid water glare, and severe lens blur; emergency 911 dispatch calls are brief, slang-heavy, and often omit precise geolocation tokens.

### The Fundamental Flaw of Standard Models
Conventional multimodal architectures rely on **naive feature concatenation**:
$$\mathbf{h}_{\text{fused}} = \text{MLP}([\mathbf{z}_{\text{vision}}, \mathbf{z}_{\text{text}}])$$
When visual sensors degrade, standard models suffer from **catastrophic overconfidence**: their uncalibrated softmax probability remains stubbornly at **95%–99% certainty**, despite the underlying classification accuracy plummeting to 33%. In critical emergency operations, this leads to fatal resource misallocations.

### The PRISM Solution
PRISM AI introduces an end-to-end reliability-aware deep learning framework:
1. **Real-Time Quality Estimation**: Computes discrete Laplacian variance ($\sigma_L^2$), exposure metrics, and linguistic keyword density without third-party API dependencies.
2. **Quality-Aware Gated Fusion**: A learned gating head dynamically modulates visual trust ($\alpha_v$) and textual trust ($\alpha_t$), routing reliance away from corrupted streams.
3. **Missing-Modality Invariance**: Modality masks ensure zero-shot fail-safe operation when visual or audio streams are completely severed.
4. **Platt Temperature Scaling ($T=1.42$)**: Aligns raw logits with true empirical probabilities, reducing Expected Calibration Error (ECE) by **66%**.
5. **Calibrated Abstention**: Automatically routes high-entropy or low-confidence cases into a **Human-in-the-Loop (HITL)** triage queue rather than guessing.

---

## 🏛️ End-to-End System Architecture

```
prism-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application server & CORS configuration
│   │   ├── schemas/models.py    # Strict Pydantic contracts (Inference, Incidents, Reviews)
│   │   ├── services/
│   │   │   ├── inference_service.py # Neural pipeline coordinator & corruption injection engine
│   │   │   └── database.py          # SQLite persistence store for incidents & reviewer actions
│   │   └── routes/
│   │       ├── predict.py       # POST /api/predict (Multimodal inference with quality gating)
│   │       ├── incidents.py     # GET/POST /api/incidents & PATCH review status
│   │       ├── robustness.py    # GET /samples & POST /api/robustness/sweep
│   │       └── evaluation.py    # GET /api/evaluation (Benchmark metrics & model cards)
│   └── prism_incidents.db       # Seeded SQLite database storing disaster telemetry
├── ml/
│   ├── data/
│   │   ├── dataset.py           # Curated Houston flood benchmark & synthetic partition generator
│   │   └── quality_metrics.py   # Laplacian sharpness, brightness, contrast, text clarity
│   ├── models/
│   │   ├── vision_encoder.py    # Multi-Scale Convolutional Feature Extractor (128-dim)
│   │   ├── text_encoder.py      # BiGRU + Multi-Head Self-Attention text transformer (128-dim)
│   │   ├── gated_fusion.py      # PRISM Quality Gating Head vs Standard Baseline
│   │   └── calibrated_model.py  # Platt Scaler (T=1.42) & Calibrated Abstention Engine
│   ├── train.py                 # Multi-task training script with modality dropout (p=0.15)
│   ├── checkpoints/
│   │   └── prism_model.pt       # Trained neural weights checkpoint (Accuracy: 94.0%)
│   └── evaluation/
│       └── benchmarks.py        # Macro-F1, Accuracy, ECE, Brier score benchmark engine
├── frontend/                    # Mission-Critical Tactical Console (Stitch Design System)
│   ├── src/
│   │   ├── components/TopNav.tsx    # Live telemetry bar, GPU monitor, navigation tabs
│   │   ├── pages/
│   │   │   ├── TriageOverview.tsx   # 3-column triage console + bottom sensor stress lab
│   │   │   ├── IncidentMap.tsx      # Dark CartoDB Leaflet geospatial situational map
│   │   │   ├── EvidenceUpload.tsx   # Live evidence intake & real-time preview engine
│   │   │   ├── RobustnessLabPage.tsx# Deep side-by-side baseline comparison & sweep bench
│   │   │   └── EvaluationReport.tsx # Empirical research tables, confusion matrix & model cards
│   │   ├── api/client.ts            # Type-safe API client connecting to FastAPI
│   │   └── types/index.ts           # Shared TypeScript interfaces
├── tests/
│   └── test_pipeline.py         # Automated Pytest / Unittest integration suite
├── scripts/
│   ├── generate_project_info_pdf.py # Generates 12-page comprehensive Project Info manual
│   └── generate_blueprint_pdf.py    # ReportLab PDF toolchain
├── Project_Info.pdf             # 12-page comprehensive architecture, implementation & defense manual
├── Project Info.pdf             # Space-tolerant alias of Project_Info.pdf
├── run_all.bat                  # One-click Windows launch script
└── run_all.ps1                  # One-click PowerShell launch script
```

---

## 📐 Deep Learning Mechanics & Mathematics

### 1. Real-Time Image Quality Metric (Laplacian Variance)
To detect whether an incoming drone frame is blurred by spray or turbulence, PRISM computes the variance of the 2D Laplacian operator applied to the grayscale intensity array $I$:
$$\nabla^2 I = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2}$$
$$\sigma_L^2 = \text{Var}(\nabla^2 I) = \frac{1}{N} \sum_{x,y} \left( \nabla^2 I(x, y) - \mu_L \right)^2$$
* **Pristine Sharp Imagery**: $\sigma_L^2 > 100$ (High spatial gradients).
* **Severely Blurred Imagery**: $\sigma_L^2 < 25$ (Low variance).
* **Normalized Indicator**: $q_{\text{sharp}} = \min\left(1.0, \frac{\sigma_L^2}{200.0}\right)$.

### 2. Dynamic Quality-Aware Gating
Let $\mathbf{z}_v \in \mathbb{R}^{128}$ be the normalized visual embedding and $\mathbf{z}_t \in \mathbb{R}^{128}$ be the normalized textual embedding. We construct the concatenated quality vector:
$$\mathbf{q} = [\mathbf{q}_v, \mathbf{q}_t, \cos(\mathbf{z}_v, \mathbf{z}_t)] \in \mathbb{R}^{10}$$
The gating network computes raw modality gating logits:
$$[g_v, g_t]^T = \mathbf{W}_g \mathbf{q} + \mathbf{b}_g \quad (\mathbf{W}_g \in \mathbb{R}^{2 \times 10})$$
Given modality presence masks $m_v, m_t \in \{0, 1\}$, absent modalities are suppressed with $-\infty$:
$$\tilde{g}_v = \begin{cases} g_v & \text{if } m_v = 1 \\ -10^9 & \text{if } m_v = 0 \end{cases}, \quad \tilde{g}_t = \begin{cases} g_t & \text{if } m_t = 1 \\ -10^9 & \text{if } m_t = 0 \end{cases}$$
Dynamic gating weights are normalized via Softmax:
$$[\alpha_v, \alpha_t] = \text{Softmax}([\tilde{g}_v, \tilde{g}_t]) \quad \text{such that } \alpha_v + \alpha_t = 1.0$$
The modulated representations are fused through LayerNorm into the deep classification MLP:
$$\mathbf{h}_{\text{fused}} = [\alpha_v \mathbf{W}_v \mathbf{z}_v, \, \alpha_t \mathbf{W}_t \mathbf{z}_t, \, \mathbf{q}_v, \, \mathbf{q}_t]$$
$$\mathbf{z}_{\text{logits}} = \text{MLP}(\text{LayerNorm}(\mathbf{h}_{\text{fused}})) \in \mathbb{R}^4$$

### 3. Platt Temperature Scaling & Calibrated Abstention
Raw logits $\mathbf{z}$ are calibrated via validation temperature $T = 1.42$:
$$P(Y = k \mid \mathbf{x}) = \frac{\exp(z_k / T)}{\sum_{j=1}^4 \exp(z_j / T)}$$
Epistemic uncertainty is quantified via normalized Shannon entropy:
$$\tilde{H} = -\frac{1}{\log_2(4)} \sum_{k=1}^4 p_k \log_2(p_k)$$
**Abstention Decision Rule**:
The system sets `needs_human_review = True` and routes the case to human audit if:
1. Calibrated confidence $\max_k P(Y=k \mid \mathbf{x}) < 65.0\%$; OR
2. Normalized entropy $\tilde{H} > 0.75$ (high ambiguity between classes); OR
3. Visual input is severely degraded ($\sigma_L^2 < 25.0$) and text report is absent.

---

## 🖥️ Platform Features Deep Dive

### 1. Multimodal Triage Overview Workspace
* **Drone Visual Stream (Left)**: Renders live surveillance video feeds with tactical HUD reticle, camera azimuth ($184.2^\circ$), elevation ($-48.2^\circ$), UHD resolution tags, real-time Laplacian sharpness ($94.2 \text{ PASS}$), and automated bounding boxes:
  * `BBOX #1: STRANDED POPULATION (Conf: 0.94)`
  * `BBOX #2: RESCUE INFLATABLE (Conf: 0.98)`
  * `BBOX #3: RAPID SURGE LINE (Rate: +15cm/h)`
* **911 Audio Dispatch Parser (Center)**: Ingests 911 audio waveforms, displays automated Whisper-v3 transcripts, extracts critical Named Entity Recognition (NER) slots (*Urgency: Critical, Trapped: 6, Water Inundation: 2.1m, Structural Risk: Compromised*), and highlights transformer token attention weights ($\alpha_{\text{token}}$).
* **Calibrated Decision Fusion (Right)**: Computes the fused priority (`SEVERITY LEVEL 4 - CRITICAL`). Directly compares raw overconfident softmax ($96.1\%$) against PRISM's calibrated posterior ($87.4\%$) with 95% Credible Intervals. Features segmented LED gauges showing real-time weight shifts.

### 2. Interactive Sensor Stress Lab & Robustness Engine
* **Gaussian Blur Slider ($\sigma \in [0.0, 10.0]$)**: Drag the slider to inject lens blur and water spray into the feed in real-time.
* **Packet Loss Slider ($0\% \text{ to } 60\%$)**: Simulates telemetry corruption and bit loss.
* **Modality Dropout Toggles**: Click `DROP VISION STREAM` or `DROP AUDIO DISPATCH` to simulate severed communication lines.
* **Side-by-Side Model Bench**: Positions the Standard Baseline directly against PRISM. Watch the baseline maintain blind $99\%+$ certainty on corrupted frames, while PRISM dynamically shifts weights ($\alpha_v: 0.62 \to 0.10$) and triggers calibrated abstention.

### 3. Geospatial Situation Map & Human-in-the-Loop Review
* Interactive dark CartoDB Leaflet map centered on Houston disaster zones.
* Color-coded incident pins:
  * **Crimson**: Level 4 Critical (Life Threat)
  * **Amber**: Level 3 Severe (Flooded Ingress / Vehicles)
  * **Blue**: Level 2 Moderate (Roadway Waterlogging)
  * **Cyan**: Level 1 Advisory (Seasonal Drainage Runoff)
* Click any marker to open the tactical command drawer, inspect ingested evidence, and execute decisions: `HUMAN VERIFY (HITL)`, `FLAG FALSE ALARM`, or `AUTHORIZE RESCUE DISPATCH`. Approved pins gain a verified white border synchronized across the SQLite database.

### 4. Disaster Evidence Intake
* Drag-and-drop file upload for aerial drone or satellite imagery.
* Dispatch narrative input with real-time domain keyword analysis.
* Geographic coordinate inputs (latitude, longitude, region).
* Click **RUN PREVIEW ASSESSMENT** to compute instant preview telemetry before committing the record to the live queue.

### 5. Research Benchmarks & Model Cards
* Empirically compares all 4 model configurations across held-out disaster test partitions.
* Displays a $4 \times 4$ Confusion Matrix proving clean diagonal classification across all four disaster tiers.
* Includes the RFC Data Governance Checklist confirming spatial event isolation and zero data leakage.

---

## ⚡ Step-by-Step User & Testing Guide

### Launching the Platform

#### Option A: One-Click Launch (Recommended)
Double-click `run_all.bat` (or execute `.\run_all.ps1` in PowerShell). Both servers will start in separate terminal windows:
* **Frontend UI**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
* **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Option B: Manual CLI Execution
In Terminal 1 (Backend):
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

---

### Running the Test Suite
To verify the PyTorch encoders, quality gating head, database operations, and temperature calibration:
```bash
python -m unittest tests/test_pipeline.py
```
Output:
```
Ran 4 tests in 0.153s
OK
[PRISM AI] Loaded trained weights from ml/checkpoints/prism_model.pt
```

### Re-Training the Neural Models
To execute multi-task training across the partitioned disaster benchmark with modality dropout ($p=0.15$):
```bash
python -m ml.train
```
*(Saves trained model weights to `ml/checkpoints/prism_model.pt` with 94.0% accuracy).*

---

## 📸 How to Ingest Custom Images & Reports

1. Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** and navigate to the **"EVIDENCE INTAKE"** tab.
2. Drag and drop any image (satellite, UAV drone, or flood photo) into the upload box.
3. Fill in the incident title and geographic sector (e.g. `Harris County Sector 4`).
4. Enter the emergency dispatch narrative in the text box, for example:
   > *"Flash flood trapped 4 residents on roof, current 18cm/hr, power lines down near water."*
5. Click **"RUN PREVIEW ASSESSMENT"**:
   * The neural network extracts Laplacian sharpness and text keyword density in real-time.
   * Preview the estimated severity level, calibrated posterior, and gating weights on the right panel.
6. Click **"INTAKE INTO TRIAGE QUEUE"**:
   * The incident is committed to the backend SQLite store and immediately pinned on the **SITUATION MAP**!

---

## 📊 Experimental Benchmarks & Research Findings

### 4-Model Comparative Benchmark Matrix
Evaluated on $N=160$ held-out disaster test events across 4 random seeds ($42, 1337, 2026, 9999$):

| Architecture Model | Macro-F1 | Accuracy | ECE (Calib Error) | Brier Score | Latency (ms) | Documented Failure Mode |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. Vision-Only Baseline (CNN)** | 0.742 | 75.8% | 0.184 | 0.231 | 16.2 ms | Fails when water turbidity is high, roofs obscure victims, or camera spray blurs the lens. |
| **2. Text-Only Baseline (BiGRU/Attn)** | 0.781 | 79.2% | 0.152 | 0.198 | 11.4 ms | Fails on slang, brief dispatch tokens, or missing geolocation details. |
| **3. Standard Concatenation Fusion** | 0.819 | 82.5% | 0.141 | 0.174 | 22.8 ms | Blindly accepts corrupted visual inputs; exhibits dangerous overconfidence during noise spikes. |
| **4. PRISM Quality-Aware Gated Fusion** | **0.894** | **90.1%** | **0.048** | **0.092** | 25.1 ms | **+7.5% Macro-F1 improvement; 66% reduction in calibration error (ECE).** |

### Stress Test Degradation Sweep ($\sigma \in [0.0, 10.0]$ px)

| Blur Level ($\sigma$) | Standard Baseline Acc | Baseline Raw Conf | PRISM Calib Acc | PRISM Calib Conf | PRISM Abstain Rate |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.0 px (Pristine)** | 82.5% | 95.2% *(Overconf)* | **90.1%** | 87.4% *(True)* | 4.2% |
| **2.0 px (Light Rain)** | 76.1% | 94.8% | **88.4%** | 82.1% | 12.0% |
| **4.0 px (Turbid Spray)** | 64.3% | 93.9% | **85.2%** | 74.0% | 38.5% |
| **6.0 px (Heavy Fog)** | 52.8% | 92.4% | **82.0%** | 66.2% | 64.2% |
| **8.0 px (Severe Occlusion)** | 41.0% | 91.0% | **79.8%** | 58.0% | 82.1% |
| **10.0 px (Complete Blur)** | 33.5% | **89.6% (Catastrophic)** | **77.5%** | **49.5% (Safe)** | **94.0% (Routed to HITL)** |

> **Core Research Finding**: While the standard baseline suffers an accuracy collapse to 33.5% while remaining 89.6% overconfident, PRISM detects the degradation, reduces calibrated confidence to 49.5%, and triggers human abstention on 94.0% of cases.

---

## 🔌 REST API Documentation

### `POST /api/predict`
Runs multimodal inference with live quality extraction and calibration.
```json
// Request Body
{
  "text": "Flash flood trapped 6 residents on 2nd floor, water rising 15cm/hr.",
  "image_base64": "data:image/jpeg;base64,...",
  "blur_sigma": 2.0,
  "packet_loss": 0.0,
  "drop_vision": false,
  "drop_text": false
}
```
```json
// Response Body
{
  "predicted_severity": 4,
  "severity_name": "SEVERITY LEVEL 4 - CRITICAL",
  "recommended_action": "IMMEDIATE BOAT RESCUE DISPATCH",
  "calibrated_confidence": 87.4,
  "raw_softmax_confidence": 96.1,
  "class_probabilities": [1.2, 3.4, 8.0, 87.4],
  "uncertainty": {
    "entropy": 0.382,
    "normalized_entropy": 0.191,
    "margin": 0.794,
    "ci_95": [84.1, 90.7]
  },
  "quality_weights": {
    "alpha_vision": 0.62,
    "alpha_text": 0.38
  },
  "quality_metrics": {
    "image_sharpness": 94.2,
    "image_sharpness_normalized": 0.47,
    "image_brightness": 65.2,
    "text_clarity_score": 0.85
  },
  "semantic_cosine": 0.884,
  "needs_human_review": false,
  "review_reasons": []
}
```

### Additional Endpoints:
* `GET /api/incidents?status={ALL|UNREVIEWED|VERIFIED|DISPATCHED}`: Lists incidents in triage queue.
* `POST /api/incidents`: Creates a new field incident.
* `PATCH /api/incidents/{id}/review`: Updates review status (`VERIFIED`, `REJECTED`, `DISPATCHED`).
* `POST /api/robustness/sweep`: Executes automated 6-point degradation sweeps.
* `GET /api/evaluation`: Returns empirical benchmark tables and model card data.

---

## ⏱️ 3-Minute Competition Demo Walkthrough

1. **0:00 – 0:30 (The Real-World Crisis)**:
   * Open **TRIAGE OVERVIEW**. Introduce active incident: `TX-FLOOD-8820 (Category 4 Flash Flood)`.
   * Explain that disaster responders receive conflicting, noisy, and degraded evidence.
2. **0:30 – 1:10 (Multimodal Telemetry)**:
   * Show the **Left Panel**: UAV drone feed with tactical HUD reticle, bounding boxes (`Stranded Population`, `Surge Line`), and Laplacian sharpness (`94.2 PASS`).
   * Show the **Center Panel**: 911 audio waveform, Whisper transcript, extracted NER slots (`6 trapped`, `2.1m inundation`), and token attention weights.
   * Show the **Right Panel**: Decision fusion (`Level 4 - Critical`), contrasting raw softmax ($96.1\%$) against calibrated confidence ($87.4\%$).
3. **1:10 – 1:50 (The Signature Robustness Lab Demo)**:
   * Scroll to the bottom **Stress Lab**. Drag the **Gaussian Blur Slider** from `0.0 px` to `6.0 px`.
   * Point out the **Standard Baseline Model**: it blindly maintains `99.4% certainty` on ruined data.
   * Point out **PRISM Quality-Aware Fusion**: it automatically attenuates vision weight ($\alpha_v \to 0.15$), shifts reliance to ground text, and triggers **Calibrated Abstention** (`ATTENTION: VISION MODALITY ATTENUATED • ROUTING TO HUMAN-IN-THE-LOOP`).
4. **1:50 – 2:30 (Geospatial Mapping & Human Oversight)**:
   * Click **SITUATION MAP**. Show pins across Houston flood zones.
   * Select an incident, click **HUMAN VERIFY (HITL)** or **AUTHORIZE RESCUE DISPATCH**, and demonstrate live SQLite synchronization.
5. **2:30 – 3:00 (Research Benchmarks & Governance)**:
   * Click **BENCHMARKS & CARDS**. Present the empirical benchmark table (+7.5% Macro-F1 boost, 66% ECE reduction).
   * Conclude: *PRISM AI does not pretend every prediction is correct; it communicates calibrated uncertainty so human commanders stay in control.*

---

## 🛡️ Governance, Ethics & Limitations

1. **Human-in-the-Loop Safeguard**: PRISM AI is strictly a decision-support prototype. It does not execute autonomous dispatch without commanding officer authorization.
2. **Data Privacy**: No private citizen distress messages or identifiable locations are published; all benchmarks utilize synthetic, public, or appropriately licensed disaster corpora.
3. **Local Sovereignty & Offline Execution**: The entire stack runs 100% locally on CPU or GPU without reliance on proprietary external cloud APIs.

---

## 📜 License
Developed as an open-source deep learning competition entry under the **MIT License**.
*Author: Abhijay Chauhan ([@theAbhijayChauhan](https://github.com/theAbhijayChauhan))*
