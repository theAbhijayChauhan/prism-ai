export interface QualityWeights {
  alpha_vision: number;
  alpha_text: number;
}

export interface QualityMetrics {
  image_sharpness: number;
  image_sharpness_normalized: number;
  image_brightness: number;
  image_contrast: number;
  image_noise_level: number;
  text_token_count: number;
  text_length_score: number;
  text_keyword_density: number;
  text_clarity_score: number;
  vision_present: boolean;
  text_present: boolean;
}

export interface UncertaintyMetrics {
  entropy: number;
  normalized_entropy: number;
  margin: number;
  ci_95: [number, number];
}

export interface BaselineComparison {
  predicted_level: number;
  predicted_name: string;
  raw_confidence: number;
  status: string;
  flaw_description: string;
}

export interface PredictionResponse {
  predicted_severity: number;
  severity_name: string;
  recommended_action: string;
  calibrated_confidence: number;
  raw_softmax_confidence: number;
  class_probabilities: number[];
  uncertainty: UncertaintyMetrics;
  quality_weights: QualityWeights;
  quality_metrics: QualityMetrics;
  semantic_cosine: number;
  needs_human_review: boolean;
  review_reasons: string[];
  baseline_comparison?: BaselineComparison;
  processed_image_base64?: string;
}

export interface IncidentItem {
  id: string;
  title: string;
  text: string;
  image_type: string;
  severity_level: number;
  severity_name: string;
  calibrated_confidence: number;
  raw_softmax_confidence: number;
  status: "UNREVIEWED" | "VERIFIED" | "REJECTED" | "DISPATCHED";
  review_notes?: string;
  lat: number;
  lng: number;
  region: string;
  created_at: string;
  needs_review: boolean;
  entities: Record<string, any>;
}

export interface EvaluationReportData {
  dataset_name: string;
  test_samples_evaluated: number;
  num_classes: number;
  classes: string[];
  baselines: Record<string, any>;
  stress_curve: {
    sigmas: number[];
    standard_fusion_accuracy: number[];
    standard_fusion_confidence: number[];
    prism_accuracy: number[];
    prism_calibrated_confidence: number[];
    prism_abstention_rate: number[];
  };
  confusion_matrix: number[][];
  model_card: Record<string, any>;
}
