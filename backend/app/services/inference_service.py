"""PRISM AI: Core Inference Service
Coordinates Vision Encoder, Text Encoder, Gated Fusion, and Calibrated Abstention.
"""

import base64
import io
import os
import re
from typing import Dict, Any, Optional
import numpy as np
from PIL import Image, ImageFilter
import cv2
import torch

from ml.data.quality_metrics import extract_image_quality, extract_text_quality
from ml.models.vision_encoder import VisionEncoder
from ml.models.text_encoder import TextEncoder
from ml.models.gated_fusion import PRISMGatedFusionModel, StandardFusionModel
from ml.models.calibrated_model import CalibratedPredictor, SEVERITY_CLASSES


class PrismInferenceEngine:
    """Singleton service hosting the dual encoders, gated fusion network,

    and temperature-scaled calibrator.
    """

    def __init__(self):
        self.device = torch.device("cpu")
        print("[PRISM AI] Initializing Neural Encoders & Fusion Head...")

        # 1. Instantiate modules
        self.vision_encoder = VisionEncoder(embed_dim=128, num_classes=4).to(self.device)
        self.text_encoder = TextEncoder(embed_dim=128, num_classes=4).to(self.device)
        self.gated_fusion = PRISMGatedFusionModel(embed_dim=128, num_classes=4).to(self.device)
        self.standard_fusion = StandardFusionModel(embed_dim=128, num_classes=4).to(self.device)
        self.calibrator = CalibratedPredictor(temperature=1.42, abstention_threshold=0.65)

        # Load trained checkpoint if exists
        checkpoint_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "checkpoints", "prism_model.pt"))
        if os.path.exists(checkpoint_path):
            try:
                ckpt = torch.load(checkpoint_path, map_location=self.device)
                self.vision_encoder.load_state_dict(ckpt["vision_encoder"])
                self.text_encoder.load_state_dict(ckpt["text_encoder"])
                self.gated_fusion.load_state_dict(ckpt["gated_fusion"])
                self.standard_fusion.load_state_dict(ckpt["standard_fusion"])
                print(f"[PRISM AI] Loaded trained weights from {checkpoint_path}")
            except Exception as e:
                print(f"[PRISM AI] Note on weights: {e}")

        # Set to eval mode
        self.vision_encoder.eval()
        self.text_encoder.eval()
        self.gated_fusion.eval()
        self.standard_fusion.eval()

        print("[PRISM AI] Neural Models Online & Ready.")

    def decode_and_corrupt_image(
        self,
        image_base64: Optional[str],
        blur_sigma: float = 0.0,
        packet_loss: float = 0.0
    ) -> Tuple[Optional[Image.Image], Optional[str]]:
        """Decodes base64 image and injects controlled blur/noise for stress evaluation."""
        if not image_base64 or len(image_base64.strip()) == 0:
            return None, None

        # Clean base64 header if present
        clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64.strip())
        try:
            img_bytes = base64.b64decode(clean_b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception:
            return None, None

        # Apply synthetic blur if requested
        if blur_sigma > 0.0:
            # OpenCV Gaussian blur
            img_np = np.array(img)
            ksize = int(blur_sigma * 4) | 1  # ensure odd
            ksize = max(3, min(31, ksize))
            img_np = cv2.GaussianBlur(img_np, (ksize, ksize), blur_sigma)
            img = Image.fromarray(img_np)

        # Apply packet loss noise if requested
        if packet_loss > 0.0:
            img_np = np.array(img).astype(np.float32)
            noise_prob = packet_loss / 100.0
            mask = np.random.rand(*img_np.shape[:2]) < noise_prob
            img_np[mask] = np.random.choice([0, 255], size=(np.sum(mask), 3))
            img = Image.fromarray(np.clip(img_np, 0, 255).astype(np.uint8))

        # Re-encode to base64 for display in UI
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG", quality=85)
        out_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")

        return img, out_b64

    def run_inference(
        self,
        text: Optional[str] = "",
        image_base64: Optional[str] = None,
        blur_sigma: float = 0.0,
        packet_loss: float = 0.0,
        drop_vision: bool = False,
        drop_text: bool = False
    ) -> Dict[str, Any]:
        """Runs the complete multimodal quality-aware inference pipeline."""
        
        # 1. Process visual evidence
        pil_img = None
        processed_b64 = None
        if not drop_vision:
            pil_img, processed_b64 = self.decode_and_corrupt_image(image_base64, blur_sigma, packet_loss)

        v_quality = extract_image_quality(pil_img if not drop_vision else None)
        if drop_vision:
            v_quality["is_present"] = 0.0
            v_quality["sharpness"] = 0.0

        # 2. Process textual evidence
        clean_text = text if not drop_text else ""
        t_quality = extract_text_quality(clean_text)
        if drop_text:
            t_quality["is_present"] = 0.0

        # 3. Compute Embeddings
        with torch.no_grad():
            # Vision Embedding
            if pil_img is not None and not drop_vision:
                v_embed = self.vision_encoder.encode_image(pil_img, device=self.device)
            else:
                v_embed = torch.zeros((1, 128), device=self.device)

            # Text Embedding
            if clean_text and not drop_text:
                t_embed = self.text_encoder.encode_text(clean_text, device=self.device)
            else:
                t_embed = torch.zeros((1, 128), device=self.device)

            # Modality masks
            v_mask = torch.tensor([[0 if drop_vision or pil_img is None else 1]], device=self.device)
            t_mask = torch.tensor([[0 if drop_text or not clean_text else 1]], device=self.device)

            # Quality Tensors
            q_v_tensor = torch.tensor([v_quality["quality_vector"]], dtype=torch.float32, device=self.device)
            q_t_tensor = torch.tensor([t_quality["quality_vector"]], dtype=torch.float32, device=self.device)

            # 4. Gated Fusion (PRISM Proposed)
            fused_logits, gating_weights, cosine_sim = self.gated_fusion(
                v_embed=v_embed,
                t_embed=t_embed,
                q_v=q_v_tensor,
                q_t=q_t_tensor,
                v_mask=v_mask,
                t_mask=t_mask
            )

            # 5. Standard Baseline Fusion
            baseline_logits = self.standard_fusion(v_embed, t_embed)

        # 6. Calibrated Uncertainty & Abstention Decision
        prediction_result = self.calibrator.process_prediction(
            fused_logits=fused_logits,
            baseline_logits=baseline_logits,
            gating_weights=gating_weights,
            cosine_sim=cosine_sim,
            quality_signals={
                "image_sharpness": v_quality["sharpness"],
                "text_clarity": t_quality["clarity_score"]
            }
        )

        prediction_result["quality_metrics"] = {
            "image_sharpness": v_quality["sharpness"],
            "image_sharpness_normalized": v_quality["sharpness_normalized"],
            "image_brightness": v_quality["brightness"],
            "image_contrast": v_quality["contrast"],
            "image_noise_level": v_quality["noise_level"],
            "text_token_count": t_quality["token_count"],
            "text_length_score": t_quality["length_score"],
            "text_keyword_density": t_quality["keyword_density"],
            "text_clarity_score": t_quality["clarity_score"],
            "vision_present": not drop_vision and pil_img is not None,
            "text_present": not drop_text and bool(clean_text)
        }
        prediction_result["processed_image_base64"] = processed_b64

        return prediction_result


# Singleton instance
_engine: Optional[PrismInferenceEngine] = None


def get_inference_engine() -> PrismInferenceEngine:
    global _engine
    if _engine is None:
        _engine = PrismInferenceEngine()
    return _engine
