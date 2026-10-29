import React, { useState } from "react";
import { Upload, Camera, FileText, MapPin, CheckCircle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { createIncident, runInference } from "../api/client";
import { PredictionResponse } from "../types";

export const EvidenceUpload: React.FC = () => {
  const [title, setTitle] = useState<string>("East Houston Levee Inundation");
  const [text, setText] = useState<string>(
    "Levee breached along Sector 4. Water pouring through residential subdivisions, 8 homes surrounded, water level 1.9m and rising."
  );
  const [region, setRegion] = useState<string>("Harris County Sector 4");
  const [lat, setLat] = useState<number>(29.7750);
  const [lng, setLng] = useState<number>(-95.3210);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageBase64(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run preview analysis
  const handleAnalyze = async () => {
    if (!text.trim() && !imageBase64) return;
    setAnalyzing(true);
    try {
      const res = await runInference({
        text,
        image_base64: imageBase64 || undefined,
      });
      setPrediction(res);
    } catch (err) {
      console.error("Preview analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit into official Incident Queue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    try {
      const created = await createIncident({
        title,
        text,
        image_base64: imageBase64 || undefined,
        lat,
        lng,
        region,
      });
      setSubmissionSuccess(`INCIDENT LOGGED: ${created.id} (Level ${created.severity_level})`);
      setTimeout(() => setSubmissionSuccess(null), 5000);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-50px)] overflow-y-auto bg-[#060A0E] text-[#E0E2EA] p-6 font-mono text-xs">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Title Bar */}
        <div className="flex justify-between items-center border-b border-[#233245] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[#06B6D4]">
              <Upload className="w-5 h-5" />
              <h1 className="text-base font-bold tracking-wider uppercase">
                DISASTER EVIDENCE INTAKE &amp; MULTIMODAL INGESTION
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Submit aerial drone footage, satellite passes, and emergency 911 transcripts for automated quality validation and calibrated triage.
            </p>
          </div>
          <span className="px-2 py-1 bg-[#101419] border border-[#233245] text-slate-400 text-[10px]">
            API SPEC: v1.0.0 RFC
          </span>
        </div>

        {submissionSuccess && (
          <div className="bg-[#10B981]/20 border border-[#10B981] p-3 text-[#10B981] font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{submissionSuccess} - Routed into Geospatial Triage Map</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
          {/* Left Form: Evidence Fields (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            {/* Title & Region */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">INCIDENT TITLE:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#101419] border border-[#233245] focus:border-[#06B6D4] px-3 py-1.5 text-slate-200 outline-none text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">GEOGRAPHIC REGION / BASIN:</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#101419] border border-[#233245] focus:border-[#06B6D4] px-3 py-1.5 text-slate-200 outline-none text-xs"
                  required
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">LATITUDE (°N):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full bg-[#101419] border border-[#233245] focus:border-[#06B6D4] px-3 py-1.5 text-slate-200 outline-none text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">LONGITUDE (°W):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  className="w-full bg-[#101419] border border-[#233245] focus:border-[#06B6D4] px-3 py-1.5 text-slate-200 outline-none text-xs"
                  required
                />
              </div>
            </div>

            {/* Emergency Text Dispatch */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-400">911 AUDIO / DISPATCH LOG REPORT:</label>
                <span className="text-[9px] text-[#06B6D4]">KEYWORD DETECTION ACTIVE</span>
              </div>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-[#101419] border border-[#233245] focus:border-[#06B6D4] p-3 text-slate-200 outline-none text-xs leading-relaxed"
                placeholder="Enter emergency call transcript, responder notes, or citizen reports..."
                required
              />
            </div>

            {/* Visual Evidence Upload Dropzone */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                AERIAL / SURVEILLANCE IMAGE (OPTIONAL):
              </label>
              <div className="border border-dashed border-[#233245] hover:border-[#06B6D4] bg-[#101419] p-4 text-center cursor-pointer transition-all relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="w-8 h-8 text-[#06B6D4] mx-auto mb-2 opacity-80" />
                <span className="text-slate-300 font-bold block">
                  {imagePreview ? "CLICK TO REPLACE IMAGE" : "DRAG & DROP IMAGE OR CLICK TO BROWSE"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Supports JPEG, PNG, TIFF from UAVs, CCTV, or Sentinel-2
                </span>
              </div>
            </div>

            {/* Submit & Analyze Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 py-2 bg-[#182230] border border-[#233245] hover:border-[#06B6D4] text-[#06B6D4] font-bold uppercase transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>RUN PREVIEW ASSESSMENT</span>
              </button>
              <button
                type="submit"
                disabled={analyzing}
                className="flex-1 py-2 bg-[#06B6D4] text-[#0B0F14] font-bold uppercase hover:bg-[#4CD7F6] transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>INTAKE INTO TRIAGE QUEUE</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Live Assessment Preview (5 cols) */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="border border-[#233245] bg-[#101419] p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[#233245] pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  PREVIEW TELEMETRY &amp; GATING
                </span>
                <span className="text-[#06B6D4] text-[9px]">REAL-TIME INFERENCE</span>
              </div>

              {/* Uploaded Image Preview */}
              {imagePreview ? (
                <div className="relative h-44 bg-black overflow-hidden border border-[#233245]">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 border border-[#233245] text-[9px] text-[#06B6D4]">
                    IMAGE LOADED
                  </div>
                </div>
              ) : (
                <div className="h-28 bg-[#060A0E] border border-[#233245] flex items-center justify-center text-slate-500 text-[11px]">
                  No image attached. System will operate in Text-Only mode with zero vision gating weight.
                </div>
              )}

              {/* Prediction Preview Box */}
              {prediction ? (
                <div className="space-y-3 pt-2">
                  <div className="p-2.5 bg-[#060A0E] border border-[#233245]">
                    <span className="text-[9px] text-slate-500 uppercase block">ESTIMATED PRIORITY</span>
                    <span className={`text-sm font-bold block ${
                      prediction.predicted_severity === 4
                        ? "text-[#EF4444]"
                        : prediction.predicted_severity === 3
                        ? "text-[#F59E0B]"
                        : "text-[#06B6D4]"
                    }`}>
                      {prediction.severity_name}
                    </span>
                    <span className="text-[10px] text-slate-300 block mt-0.5">
                      Recommended: {prediction.recommended_action}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-[#060A0E] border border-[#233245]">
                      <span className="text-slate-500 block">CALIBRATED CONF:</span>
                      <span className="text-[#06B6D4] font-bold text-xs">{prediction.calibrated_confidence}%</span>
                    </div>
                    <div className="p-2 bg-[#060A0E] border border-[#233245]">
                      <span className="text-slate-500 block">RAW SOFTMAX:</span>
                      <span className="text-[#EF4444] font-bold text-xs">{prediction.raw_softmax_confidence}%</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#060A0E] border border-[#233245] text-[10px]">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">GATING WEIGHTS:</span>
                      <span className="text-slate-200">
                        α_v: {prediction.quality_weights.alpha_vision} | α_t: {prediction.quality_weights.alpha_text}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#101419] flex">
                      <div className="bg-[#06B6D4]" style={{ width: `${prediction.quality_weights.alpha_vision * 100}%` }}></div>
                      <div className="bg-[#F59E0B]" style={{ width: `${prediction.quality_weights.alpha_text * 100}%` }}></div>
                    </div>
                  </div>

                  <div className={`p-2 border text-[10px] ${
                    prediction.needs_human_review
                      ? "bg-[#EF4444]/15 border-[#EF4444] text-[#FF817A]"
                      : "bg-[#10B981]/15 border-[#10B981] text-[#34D399]"
                  }`}>
                    {prediction.needs_human_review
                      ? "⚠️ FLAG FOR HUMAN AUDIT: Uncertainty triggers review queue routing."
                      : "✓ HIGH FIDELITY: Incident passes automatic confidence gating."}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-[11px]">
                  Click "RUN PREVIEW ASSESSMENT" to preview model extraction before official submission.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
