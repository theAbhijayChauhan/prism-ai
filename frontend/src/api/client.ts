import { PredictionResponse, IncidentItem, EvaluationReportData } from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function runInference(params: {
  text?: string;
  image_base64?: string;
  blur_sigma?: number;
  packet_loss?: number;
  drop_vision?: boolean;
  drop_text?: boolean;
}): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Inference failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIncidents(status?: string): Promise<IncidentItem[]> {
  const url = status && status !== "ALL" ? `${API_BASE}/incidents?status=${status}` : `${API_BASE}/incidents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function createIncident(data: {
  title: string;
  text: string;
  image_base64?: string;
  lat: number;
  lng: number;
  region: string;
}): Promise<IncidentItem> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create incident");
  return res.json();
}

export async function reviewIncident(
  id: string,
  status: "VERIFIED" | "REJECTED" | "DISPATCHED",
  notes: string = "",
  overrideSeverity?: number
) {
  const res = await fetch(`${API_BASE}/incidents/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      reviewer_notes: notes,
      override_severity: overrideSeverity,
    }),
  });
  if (!res.ok) throw new Error("Failed to update review");
  return res.json();
}

export async function fetchSampleCases(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/robustness/samples`);
  if (!res.ok) throw new Error("Failed to fetch samples");
  return res.json();
}

export async function runRobustnessSweep(params: {
  text?: string;
  image_base64?: string;
  sigmas?: number[];
}) {
  const res = await fetch(`${API_BASE}/robustness/sweep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Sweep failed");
  return res.json();
}

export async function fetchEvaluation(): Promise<EvaluationReportData> {
  const res = await fetch(`${API_BASE}/evaluation`);
  if (!res.ok) throw new Error("Failed to fetch evaluation");
  return res.json();
}
