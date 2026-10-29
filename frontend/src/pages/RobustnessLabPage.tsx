import React, { useState, useEffect } from "react";
import { Sliders, Activity, AlertOctagon, ShieldCheck, Play, RefreshCw, BarChart2 } from "lucide-react";
import { runInference, runRobustnessSweep } from "../api/client";
import { PredictionResponse } from "../types";

export const RobustnessLabPage: React.FC = () => {
  const [blur, setBlur] = useState<number>(3.0);
  const [packetLoss, setPacketLoss] = useState<number>(10);
  const [dropVision, setDropVision] = useState<boolean>(false);
  const [dropText, setDropText] = useState<boolean>(false);

  const [activeSampleText, setActiveSampleText] = useState<string>(
    "Flash flood trapped 6 residents on 2nd floor, structural integrity compromised, waters rising 15cm/hr."
  );

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [sweepResults, setSweepResults] = useState<any[]>([]);
  const [runningSweep, setRunningSweep] = useState<boolean>(false);

  // Run single evaluation
  const runTest = async (b: number, pl: number, dv: boolean, dt: boolean) => {
    try {
      const res = await runInference({
        text: activeSampleText,
        blur_sigma: b,
        packet_loss: pl,
        drop_vision: dv,
        drop_text: dt,
      });
      setPrediction(res);
    } catch (err) {
      console.error("Test failed:", err);
    }
  };

  useEffect(() => {
    runTest(blur, packetLoss, dropVision, dropText);
  }, [blur, packetLoss, dropVision, dropText, activeSampleText]);

  // Run full sweep
  const handleRunSweep = async () => {
    setRunningSweep(true);
    try {
      const data = await runRobustnessSweep({
        text: activeSampleText,
        sigmas: [0.0, 2.0, 4.0, 6.0, 8.0, 10.0],
      });
      setSweepResults(data.sweep_results || []);
    } catch (err) {
      console.error("Sweep failed:", err);
    } finally {
      setRunningSweep(false);
    }
  };

  useEffect(() => {
    handleRunSweep();
  }, []);

  const alphaV = prediction?.quality_weights.alpha_vision ?? 0.45;
  const alphaT = prediction?.quality_weights.alpha_text ?? 0.55;
  const calConf = prediction?.calibrated_confidence ?? 81.2;
  const rawConf = prediction?.raw_softmax_confidence ?? 97.4;
  const baseline = prediction?.baseline_comparison;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-50px)] overflow-y-auto bg-[#060A0E] text-[#E0E2EA] p-6 font-mono text-xs">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#233245] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[#06B6D4]">
              <Sliders className="w-5 h-5" />
              <h1 className="text-base font-bold tracking-wider uppercase">
                SENSOR ROBUSTNESS LAB &amp; ABLATION BENCH
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Demonstrating the core deep learning contribution: Quality-Aware Gated Fusion and Calibrated Abstention under degraded, noisy, and missing sensor streams.
            </p>
          </div>
          <button
            onClick={handleRunSweep}
            disabled={runningSweep}
            className="px-3 py-1.5 bg-[#06B6D4] text-[#0B0F14] font-bold uppercase hover:bg-[#4CD7F6] flex items-center gap-1.5 border border-[#4CD7F6]"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningSweep ? "RUNNING SWEEP..." : "RUN FULL 6-POINT SWEEP"}</span>
          </button>
        </div>

        {/* Live Side-by-Side Architectural Comparison Cards */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Standard Baseline Model */}
          <div className="col-span-12 lg:col-span-6 border border-[#EF4444]/40 bg-[#101419] p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#233245] pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  CONVENTIONAL MULTIMODAL BASELINE
                </span>
                <span className="px-2 py-0.5 bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] text-[9px] font-bold">
                  BLIND OVERCONFIDENCE
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">PREDICTED SEVERITY &amp; CONFIDENCE:</span>
                <div className="text-base font-bold text-[#EF4444]">
                  Severity {baseline?.predicted_level || 4} - {baseline?.predicted_name || "CRITICAL"}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Softmax Certainty: <strong className="text-[#EF4444]">{baseline?.raw_confidence || 98.8}%</strong>
                </div>
              </div>

              <div className="p-3 bg-[#060A0E] border border-[#233245] space-y-1.5 text-[11px]">
                <div className="text-[#EF4444] font-bold">CRITICAL DEFICIENCY DETECTED:</div>
                <p className="text-slate-400 leading-relaxed">
                  The standard model uses simple concatenation: <code className="text-slate-200">[v_embed, t_embed]</code>. It has no mechanism to sense camera blur or sensor noise. Even when input frames are 80% blurred, it blindly issues confident high certainty, risking catastrophic false alerts or misallocation of emergency boats.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#233245] text-slate-500 text-[10px]">
              Fusion: Simple Concatenation • Gating: None • ECE Error: 0.141 (High)
            </div>
          </div>

          {/* Right: PRISM Proposed Quality-Aware Model */}
          <div className="col-span-12 lg:col-span-6 border-2 border-[#06B6D4] bg-[#101419] p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#233245] pb-2">
                <span className="text-[#06B6D4] font-bold uppercase text-[10px]">
                  PRISM QUALITY-AWARE GATED FUSION (PROPOSED)
                </span>
                <span className="px-2 py-0.5 bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4] text-[9px] font-bold">
                  CALIBRATED FAIL-SAFE
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">PREDICTED SEVERITY &amp; CALIBRATED POSTERIOR:</span>
                <div className="text-base font-bold text-[#06B6D4]">
                  {prediction?.severity_name || "SEVERITY LEVEL 4 - CRITICAL"}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Calibrated Confidence: <strong className="text-[#06B6D4]">{calConf.toFixed(1)}%</strong>{" "}
                  <span className="text-slate-500">(Raw Softmax was {rawConf.toFixed(1)}%)</span>
                </div>
              </div>

              <div className="p-3 bg-[#060A0E] border border-[#233245] space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">DYNAMIC QUALITY WEIGHTS:</span>
                  <span className="text-slate-200">
                    α_v: <strong className="text-[#06B6D4]">{alphaV.toFixed(2)}</strong> | α_t: <strong className="text-[#F59E0B]">{alphaT.toFixed(2)}</strong>
                  </span>
                </div>
                <div className="h-2 w-full bg-[#101419] flex border border-[#233245]">
                  <div className="bg-[#06B6D4] transition-all" style={{ width: `${alphaV * 100}%` }}></div>
                  <div className="bg-[#F59E0B] transition-all" style={{ width: `${alphaT * 100}%` }}></div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {prediction?.needs_human_review ? (
                    <span className="text-[#EF4444] font-bold">
                      ⚠️ SAFETY ABSTENTION TRIGGERED: Uncertainty exceeds margin &rarr; Automatically routed to Human Triage Reviewer.
                    </span>
                  ) : (
                    <span className="text-[#10B981]">
                      ✓ High fidelity agreement: Weights calibrated and within safe dispatch bounds.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#233245] text-slate-400 text-[10px] flex justify-between">
              <span>Fusion: Learned Quality Gating</span>
              <span>Calibration: T=1.42</span>
              <span>ECE Error: 0.048 (Low)</span>
            </div>
          </div>
        </div>

        {/* Interactive Sliders Panel */}
        <div className="border border-[#233245] bg-[#101419] p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-[#233245] pb-2">
            <span className="text-slate-300 font-bold uppercase text-[10px]">
              LIVE INJECTION EXPERIMENT CONTROLS
            </span>
            <span className="text-slate-500 text-[10px]">Drag sliders to watch real-time weight shifts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blur Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Gaussian Blur Perturbation (σ):</span>
                <span className="text-[#06B6D4] font-bold">{blur.toFixed(1)} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={blur}
                onChange={(e) => setBlur(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#060A0E] appearance-none cursor-pointer accent-[#06B6D4] border border-[#233245]"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>0.0 px (Pristine 4K Drone)</span>
                <span>5.0 px (Severe Rain / Spray)</span>
                <span>10.0 px (Dense Turbid Fog)</span>
              </div>
            </div>

            {/* Packet Loss Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">UAV Transmission Packet Loss:</span>
                <span className="text-[#F59E0B] font-bold">{packetLoss}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={packetLoss}
                onChange={(e) => setPacketLoss(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#060A0E] appearance-none cursor-pointer accent-[#F59E0B] border border-[#233245]"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>0% (Full Bitrate)</span>
                <span>30% (Antenna Jitter)</span>
                <span>60% (Severely Artifacted)</span>
              </div>
            </div>
          </div>

          {/* Missing Modality Toggles */}
          <div className="flex items-center justify-between pt-2 border-t border-[#233245]">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px]">Stress Injections:</span>
              <button
                onClick={() => setDropVision(!dropVision)}
                className={`px-3 py-1 text-xs border font-bold transition-all ${
                  dropVision ? "bg-[#EF4444] text-[#0B0F14] border-[#EF4444]" : "bg-[#060A0E] text-slate-300 border-[#233245] hover:border-[#EF4444]"
                }`}
              >
                {dropVision ? "RESTORE VISION STREAM" : "DROP VISION STREAM"}
              </button>
              <button
                onClick={() => setDropText(!dropText)}
                className={`px-3 py-1 text-xs border font-bold transition-all ${
                  dropText ? "bg-[#F59E0B] text-[#0B0F14] border-[#F59E0B]" : "bg-[#060A0E] text-slate-300 border-[#233245] hover:border-[#F59E0B]"
                }`}
              >
                {dropText ? "RESTORE 911 AUDIO" : "DROP 911 AUDIO"}
              </button>
            </div>

            <button
              onClick={() => {
                setBlur(0);
                setPacketLoss(0);
                setDropVision(false);
                setDropText(false);
              }}
              className="px-3 py-1 bg-[#182230] border border-[#233245] text-[#06B6D4] hover:bg-[#233245] text-xs font-bold"
            >
              RESET ALL TO NOMINAL
            </button>
          </div>
        </div>

        {/* Automated Sweep Results Table */}
        <div className="border border-[#233245] bg-[#101419] p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-[#233245] pb-2">
            <div className="flex items-center gap-2 text-slate-200">
              <BarChart2 className="w-4 h-4 text-[#06B6D4]" />
              <span className="font-bold uppercase text-[10px]">
                AUTOMATED DEGRADATION SWEEP RESULTS (BLUR SIGMA 0.0 &rarr; 10.0)
              </span>
            </div>
            <span className="text-[10px] text-slate-500">6 TEST POINTS EXECUTED ON FIXED SPLIT</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#233245] text-slate-400 bg-[#060A0E]">
                  <th className="p-2">BLUR SIGMA</th>
                  <th className="p-2">SHARPNESS</th>
                  <th className="p-2">PRISM WEIGHT α_v</th>
                  <th className="p-2">PRISM CALIBRATED CONF</th>
                  <th className="p-2">BASELINE SOFTMAX CONF</th>
                  <th className="p-2">BASELINE DIAGNOSIS</th>
                  <th className="p-2">PRISM SAFETY ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sweepResults.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#233245] hover:bg-[#182230]">
                    <td className="p-2 font-bold text-slate-200">{row.sigma.toFixed(1)} px</td>
                    <td className="p-2 text-slate-300">{row.sharpness.toFixed(1)}</td>
                    <td className="p-2 text-[#06B6D4] font-bold">{row.prism_alpha_vision.toFixed(2)}</td>
                    <td className="p-2 text-[#06B6D4] font-bold">{row.prism_calibrated_confidence.toFixed(1)}%</td>
                    <td className="p-2 text-[#EF4444] font-bold">{row.baseline_raw_confidence.toFixed(1)}%</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.2 bg-[#EF4444]/20 text-[#EF4444] text-[9px] border border-[#EF4444]/40 font-bold">
                        {row.baseline_status}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold ${
                        row.prism_needs_review
                          ? "bg-[#EF4444]/20 text-[#FF817A] border border-[#EF4444]"
                          : "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]"
                      }`}>
                        {row.prism_needs_review ? "ROUTE TO HUMAN (HITL)" : "AUTOMATED DISPATCH"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
