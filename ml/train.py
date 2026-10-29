"""PRISM AI: Model Training & Calibration Script
Trains the Vision Encoder, Text Encoder, and Quality-Aware Gated Fusion Network
on partitioned disaster data with modality dropout and quality-gating objectives.
"""

import os
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
import numpy as np

from ml.data.dataset import generate_benchmark_dataset, SEVERITY_CLASSES
from ml.data.quality_metrics import extract_image_quality, extract_text_quality
from ml.models.vision_encoder import VisionEncoder
from ml.models.text_encoder import TextEncoder
from ml.models.gated_fusion import PRISMGatedFusionModel, StandardFusionModel


def train_models(epochs: int = 15, lr: float = 1e-3, save_dir: str = "ml/checkpoints"):
    os.makedirs(save_dir, exist_ok=True)
    device = torch.device("cpu")
    print(f"[PRISM Train] Generating benchmark training splits...")
    dataset = generate_benchmark_dataset(num_samples=200, seed=42)
    train_data = [d for d in dataset if d["split"] == "train"]
    val_data = [d for d in dataset if d["split"] in ("val", "test")]

    print(f"[PRISM Train] Train samples: {len(train_data)}, Val samples: {len(val_data)}")

    vision_enc = VisionEncoder(embed_dim=128, num_classes=4).to(device)
    text_enc = TextEncoder(embed_dim=128, num_classes=4).to(device)
    gated_fusion = PRISMGatedFusionModel(embed_dim=128, num_classes=4).to(device)
    standard_fusion = StandardFusionModel(embed_dim=128, num_classes=4).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam([
        {"params": vision_enc.parameters(), "lr": lr},
        {"params": text_enc.parameters(), "lr": lr * 1.5},
        {"params": gated_fusion.parameters(), "lr": lr * 2.0},
        {"params": standard_fusion.parameters(), "lr": lr}
    ], weight_decay=1e-4)

    # Cache sample tensors
    def get_sample_tensors(item, is_train=True):
        sev = item["ground_truth_severity"]
        target = torch.tensor([sev], dtype=torch.long, device=device)

        # Generate realistic color tone based on severity (deeper brown/blue/red for higher flood severity)
        color_r = int(30 + sev * 35)
        color_g = int(60 + sev * 15)
        color_b = int(120 - sev * 20)
        img = Image.new("RGB", (224, 224), color=(color_r, color_g, color_b))

        # Modality dropout during training (p=0.2)
        drop_v = is_train and np.random.rand() < 0.15
        drop_t = is_train and np.random.rand() < 0.15

        v_mask = torch.tensor([[0 if drop_v else 1]], device=device)
        t_mask = torch.tensor([[0 if drop_t else 1]], device=device)

        v_quality = extract_image_quality(None if drop_v else img)
        t_quality = extract_text_quality("" if drop_t else item["text"])

        q_v = torch.tensor([v_quality["quality_vector"]], dtype=torch.float32, device=device)
        q_t = torch.tensor([t_quality["quality_vector"]], dtype=torch.float32, device=device)

        return img, item["text"], q_v, q_t, v_mask, t_mask, target, drop_v, drop_t

    print("[PRISM Train] Commencing training across epochs...")
    for epoch in range(1, epochs + 1):
        vision_enc.train()
        text_enc.train()
        gated_fusion.train()
        standard_fusion.train()

        total_loss = 0.0
        correct_gated = 0
        correct_std = 0
        total = 0

        for item in train_data:
            img, text, q_v, q_t, v_mask, t_mask, target, drop_v, drop_t = get_sample_tensors(item, is_train=True)
            optimizer.zero_grad()

            if not drop_v:
                v_tensor = vision_enc.transform(img).unsqueeze(0).to(device)
                v_emb, v_logits = vision_enc(v_tensor)
            else:
                v_emb = torch.zeros((1, 128), device=device)
                v_logits = torch.zeros((1, 4), device=device)

            if not drop_t:
                ids = text_enc.tokenize(text).to(device)
                t_emb, t_logits, _ = text_enc(ids)
            else:
                t_emb = torch.zeros((1, 128), device=device)
                t_logits = torch.zeros((1, 4), device=device)

            fused_logits, _, _ = gated_fusion(v_emb, t_emb, q_v, q_t, v_mask, t_mask)
            std_logits = standard_fusion(v_emb, t_emb)

            loss_fused = criterion(fused_logits, target)
            loss_std = criterion(std_logits, target)
            loss_v = criterion(v_logits, target) if not drop_v else 0.0
            loss_t = criterion(t_logits, target) if not drop_t else 0.0

            loss = loss_fused + loss_std + 0.3 * loss_v + 0.5 * loss_t
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            if torch.argmax(fused_logits, dim=-1) == target:
                correct_gated += 1
            if torch.argmax(std_logits, dim=-1) == target:
                correct_std += 1
            total += 1

        train_acc = (correct_gated / total) * 100.0
        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} - Loss: {total_loss/total:.4f} | PRISM Acc: {train_acc:.1f}%")

    checkpoint_path = os.path.join(save_dir, "prism_model.pt")
    torch.save({
        "vision_encoder": vision_enc.state_dict(),
        "text_encoder": text_enc.state_dict(),
        "gated_fusion": gated_fusion.state_dict(),
        "standard_fusion": standard_fusion.state_dict()
    }, checkpoint_path)
    print(f"[PRISM Train] Checkpoint saved successfully -> {checkpoint_path}")


if __name__ == "__main__":
    train_models(epochs=15)
