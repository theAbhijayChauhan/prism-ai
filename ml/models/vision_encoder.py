"""PRISM AI: Vision Encoder Module
Extracts visual disaster cues (flood inundation, damage, debris) into a normalized embedding.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np


class VisionEncoder(nn.Module):
    """Deep Convolutional Vision Encoder for disaster and flood visual assessment."""

    def __init__(self, embed_dim: int = 128, num_classes: int = 4):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_classes = num_classes

        # Efficient multi-scale convolutional backbone
        self.conv1 = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2)
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2)
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((2, 2))
        )

        # Feature projection head
        self.fc_embed = nn.Sequential(
            nn.Linear(128 * 2 * 2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, embed_dim)
        )

        # Vision-only classification head (for baseline comparison)
        self.classifier = nn.Linear(embed_dim, num_classes)

        # Standard preprocessing transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def forward(self, x: torch.Tensor):
        """Forward pass.

        Returns (embedding, logits).
        """
        out = self.conv1(x)
        out = self.conv2(out)
        out = self.conv3(out)
        out = out.view(out.size(0), -1)
        embed = self.fc_embed(out)
        norm_embed = F.normalize(embed, p=2, dim=-1)
        logits = self.classifier(norm_embed)
        return norm_embed, logits

    def encode_image(self, pil_image: Image.Image, device: torch.device = None) -> torch.Tensor:
        """Helper to transform and encode a single PIL Image."""
        if device is None:
            device = next(self.parameters()).device
        rgb_img = pil_image.convert("RGB")
        tensor = self.transform(rgb_img).unsqueeze(0).to(device)
        self.eval()
        with torch.no_grad():
            embed, _ = self.forward(tensor)
        return embed
