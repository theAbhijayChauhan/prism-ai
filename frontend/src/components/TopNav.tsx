import React from "react";
import { Cpu, Activity, Clock, ShieldCheck, Flame, Radio, Crosshair } from "lucide-react";

interface TopNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onDispatchTrigger?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ currentTab, setTab, onDispatchTrigger }) => {
  const tabs = [
    { id: "overview", label: "TRIAGE OVERVIEW", icon: Crosshair },
    { id: "map", label: "SITUATION MAP", icon: Radio },
    { id: "upload", label: "EVIDENCE INTAKE", icon: ShieldCheck },
    { id: "robustness", label: "ROBUSTNESS LAB", icon: Activity },
    { id: "benchmarks", label: "BENCHMARKS & CARDS", icon: Cpu },
  ];

  return (
    <header className="flex justify-between items-center w-full px-4 py-2 border-b border-[#233245] bg-[#111822] shrink-0 z-30 select-none">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-pulse"></span>
          <span className="font-mono text-xs font-bold tracking-widest text-[#06B6D4] uppercase">
            PRISM // TACTICAL TRIAGE
          </span>
        </div>

        <div className="h-4 w-px bg-[#233245] hidden sm:block"></div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-[#060A0E] border border-[#233245] font-mono text-[10px]">
          <span className="text-slate-400">SYS_ONLINE:</span>
          <span className="text-[#06B6D4] font-semibold">LATENCY 14ms</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#EF4444]/15 border border-[#EF4444]/40 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 bg-[#EF4444] inline-block animate-ping"></span>
          <span className="text-[#FF817A] font-bold tracking-tight">
            ACTIVE REGION: TX-FLOOD-8820 (CAT 4)
          </span>
        </div>
      </div>

      {/* Center Telemetry Readouts */}
      <div className="hidden lg:flex items-center gap-4 font-mono text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>GPU 0: NVIDIA H100</span>
          <span className="text-[#06B6D4] font-semibold">(68% / 54.2GB)</span>
        </div>
        <div className="h-3 w-px bg-[#233245]"></div>
        <div className="flex items-center gap-1">
          <span>FPS:</span>
          <span className="text-slate-200 font-semibold">59.8</span>
        </div>
        <div className="h-3 w-px bg-[#233245]"></div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>ECE CALIBRATION:</span>
          <span className="text-[#06B6D4] font-semibold">ACTIVE (T=1.42)</span>
        </div>
        <div className="h-3 w-px bg-[#233245]"></div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>UPTIME: 142h 19m</span>
        </div>
      </div>

      {/* Navigation Tabs & Emergency Action */}
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all border ${
                  isActive
                    ? "border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#182230]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={onDispatchTrigger}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#EF4444] text-[#0B0F14] hover:bg-[#DC2626] font-mono text-xs font-bold uppercase transition-all shadow-none border border-[#FF817A]"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>DISPATCH TRIAGE</span>
        </button>
      </div>
    </header>
  );
};
