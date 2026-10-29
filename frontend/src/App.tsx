import React, { useState } from "react";
import { TopNav } from "./components/TopNav";
import { TriageOverview } from "./pages/TriageOverview";
import { IncidentMap } from "./pages/IncidentMap";
import { EvidenceUpload } from "./pages/EvidenceUpload";
import { RobustnessLabPage } from "./pages/RobustnessLabPage";
import { EvaluationReport } from "./pages/EvaluationReport";
import { AlertCircle, CheckCircle, Flame, X } from "lucide-react";

export function App() {
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [dispatchDispatched, setDispatchDispatched] = useState<boolean>(false);

  const handleConfirmDispatch = () => {
    setDispatchDispatched(true);
    setTimeout(() => {
      setDispatchDispatched(false);
      setShowDispatchModal(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F14] text-[#E0E2EA] overflow-hidden select-none font-mono">
      {/* Top Application Bar */}
      <TopNav
        currentTab={currentTab}
        setTab={setCurrentTab}
        onDispatchTrigger={() => setShowDispatchModal(true)}
      />

      {/* Main Tab Screen */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === "overview" && <TriageOverview />}
        {currentTab === "map" && <IncidentMap />}
        {currentTab === "upload" && <EvidenceUpload />}
        {currentTab === "robustness" && <RobustnessLabPage />}
        {currentTab === "benchmarks" && <EvaluationReport />}
      </main>

      {/* Emergency Dispatch Confirmation Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#101419] border-2 border-[#EF4444] max-w-md w-full p-6 text-xs space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="flex justify-between items-start border-b border-[#233245] pb-2">
              <div className="flex items-center gap-2 text-[#EF4444]">
                <Flame className="w-5 h-5 animate-pulse" />
                <h3 className="text-sm font-bold tracking-wider uppercase">
                  CONFIRM EMERGENCY RESCUE DISPATCH
                </h3>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dispatchDispatched ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto animate-bounce" />
                <div className="text-sm font-bold text-[#10B981]">
                  RESCUE SWARM AUTHORIZED &amp; DISPATCHED
                </div>
                <p className="text-[11px] text-slate-400">
                  Telemetry uplink sent to Houston East Basin Water Rescue Units 1-4.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-[#060A0E] border border-[#233245] space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">TARGET SECTOR:</span>
                    <strong className="text-slate-100">Houston East Basin (TX-FLOOD-8820)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SEVERITY LEVEL:</span>
                    <strong className="text-[#EF4444]">CRITICAL (LEVEL 4)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CALIBRATED CONF:</span>
                    <strong className="text-[#06B6D4]">87.4% (PASS HITL GATING)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ASSETS READY:</span>
                    <strong className="text-[#F59E0B]">4 Rescue Inflatables + 1 Recon UAV</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Notice: As a human-in-the-loop decision-support system, dispatching requires commanding officer electronic sign-off.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowDispatchModal(false)}
                    className="flex-1 py-2 bg-[#182230] border border-[#233245] text-slate-300 font-bold uppercase hover:bg-[#233245]"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmDispatch}
                    className="flex-1 py-2 bg-[#EF4444] text-[#0B0F14] font-bold uppercase hover:bg-[#DC2626] border border-[#FF817A]"
                  >
                    CONFIRM &amp; DISPATCH
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
