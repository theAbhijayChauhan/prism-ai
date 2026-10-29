"""PRISM AI: Multimodal Fusion Modules
Includes both:
1. Standard Baseline Model (Simple Concatenation)
2. PRISM Quality-Aware Gated Fusion Network (Learned Gating + Missing Modality Mask)
"""

from typing import Tuple, Dict, Any, Optional
import torch
import torch.nn as nn
import torch.nn.functional as F


class StandardFusionModel(nn.Module):
    """Conventional Multimodal Fusion Baseline.

    Simply concatenates vision and text embeddings without quality awareness.
    Serves as the rigorous benchmark baseline.
    """

    def __init__(self, embed_dim: int = 128, num_classes: int = 4):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim * 2, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, num_classes)
        )

    def forward(self, v_embed: torch.Tensor, t_embed: torch.Tensor) -> torch.Tensor:
        """Forward pass concatenation."""
        combined = torch.cat([v_embed, t_embed], dim=-1)
        logits = self.mlp(combined)
        return logits


class PRISMGatedFusionModel(nn.Module):
    """PRISM Proposed Architecture: Quality-Aware Gated Multimodal Fusion Network.

    Dynamically modulates the influence of each modality based on real-time
    quality cues (blur, noise, text brevity) and supports missing modality masks.
    """

    def __init__(
        self,
        embed_dim: int = 128,
        v_quality_dim: int = 5,
        t_quality_dim: int = 4,
        num_classes: int = 4
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_classes = num_classes

        # Dynamic Quality Gating Network
        # Takes quality features [q_v (5) + q_t (4) + cosine_sim (1)] = 10 dim
        self.gating_net = nn.Sequential(
            nn.Linear(v_quality_dim + t_quality_dim + 1, 32),
            nn.ReLU(inplace=True),
            nn.Linear(32, 2)  # [gate_v_logit, gate_t_logit]
        )

        # Cross-Modal Projection & Alignment
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.t_proj = nn.Linear(embed_dim, embed_dim)

        # Fused Deep Reasoning MLP
        # Input: [weighted_v (128) + weighted_t (128) + q_v (5) + q_t (4)] = 265 dim
        in_features = embed_dim * 2 + v_quality_dim + t_quality_dim
        self.fusion_head = nn.Sequential(
            nn.Linear(in_features, 192),
            nn.LayerNorm(192),
            nn.ReLU(inplace=True),
            nn.Dropout(0.25),
            nn.Linear(192, 96),
            nn.ReLU(inplace=True),
            nn.Linear(96, num_classes)
        )

    def forward(
        self,
        v_embed: torch.Tensor,
        t_embed: torch.Tensor,
        q_v: torch.Tensor,
        q_t: torch.Tensor,
        v_mask: Optional[torch.Tensor] = None,
        t_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Forward pass.

        Returns:
            fused_logits: [B, num_classes]
            gating_weights: [B, 2] (alpha_v, alpha_t)
            cosine_sim: [B, 1]
        """
        # Ensure unit normalization
        v_norm = F.normalize(v_embed, p=2, dim=-1)
        t_norm = F.normalize(t_embed, p=2, dim=-1)

        # 1. Cross-modal semantic alignment (cosine similarity)
        cosine_sim = torch.sum(v_norm * t_norm, dim=-1, keepdim=True)  # [B, 1]

        # 2. Quality-Aware Gating Computation
        gate_inputs = torch.cat([q_v, q_t, cosine_sim], dim=-1)  # [B, 10]
        gate_logits = self.gating_net(gate_inputs)  # [B, 2]

        # Apply missing-modality masks if provided
        if v_mask is not None:
            gate_logits[:, 0] = gate_logits[:, 0].masked_fill(v_mask == 0, -1e9)
        if t_mask is not None:
            gate_logits[:, 1] = gate_logits[:, 1].masked_fill(t_mask == 0, -1e9)

        # Softmax over available modalities
        gating_weights = F.softmax(gate_logits, dim=-1)  # [B, 2]

        # Handle complete omission (both masked out) edge-case without inplace mutation
        if v_mask is not None and t_mask is not None:
            both_zero = (v_mask == 0) & (t_mask == 0)
            if both_zero.any():
                default_weights = torch.full_like(gating_weights, 0.5)
                gating_weights = torch.where(both_zero.expand_as(gating_weights), default_weights, gating_weights)

        alpha_v = gating_weights[:, 0:1]
        alpha_t = gating_weights[:, 1:2]

        # 3. Modulate embeddings by dynamic quality weights
        v_weighted = alpha_v * self.v_proj(v_norm)
        t_weighted = alpha_t * self.t_proj(t_norm)

        # 4. Deep Reasoning Head
        fused_repr = torch.cat([v_weighted, t_weighted, q_v, q_t], dim=-1)
        fused_logits = self.fusion_head(fused_repr)

        return fused_logits, gating_weights, cosine_sim
