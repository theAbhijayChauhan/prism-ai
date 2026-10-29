"""PRISM AI: Modality Quality Feature Extraction
Extracts visual and linguistic quality signals to govern fusion gating.
"""

from typing import Dict, Any, Tuple
import numpy as np
from PIL import Image
import cv2


def extract_image_quality(image: Image.Image) -> Dict[str, Any]:
    """Calculates image quality indicators including sharpness, brightness,

    contrast, and estimated noise level.
    """
    if image is None:
        return {
            "sharpness": 0.0,
            "sharpness_normalized": 0.0,
            "brightness": 0.0,
            "contrast": 0.0,
            "noise_level": 1.0,
            "is_present": 0.0,
            "quality_vector": [0.0, 0.0, 0.0, 1.0, 0.0]
        }

    # Convert to grayscale numpy array
    rgb_arr = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2GRAY)

    # 1. Laplacian variance for sharpness
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = float(laplacian.var())
    # Typical sharp image variance > 100, blurry < 25
    sharpness_norm = float(np.clip(variance / 200.0, 0.0, 1.0))
    sharpness_score = round(min(100.0, variance * 0.5), 1)

    # 2. Mean brightness (0-255 -> 0-1)
    mean_val = float(np.mean(gray))
    brightness_norm = float(np.clip(mean_val / 255.0, 0.0, 1.0))

    # 3. Contrast (std dev)
    std_val = float(np.std(gray))
    contrast_norm = float(np.clip(std_val / 80.0, 0.0, 1.0))

    # 4. Noise estimation using high-frequency residual
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    noise_residual = np.abs(gray.astype(np.float32) - blurred.astype(np.float32))
    noise_level = float(np.clip(np.mean(noise_residual) / 25.0, 0.0, 1.0))

    return {
        "sharpness": sharpness_score,
        "sharpness_normalized": sharpness_norm,
        "brightness": round(brightness_norm * 100.0, 1),
        "contrast": round(contrast_norm * 100.0, 1),
        "noise_level": round(noise_level, 3),
        "is_present": 1.0,
        "quality_vector": [sharpness_norm, brightness_norm, contrast_norm, noise_level, 1.0]
    }


def extract_text_quality(text: str) -> Dict[str, Any]:
    """Calculates text quality indicators including length adequacy,

    emergency keyword density, and ambiguity signals.
    """
    if not text or not text.strip():
        return {
            "token_count": 0,
            "length_score": 0.0,
            "keyword_density": 0.0,
            "clarity_score": 0.0,
            "is_present": 0.0,
            "quality_vector": [0.0, 0.0, 0.0, 0.0]
        }

    clean_text = text.strip()
    words = clean_text.split()
    word_count = len(words)

    # Normalized length score (saturates around 40-50 words)
    length_score = float(np.clip(word_count / 35.0, 0.0, 1.0))

    # Domain keywords for disaster triage
    disaster_keywords = {
        "flood", "water", "rising", "trapped", "rescue", "emergency", "collapse",
        "submerged", "evacuation", "hazard", "injured", "roof", "power", "grid",
        "dam", "urgent", "danger", "casualty", "level", "meter", "current", "storm"
    }

    lower_words = [w.lower().strip(".,!?:;\"'()") for w in words]
    found_keywords = sum(1 for w in lower_words if w in disaster_keywords)
    keyword_density = float(np.clip(found_keywords / max(1, min(word_count, 15)), 0.0, 1.0))

    # Clarity/ambiguity score
    # Punish very short text or all caps / excessive punctuation
    clarity = 1.0
    if word_count < 4:
        clarity *= 0.4
    if clean_text.isupper() and word_count > 6:
        clarity *= 0.85

    clarity_score = float(np.clip(clarity * (0.6 * keyword_density + 0.4 * length_score), 0.05, 1.0))

    return {
        "token_count": word_count,
        "length_score": round(length_score, 2),
        "keyword_density": round(keyword_density, 2),
        "clarity_score": round(clarity_score, 2),
        "is_present": 1.0,
        "quality_vector": [length_score, keyword_density, clarity_score, 1.0]
    }
