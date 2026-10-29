"""PRISM AI: Text Encoder Module
Embeds distress reports, 911 dispatch calls, and emergency messages into dense semantic vectors.
"""

import re
from typing import List, Dict
import torch
import torch.nn as nn
import torch.nn.functional as F


# Vocabulary for disaster text encoder
DISASTER_VOCAB = [
    "<PAD>", "<UNK>", "flood", "flash", "water", "waters", "rising", "trapped",
    "residents", "floor", "structural", "integrity", "compromised", "power", "lines",
    "down", "transformer", "critical", "severe", "moderate", "advisory", "canal",
    "overflow", "chemical", "containment", "breached", "evacuate", "roadway", "cm",
    "meter", "meters", "vehicles", "submerged", "underpass", "floating", "passengers",
    "police", "drainage", "ditch", "runoff", "capacity", "steady", "structures",
    "hospital", "ambulance", "generator", "care", "elderly", "oxygen", "park",
    "retention", "pond", "basin", "danger", "hazard", "rescue", "emergency", "boat",
    "boats", "inundation", "threat", "storm", "rain", "rainwater", "receding", "stable",
    "high", "depth", "current", "urgent", "immediate", "dispatch", "need", "help"
]

VOCAB_MAP = {word: idx for idx, word in enumerate(DISASTER_VOCAB)}


class TextEncoder(nn.Module):
    """Deep Text Encoder with vocabulary tokenization and attention pooling."""

    def __init__(self, vocab_size: int = 1500, embed_dim: int = 128, num_classes: int = 4):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_classes = num_classes

        self.word_embeddings = nn.Embedding(len(DISASTER_VOCAB) + 500, 64, padding_idx=0)
        self.gru = nn.GRU(64, 64, batch_first=True, bidirectional=True)
        
        # Self-attention pooling
        self.attn_proj = nn.Linear(128, 1)

        # Projection head
        self.fc_embed = nn.Sequential(
            nn.Linear(128, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, embed_dim)
        )

        # Text-only classification head (for baseline comparison)
        self.classifier = nn.Linear(embed_dim, num_classes)

    def tokenize(self, text: str, max_len: int = 32) -> torch.Tensor:
        """Simple, deterministic tokenization for emergency reports."""
        if not text:
            return torch.zeros((1, max_len), dtype=torch.long)
        
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = cleaned.split()[:max_len]
        
        indices = []
        for t in tokens:
            if t in VOCAB_MAP:
                indices.append(VOCAB_MAP[t])
            else:
                # Hash fallback into extra vocabulary range
                indices.append(len(DISASTER_VOCAB) + (abs(hash(t)) % 490))
        
        while len(indices) < max_len:
            indices.append(0)  # PAD
            
        return torch.tensor([indices], dtype=torch.long)

    def forward(self, input_ids: torch.Tensor):
        """Forward pass.

        Returns (embedding, logits, attention_weights).
        """
        # input_ids: [B, seq_len]
        emb = self.word_embeddings(input_ids)  # [B, seq_len, 64]
        out, _ = self.gru(emb)  # [B, seq_len, 128]

        # Attention pooling
        attn_scores = self.attn_proj(out)  # [B, seq_len, 1]
        mask = (input_ids == 0).unsqueeze(-1)
        attn_scores = attn_scores.masked_fill(mask, -1e9)
        attn_weights = F.softmax(attn_scores, dim=1)  # [B, seq_len, 1]
        
        context = torch.sum(out * attn_weights, dim=1)  # [B, 128]
        proj_embed = self.fc_embed(context)
        norm_embed = F.normalize(proj_embed, p=2, dim=-1)
        logits = self.classifier(norm_embed)

        return norm_embed, logits, attn_weights.squeeze(-1)

    def encode_text(self, text: str, device: torch.device = None) -> torch.Tensor:
        """Helper to tokenize and encode a text string."""
        if device is None:
            device = next(self.parameters()).device
        ids = self.tokenize(text).to(device)
        self.eval()
        with torch.no_grad():
            norm_embed, _, _ = self.forward(ids)
        return norm_embed
