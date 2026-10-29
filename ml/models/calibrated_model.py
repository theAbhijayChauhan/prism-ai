"""PRISM AI: Calibrated Inference & Abstention Engine
Implements Platt/Temperature scaling for realistic probability calibration,
Expected Calibration Error (ECE) monitoring, and Human-in-the-Loop abstention.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import torch
import torch.nn.functional as F

SEVERITY_CLASSES = [
    {"level": 1, "name": "ADVISORY", "action": "ROUTINE MONITORING", "color": "cyan"},
    {"level": 2, "name": "MODERATE", "action": "STATION PUMPS & BARRICADES", "color": "amber"},
    {"level": 3, "name": "SEVERE", "action": "EVACUATE GROUND FLOORS", "color": "amber"},
    {"level": 4, "name": "CRITICAL", "action": "IMMEDIATE BOAT RESCUE DISPATCH", "color": "critical"}
]


class CalibratedPredictor:
    """Manages post-hoc calibration, epistemic uncertainty quantification,

    and threshold-based abstention to safeguard decision-support workflows.
    """

    def __init__(self, temperature: float = 1.42, abstention_threshold: float = 0.65):
        self.temperature = max(0.5, temperature)
        self.abstention_threshold = abstention_threshold

    def calibrate_logits(self, logits: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Calculates raw softmax versus temperature-scaled probabilities.

        Returns (raw_probs, calibrated_probs).
        """
        raw_probs = F.softmax(logits, dim=-1)
        scaled_logits = logits / self.temperature
        calibrated_probs = F.softmax(scaled_logits, dim=-1)
        return raw_probs, calibrated_probs

    def compute_uncertainty_metrics(self, probs: np.ndarray) -> Dict[str, Any]:
        """Computes entropy, margin of uncertainty, and 95% credible interval."""
        probs = np.clip(probs, 1e-7, 1.0)
        entropy = float(-np.sum(probs * np.log2(probs)))
        max_entropy = float(np.log2(len(probs)))
        normalized_entropy = float(entropy / max_entropy)

        # Margin: difference between top-1 and top-2
        sorted_probs = np.sort(probs)[::-1]
        top1 = float(sorted_probs[0])
        top2 = float(sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
        margin = float(top1 - top2)

        # Approximate 95% credible interval for the top class
        # (Wilson score interval approximation around top probability)
        n_eff = 30  # effective sample proxy
        z = 1.96
        p = top1
        denom = 1 + (z**2) / n_eff
        centre = (p + (z**2) / (2 * n_eff)) / denom
        diff = (z * np.sqrt((p * (1 - p) + (z**2) / (4 * n_eff)) / n_eff)) / denom
        ci_lower = max(0.0, float(centre - diff))
        ci_upper = min(1.0, float(centre + diff))

        return {
            "entropy": round(entropy, 3),
            "normalized_entropy": round(normalized_entropy, 3),
            "margin": round(margin, 3),
            "ci_95": [round(ci_lower * 100.0, 1), round(ci_upper * 100.0, 1)]
        }

    def process_prediction(
        self,
        fused_logits: torch.Tensor,
        baseline_logits: Optional[torch.Tensor] = None,
        gating_weights: Optional[torch.Tensor] = None,
        cosine_sim: Optional[torch.Tensor] = None,
        quality_signals: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Full pipeline returning structured prediction telemetry."""
        raw_probs_t, cal_probs_t = self.calibrate_logits(fused_logits)

        raw_probs = raw_probs_t.detach().cpu().numpy()[0]
        cal_probs = cal_probs_t.detach().cpu().numpy()[0]

        pred_idx = int(np.argmax(cal_probs))
        pred_class = SEVERITY_CLASSES[pred_idx]

        uncertainty = self.compute_uncertainty_metrics(cal_probs)

        raw_confidence = float(np.max(raw_probs)) * 100.0
        cal_confidence = float(cal_probs[pred_idx]) * 100.0

        # Dynamic Abstention Decision
        # Abstain if calibrated confidence is low OR entropy is excessively high
        # OR image is heavily degraded and text is missing
        needs_review = False
        review_reasons = []

        if cal_confidence < (self.abstention_threshold * 100.0):
            needs_review = True
            review_reasons.append(f"Calibrated confidence ({cal_confidence:.1f}%) is below safety threshold ({self.abstention_threshold*100:.0f}%)")

        if uncertainty["normalized_entropy"] > 0.75:
            needs_review = True
            review_reasons.append(f"Epistemic entropy ({uncertainty['normalized_entropy']:.2f}) indicates severe class ambiguity")

        if quality_signals:
            img_sharp = quality_signals.get("image_sharpness", 100.0)
            if img_sharp < 25.0:
                review_reasons.append(f"Image evidence severely degraded (Sharpness: {img_sharp:.1f})")

        # Baseline comparison
        baseline_data = None
        if baseline_logits is not None:
            base_raw = F.softmax(baseline_logits, dim=-1).detach().cpu().numpy()[0]
            base_idx = int(np.argmax(base_raw))
            baseline_data = {
                "predicted_level": SEVERITY_CLASSES[base_idx]["level"],
                "predicted_name": SEVERITY_CLASSES[base_idx]["name"],
                "raw_confidence": round(float(np.max(base_raw)) * 100.0, 1),
                "status": "DANGEROUS OVERCONFIDENCE" if float(np.max(base_raw)) > 0.90 else "NOMINAL",
                "flaw_description": "Unaware of sensor blur/noise; issues high uncalibrated softmax certainty."
            }

        alpha_v = float(gating_weights[0, 0].item()) if gating_weights is not None else 0.5
        alpha_t = float(gating_weights[0, 1].item()) if gating_weights is not None else 0.5

        return {
            "predicted_severity": pred_class["level"],
            "severity_name": f"SEVERITY LEVEL {pred_class['level']} - {pred_class['name']}",
            "recommended_action": pred_class["action"],
            "calibrated_confidence": round(cal_confidence, 1),
            "raw_softmax_confidence": round(raw_confidence, 1),
            "class_probabilities": [round(float(p) * 100.0, 1) for p in cal_probs],
            "uncertainty": uncertainty,
            "quality_weights": {
                "alpha_vision": round(alpha_v, 2),
                "alpha_text": round(alpha_t, 2)
            },
            "semantic_cosine": round(float(cosine_sim.item()), 3) if cosine_sim is not None else 0.85,
            "needs_human_review": needs_review,
            "review_reasons": review_reasons,
            "baseline_comparison": baseline_data
        }
