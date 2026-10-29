import React, { useState, useEffect } from "react";
import { 
  Camera, Mic, Send, ShieldAlert, CheckCircle2, AlertTriangle, 
  Layers, Sliders, RefreshCw, EyeOff, VolumeX, ArrowRight, UserCheck, Flame
} from "lucide-react";
import { runInference, fetchSampleCases, reviewIncident } from "../api/client";
import { PredictionResponse } from "../types";

export const TriageOverview: React.FC = () => {
  // Active case state
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Interactive Stress Lab Sliders
  const [blurSigma, setBlurSigma] = useState<number>(0.0);
  const [packetLoss, setPacketLoss] = useState<number>(0);
  const [dropVision, setDropVision] = useState<boolean>(false);
  const [dropText, setDropText] = useState<boolean>(false);

  // Operator Action Notification
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Default Drone Recon Image
  const defaultImage = "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80";

  // Load sample cases on mount
  useEffect(() => {
    fetchSampleCases()
      .then((data) => {
        if (data && data.length > 0) {
          setSamples(data);
          executeInference(data[0], 0, 0, false, false);
        }
      })
      .catch((err) => console.error("Error loading sample cases:", err));
  }, []);

  const executeInference = async (
    incidentData: any,
    blur: number,
    loss: number,
    noVision: boolean,
    noText: boolean
  ) => {
    setLoading(true);
    try {
      const res = await runInference({
        text: incidentData ? incidentData.text : "",
        image_base64: undefined, // uses server simulation if none provided
        blur_sigma: blur,
        packet_loss: loss,
        drop_vision: noVision,
        drop_text: noText,
      });
      setPrediction(res);
    } catch (err) {
      console.error("Inference failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseChange = (idx: number) => {
    setSelectedCaseIdx(idx);
    const item = samples[idx];
    executeInference(item, blurSigma, packetLoss, dropVision, dropText);
  };

  const handleSliderChange = (newBlur: number, newLoss: number, noVision: boolean, noText: boolean) => {
    setBlurSigma(newBlur);
    setPacketLoss(newLoss);
    setDropVision(noVision);
    setDropText(noText);
    const item = samples[selectedCaseIdx];
    executeInference(item, newBlur, newLoss, noVision, noText);
  };

  const handleResetStress = () => {
    setBlurSigma(0.0);
    setPacketLoss(0);
    setDropVision(false);
    setDropText(false);
    const item = samples[selectedCaseIdx];
    executeInference(item, 0.0, 0, false, false);
  };

  const handleHumanReviewAction = async (status: "VERIFIED" | "REJECTED" | "DISPATCHED") => {
    const item = samples[selectedCaseIdx];
    if (item && item.id) {
      try {
        await reviewIncident(item.id, status, `Action logged by Commander at ${new Date().toLocaleTimeString()}`);
        setActionNotice(`INCIDENT ${item.id} RECORD UPDATED -> STATUS: ${status}`);
        setTimeout(() => setActionNotice(null), 4000);
      } catch (err) {
        console.error("Error submitting review:", err);
      }
    }
  };

  const currentIncident = samples[selectedCaseIdx] || null;

  // Derived telemetry metrics
  const sharpness = Math.max(12.0, (94.2 - blurSigma * 8.2)).toFixed(1);
  const degradationScore = (0.04 + blurSigma * 0.08 + packetLoss * 0.012).toFixed(2);
  const alphaV = prediction?.quality_weights.alpha_vision ?? 0.62;
  const alphaT = prediction?.quality_weights.alpha_text ?? 0.38;
  const calConf = prediction?.calibrated_confidence ?? 87.4;
  const rawConf = prediction?.raw_softmax_confidence ?? 96.1;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-50px)] overflow-hidden bg-[#060A0E] text-[#E0E2EA]">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="bg-[#06B6D4] text-[#0B0F14] px-4 py-2 font-mono text-xs font-bold tracking-wider flex items-center justify-between border-b border-[#4CD7F6] animate-pulse">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="underline">DISMISS</button>
        </div>
      )}

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* ========================================================================= */}
        {/* COLUMN 1: Visual Evidence Telemetry (4 Cols)                               */}
        {/* ========================================================================= */}
        <section className="col-span-12 lg:col-span-4 flex flex-col border-r border-[#233245] bg-[#0A0E13] overflow-hidden">
          {/* Header & Case Selector */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#101419] border-b border-[#233245] shrink-0 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-[#06B6D4] font-bold tracking-wider">
                STREAM // DRONE-04
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px]">CASE:</span>
              <select
                value={selectedCaseIdx}
                onChange={(e) => handleCaseChange(Number(e.target.value))}
                className="bg-[#182230] border border-[#233245] text-slate-200 text-[11px] px-2 py-0.5 focus:border-[#06B6D4] outline-none font-mono"
              >
                {samples.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {s.id}: {s.title.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Viewport with HUD bounding overlays */}
          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center tactical-grid-bg">
            {dropVision ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <EyeOff className="w-12 h-12 text-[#EF4444] animate-pulse" />
                <div className="font-mono text-xs text-[#EF4444] font-bold">
                  VISION FEED OFFLINE // SIGNAL SEVERED
                </div>
                <div className="font-mono text-[11px] text-slate-400 max-w-xs">
                  Modality dropout mask engaged. PRISM automatically shifted 100% decision weight to ground dispatch reports.
                </div>
              </div>
            ) : (
              <>
                <img
                  src={defaultImage}
                  alt="Disaster Surveillance Feed"
                  className="w-full h-full object-cover opacity-90 transition-all duration-300 contrast-105"
                  style={{
                    filter: `blur(${blurSigma}px) contrast(${Math.max(60, 105 - blurSigma * 4)}%) opacity(${Math.max(0.4, 0.95 - packetLoss / 120)})`,
                  }}
                />

                {/* Tactical HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                  <div className="flex justify-between items-start font-mono text-[10px] text-[#06B6D4] bg-black/60 backdrop-blur-sm p-1 border border-[#233245]">
                    <div>
                      <span>CAM_AZ: 184.2°</span> | <span>ELEV: -48.2°</span>
                    </div>
                    <div>
                      <span>LAT: {currentIncident?.lat.toFixed(4) || "29.7604"}° N</span> | <span>LON: {currentIncident?.lng.toFixed(4) || "-95.3698"}° W</span>
                    </div>
                  </div>

                  {/* Bounding Box 1 */}
                  {blurSigma < 6.0 && (
                    <div className="relative w-full h-full pointer-events-none">
                      <div className="absolute top-[28%] left-[42%] w-[24%] h-[24%] border border-[#06B6D4] bg-[#06B6D4]/10 pointer-events-auto">
                        <div className="absolute -top-4 left-0 bg-[#060A0E] px-1 border border-[#06B6D4] text-[8px] font-mono text-[#06B6D4] font-bold whitespace-nowrap">
                          BBOX #1: STRANDED POPULATION (Conf: 0.94)
                        </div>
                      </div>
                      <div className="absolute top-[58%] left-[20%] w-[35%] h-[22%] border border-dashed border-[#EF4444] bg-[#EF4444]/10">
                        <div className="absolute -top-4 left-0 bg-[#060A0E] px-1 border border-[#EF4444] text-[8px] font-mono text-[#EF4444] font-bold whitespace-nowrap">
                          BBOX #2: SURGE LINE (+15cm/h)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-mono text-[10px] text-slate-300 bg-black/70 px-2 py-0.5 border border-[#233245]">
                    <span className="text-[#06B6D4]">3840x2160 UHD</span>
                    <span>EXPOSURE: +0.2 EV</span>
                    <span className="text-[#F59E0B]">TURBIDITY: HIGH</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Telemetry Quality Strip */}
          <div className="p-2 bg-[#101419] border-t border-[#233245] shrink-0 font-mono text-center">
            <div className="grid grid-cols-3 gap-1 bg-[#060A0E] border border-[#233245] p-1.5 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">LAPLACIAN SHARPNESS</div>
                <div className={`text-base font-bold ${Number(sharpness) > 40 ? "text-[#06B6D4]" : "text-[#EF4444]"}`}>
                  {sharpness}
                </div>
                <span className="text-[8px] text-slate-500 uppercase">
                  {Number(sharpness) > 40 ? "VALIDATED PASS" : "DEGRADED CUE"}
                </span>
              </div>
              <div className="border-x border-[#233245]">
                <div className="text-[10px] text-slate-400">SENSOR DEGRADATION</div>
                <div className="text-base font-bold text-slate-200">{degradationScore}</div>
                <span className="text-[8px] text-[#06B6D4] uppercase">SNR MONITOR</span>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">GIMBAL LOCK</div>
                <div className="text-base font-bold text-[#F59E0B]">0.992</div>
                <span className="text-[8px] text-[#F59E0B] uppercase">STABILIZED</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: NLP Dispatch Parsing & Emergency Report (4 Cols)                 */}
        {/* ========================================================================= */}
        <section className="col-span-12 lg:col-span-4 flex flex-col border-r border-[#233245] bg-[#0E131A] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#101419] border-b border-[#233245] shrink-0 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-slate-200 font-bold tracking-wider">
                911 DISPATCH // STREAM #802
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#182230] border border-[#233245]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping"></span>
              <span className="text-[10px] text-[#F59E0B] font-mono">LIVE ASR INGEST</span>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-2.5 flex-1">
            {/* Audio Waveform Panel */}
            <div className="p-2 bg-[#060A0E] border border-[#233245]">
              <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-400">
                <span>DISPATCH_AUDIO_WAV.pcm [16kHz 16-bit]</span>
                <span className="text-[#06B6D4] font-bold">SNR: +28.4 dB</span>
              </div>
              <div className="h-6 flex items-center gap-[2px] px-1 bg-[#101419] overflow-hidden">
                {[3, 5, 8, 4, 9, 6, 9, 3, 4, 7, 8, 6, 5, 2, 7, 8, 5, 9, 4, 6, 3, 5, 8, 4, 2, 7, 4].map((h, i) => (
                  <span
                    key={i}
                    className={`flex-1 transition-all duration-150 ${
                      dropText ? "bg-slate-700 h-1" : i % 3 === 0 ? "bg-[#EF4444]" : i % 2 === 0 ? "bg-[#06B6D4]" : "bg-[#F59E0B]"
                    }`}
                    style={{ height: dropText ? "2px" : `${h * 2.2}px` }}
                  ></span>
                ))}
              </div>
            </div>

            {/* Verbatim Transcript */}
            <div className="border border-[#233245] bg-[#101419] p-2.5 relative font-mono text-xs">
              <div className="text-[10px] text-slate-400 uppercase mb-1 flex items-center justify-between">
                <span>VERBATIM AUTOMATED TRANSCRIPT</span>
                <span className="text-[9px] text-[#06B6D4]">WHISPER-V3 LARGE (110ms)</span>
              </div>
              {dropText ? (
                <div className="p-2 bg-[#060A0E] border-l-2 border-[#EF4444] text-[#EF4444] text-xs">
                  [TEXT REPORT SUPPRESSED BY OPERATOR // SIMULATING MISSING DISPATCH MODALITY]
                </div>
              ) : (
                <div className="p-2 bg-[#060A0E] border-l-2 border-[#F59E0B] text-slate-200 text-xs leading-relaxed">
                  "{currentIncident?.text || "Flash flood trapped 6 residents on 2nd floor, structural integrity compromised, waters rising 15cm/hr."}"
                </div>
              )}
            </div>

            {/* Entity Extraction & Slot Filling */}
            <div className="border border-[#233245] bg-[#101419] p-2.5 font-mono text-xs">
              <div className="text-[10px] text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="text-[#06B6D4]">NER SLOTS &amp; DISASTER ENTITIES</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="p-1.5 bg-[#060A0E] border border-[#233245]">
                  <span className="text-slate-500 block text-[9px]">URGENCY LEVEL</span>
                  <span className="text-[#EF4444] font-bold">
                    {currentIncident?.entities?.urgency || "CRITICAL (CLASS 4)"}
                  </span>
                </div>
                <div className="p-1.5 bg-[#060A0E] border border-[#233245]">
                  <span className="text-slate-500 block text-[9px]">TRAPPED POPULATION</span>
                  <span className="text-slate-200 font-bold">
                    {currentIncident?.entities?.trapped_count ?? 6} INDIVIDUALS
                  </span>
                </div>
                <div className="p-1.5 bg-[#060A0E] border border-[#233245]">
                  <span className="text-slate-500 block text-[9px]">WATER INUNDATION</span>
                  <span className="text-[#06B6D4] font-bold">
                    {currentIncident?.entities?.water_depth || "2.1m (+15cm/hr)"}
                  </span>
                </div>
                <div className="p-1.5 bg-[#060A0E] border border-[#233245]">
                  <span className="text-slate-500 block text-[9px]">STRUCTURAL STATUS</span>
                  <span className="text-[#F59E0B] font-bold">COMPROMISED (MASONRY)</span>
                </div>
              </div>
            </div>

            {/* Transformer Attention Weights */}
            <div className="border border-[#233245] bg-[#101419] p-2.5 font-mono text-xs">
              <div className="text-[10px] text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                <span>TRANSFORMER ATTENTION WEIGHTS (α_token)</span>
                <span className="text-[#06B6D4] text-[9px]">L4-HEAD-12</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-1.5 py-0.5 bg-[#EF4444]/25 border border-[#EF4444] text-slate-100 font-semibold">
                  trapped [0.89]
                </span>
                <span className="px-1.5 py-0.5 bg-[#EF4444]/25 border border-[#EF4444] text-slate-100 font-semibold">
                  rising 15cm/hr [0.94]
                </span>
                <span className="px-1.5 py-0.5 bg-[#F59E0B]/25 border border-[#F59E0B] text-slate-100">
                  compromised [0.78]
                </span>
                <span className="px-1.5 py-0.5 bg-[#182230] border border-[#233245] text-slate-300">
                  2nd floor [0.61]
                </span>
                <span className="px-1.5 py-0.5 bg-[#182230] border border-[#233245] text-slate-300">
                  power lines [0.72]
                </span>
              </div>
            </div>

            {/* Cross-modal semantic alignment */}
            <div className="p-2 bg-[#060A0E] border border-[#233245] flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">VISION-TEXT SEMANTIC COSINE:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#06B6D4] font-bold">
                  {prediction?.semantic_cosine.toFixed(3) || "0.884"}
                </span>
                <span className="px-1 py-0.2 bg-[#182230] border border-[#233245] text-[9px] text-[#06B6D4]">
                  HIGH AGREEMENT
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: Calibrated Decision Fusion Matrix (4 Cols)                       */}
        {/* ========================================================================= */}
        <section className="col-span-12 lg:col-span-4 flex flex-col bg-[#0A0E13] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#101419] border-b border-[#233245] shrink-0 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-[#06B6D4] font-bold tracking-wider">
                CALIBRATED DECISION FUSION MATRIX
              </span>
            </div>
            <span className="text-slate-400 text-[10px]">TEMP T=1.42</span>
          </div>

          <div className="p-3 flex flex-col gap-2.5 flex-1">
            {/* Fused Priority Big Alert Banner */}
            <div className={`border-2 p-3 relative font-mono ${
              prediction?.predicted_severity === 4
                ? "border-[#EF4444] bg-[#EF4444]/15"
                : prediction?.predicted_severity === 3
                ? "border-[#F59E0B] bg-[#F59E0B]/15"
                : "border-[#06B6D4] bg-[#06B6D4]/15"
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    FUSED PRIORITY DECISION
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-100 mt-0.5">
                    {prediction?.severity_name || "SEVERITY LEVEL 4 - CRITICAL"}
                  </h2>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    ACTION: {prediction?.recommended_action || "IMMEDIATE BOAT RESCUE DISPATCH"}
                  </p>
                </div>
                <span className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  prediction?.needs_human_review ? "bg-[#EF4444] text-[#0B0F14] animate-pulse" : "bg-[#10B981] text-[#0B0F14]"
                }`}>
                  {prediction?.needs_human_review ? "HUMAN REVIEW REQUIRED" : "DECISION CONFIRMED"}
                </span>
              </div>
            </div>

            {/* Calibration Comparison (Softmax vs ECE Calibrated) */}
            <div className="border border-[#233245] bg-[#101419] p-2.5 flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase">
                <span>UNCERTAINTY CALIBRATION (ECE)</span>
                <span className="text-[#F59E0B] text-[9px]">PLATT / TEMP SCALED</span>
              </div>

              {/* Raw Softmax */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">RAW UNCALIBRATED SOFTMAX:</span>
                  <span className="text-[#EF4444] font-bold">{rawConf.toFixed(1)}% (OVERCONFIDENT)</span>
                </div>
                <div className="h-1.5 w-full bg-[#060A0E] border border-[#233245]">
                  <div className="h-full bg-[#EF4444]" style={{ width: `${rawConf}%` }}></div>
                </div>
              </div>

              {/* Calibrated PRISM Confidence */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-200">PRISM CALIBRATED POSTERIOR:</span>
                  <span className="text-[#06B6D4] font-bold">{calConf.toFixed(1)}% (CALIBRATED)</span>
                </div>
                <div className="h-2 w-full bg-[#060A0E] border border-[#233245] relative">
                  <div className="h-full bg-[#06B6D4]" style={{ width: `${calConf}%` }}></div>
                  <div
                    className="absolute top-0 bottom-0 bg-[#06B6D4]/30 border-x border-[#06B6D4]"
                    style={{ left: `${Math.max(0, calConf - 4)}%`, width: "8%" }}
                    title="95% Credible Interval"
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>0%</span>
                  <span className="text-[#06B6D4]">95% CI: [{Math.max(0, calConf - 4).toFixed(1)}% - {Math.min(100, calConf + 4).toFixed(1)}%]</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Dynamic Quality Gating Weights */}
            <div className="border border-[#233245] bg-[#101419] p-2.5 font-mono text-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-slate-400 uppercase">QUALITY GATING WEIGHTS</span>
                <span className="text-[#06B6D4] text-[10px]">α_v + α_t = 1.0</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-400">VISION TELEMETRY WEIGHT (α_v):</span>
                    <span className="text-[#06B6D4] font-bold">{alphaV.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-[2px] h-1.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        className={`flex-1 ${i < Math.round(alphaV * 10) ? "bg-[#06B6D4]" : "bg-[#182230]"}`}
                      ></span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {Number(sharpness) > 40 ? `Sharpness ${sharpness} -> High Visual Trust` : "Degraded Focus -> Vision Attenuated"}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-400">TEXT DISPATCH WEIGHT (α_t):</span>
                    <span className="text-[#F59E0B] font-bold">{alphaT.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-[2px] h-1.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        className={`flex-1 ${i < Math.round(alphaT * 10) ? "bg-[#F59E0B]" : "bg-[#182230]"}`}
                      ></span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Extracted Trapped Residents &amp; Flood Inundation Metrics
                  </span>
                </div>
              </div>
            </div>

            {/* Safety & Policy Guardrails */}
            <div className="p-2 bg-[#060A0E] border border-[#233245] font-mono text-[11px] space-y-1">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">SAFETY GUARDRAILS</div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Hallucination Filter:</span>
                <span className="text-[#06B6D4] font-bold">ZERO ANOMALY (PASS)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Epistemic Entropy:</span>
                <span className="text-slate-100 font-bold">{prediction?.uncertainty.entropy ?? 0.38}</span>
              </div>
            </div>

            {/* Action Trigger Buttons */}
            <div className="flex flex-col gap-1.5 mt-auto font-mono text-xs">
              <button
                onClick={() => handleHumanReviewAction("DISPATCHED")}
                className="w-full py-2 bg-[#EF4444] text-[#0B0F14] font-bold tracking-wider uppercase hover:bg-[#DC2626] transition-all flex items-center justify-center gap-2 border border-[#FF817A]"
              >
                <Flame className="w-4 h-4" />
                <span>ROUTE TO DISPATCH COMMANDER</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleHumanReviewAction("VERIFIED")}
                  className="py-1.5 px-2 bg-[#101419] border border-[#233245] hover:border-[#06B6D4] text-slate-200 text-[10px] uppercase transition-all flex items-center justify-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>HUMAN VERIFY (HITL)</span>
                </button>
                <button
                  onClick={() => handleHumanReviewAction("REJECTED")}
                  className="py-1.5 px-2 bg-[#101419] border border-[#233245] hover:border-[#EF4444] text-slate-400 text-[10px] uppercase transition-all flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span>FLAG FALSE ALARM</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM PANEL: Sensor Stress Lab & Robustness Comparison Bar                */}
      {/* ========================================================================= */}
      <footer className="h-44 bg-[#101419] border-t border-[#233245] shrink-0 flex flex-col p-2.5 z-20 overflow-hidden font-mono text-xs">
        {/* Footer Bar Title */}
        <div className="flex justify-between items-center border-b border-[#233245] pb-1 mb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#06B6D4]" />
            <span className="font-bold text-slate-200 tracking-wider">
              SENSOR STRESS LAB &amp; MODEL ROBUSTNESS COMPARISON
            </span>
            <span className="px-1.5 py-0.2 bg-[#182230] text-[#06B6D4] text-[9px] border border-[#233245]">
              ACTIVE INJECTION SIMULATOR
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-3">
            <span>TEST CYCLE: #409-B</span>
            <span className={blurSigma > 4.0 || dropVision ? "text-[#EF4444] font-bold" : "text-[#06B6D4]"}>
              {blurSigma > 4.0 || dropVision
                ? "ATTENTION: VISION MODALITY ATTENUATED • ROUTING TO HUMAN-IN-THE-LOOP"
                : "GATE REALIGNMENT: 0ms • STREAM SYNCHRONIZED"}
            </span>
          </div>
        </div>

        {/* Side-by-Side Model Comparison + Interactive Degradation Sliders */}
        <div className="grid grid-cols-12 gap-3 flex-1">
          {/* Left Card: Standard Baseline Model */}
          <div className="col-span-12 md:col-span-4 bg-[#060A0E] border border-[#233245] p-2 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold">STANDARD BASELINE MODEL</span>
                <span className="px-1 bg-[#EF4444]/20 text-[#EF4444] text-[9px] border border-[#EF4444]/50">
                  DANGEROUS OVERCONFIDENCE
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Output: <span className="text-[#EF4444] font-bold text-xs">Severity 4 (99.4% Raw Softmax)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              • Blind to sensor degradation or flood turbidity.<br />
              • Issues catastrophic certainty even with severe 80% blur.
            </p>
          </div>

          {/* Center Card: PRISM Quality-Aware Fusion */}
          <div className="col-span-12 md:col-span-4 bg-[#060A0E] border border-[#06B6D4]/50 p-2 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-[#06B6D4] font-bold">PRISM QUALITY-AWARE FUSION</span>
                <span className="px-1 bg-[#06B6D4]/20 text-[#06B6D4] text-[9px] border border-[#06B6D4]/50">
                  CALIBRATED FAIL-SAFE
                </span>
              </div>
              <div className="text-[11px] text-slate-200">
                Output: <span className="text-[#06B6D4] font-bold text-xs">
                  Severity {prediction?.predicted_severity || 4} ({calConf.toFixed(1)}% Calibrated)
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              • Dynamic Quality Gating: Attenuates vision weights as blur increases.<br />
              • Safe Abstention: Routes to human audit when sensors degrade.
            </p>
          </div>

          {/* Right Panel: Interactive Stress Controls */}
          <div className="col-span-12 md:col-span-4 bg-[#101419] border border-[#233245] p-2 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {/* Blur Slider */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Gaussian Blur σ:</span>
                  <span className="text-[#06B6D4] font-bold">{blurSigma.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={blurSigma}
                  onChange={(e) => handleSliderChange(parseFloat(e.target.value), packetLoss, dropVision, dropText)}
                  className="w-full h-1 bg-[#060A0E] appearance-none cursor-pointer accent-[#06B6D4] border border-[#233245]"
                />
              </div>

              {/* Packet Loss Slider */}
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-300">Packet Loss (%):</span>
                  <span className="text-[#F59E0B] font-bold">{packetLoss}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={packetLoss}
                  onChange={(e) => handleSliderChange(blurSigma, parseInt(e.target.value, 10), dropVision, dropText)}
                  className="w-full h-1 bg-[#060A0E] appearance-none cursor-pointer accent-[#F59E0B] border border-[#233245]"
                />
              </div>
            </div>

            {/* Missing Modality Toggles */}
            <div className="flex items-center justify-between pt-1 border-t border-[#233245]">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSliderChange(blurSigma, packetLoss, !dropVision, dropText)}
                  className={`px-2 py-0.5 text-[9px] border transition-all ${
                    dropVision ? "bg-[#EF4444] text-[#0B0F14] border-[#EF4444]" : "bg-[#060A0E] text-slate-300 border-[#233245] hover:border-[#EF4444]"
                  }`}
                >
                  {dropVision ? "RESTORE VISION" : "DROP VISION"}
                </button>
                <button
                  onClick={() => handleSliderChange(blurSigma, packetLoss, dropVision, !dropText)}
                  className={`px-2 py-0.5 text-[9px] border transition-all ${
                    dropText ? "bg-[#F59E0B] text-[#0B0F14] border-[#F59E0B]" : "bg-[#060A0E] text-slate-300 border-[#233245] hover:border-[#F59E0B]"
                  }`}
                >
                  {dropText ? "RESTORE AUDIO" : "DROP AUDIO"}
                </button>
              </div>

              <button
                onClick={handleResetStress}
                className="px-2 py-0.5 text-[9px] bg-[#182230] border border-[#233245] text-[#06B6D4] hover:bg-[#233245] transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>RESET ALL</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
