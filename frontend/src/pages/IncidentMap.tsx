import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  MapPin, AlertTriangle, ShieldCheck, Flame, UserCheck, 
  Filter, CheckCircle, Navigation, ExternalLink 
} from "lucide-react";
import { fetchIncidents, reviewIncident } from "../api/client";
import { IncidentItem } from "../types";

export const IncidentMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load incidents
  const loadIncidents = async () => {
    try {
      const data = await fetchIncidents(statusFilter);
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Houston, Texas disaster zone
    const map = L.map(mapContainerRef.current, {
      center: [29.7604, -95.3698],
      zoom: 11,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Dark Tactical CartoDB basemap
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when incidents change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    incidents.forEach((item) => {
      const color =
        item.severity_level === 4
          ? "#EF4444"
          : item.severity_level === 3
          ? "#F59E0B"
          : item.severity_level === 2
          ? "#3B82F6"
          : "#06B6D4";

      const isVerified = item.status === "VERIFIED" || item.status === "DISPATCHED";

      const iconHtml = `
        <div style="
          background-color: ${color};
          width: 22px;
          height: 22px;
          border-radius: 2px;
          border: 2px solid ${isVerified ? "#FFFFFF" : "#0B0F14"};
          box-shadow: 0 0 10px ${color}80;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0B0F14;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        ">
          ${item.severity_level}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      marker.on("click", () => {
        setSelectedIncident(item);
      });

      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #101419; padding: 4px;">
          <div style="font-weight: bold; color: ${color};">${item.id}: ${item.title}</div>
          <div style="margin-top: 4px;">Severity: Level ${item.severity_level} (${item.calibrated_confidence.toFixed(1)}% Conf)</div>
          <div style="margin-top: 2px; font-weight: 600;">Status: ${item.status}</div>
        </div>
      `);

      markersRef.current?.addLayer(marker);
    });
  }, [incidents]);

  const handleReview = async (status: "VERIFIED" | "REJECTED" | "DISPATCHED") => {
    if (!selectedIncident) return;
    try {
      await reviewIncident(
        selectedIncident.id,
        status,
        `Status set to ${status} via Incident Map Command Console`
      );
      setFeedback(`Incident ${selectedIncident.id} updated to ${status}`);
      setTimeout(() => setFeedback(null), 3500);
      loadIncidents();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const flyToIncident = (item: IncidentItem) => {
    setSelectedIncident(item);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-50px)] overflow-hidden bg-[#060A0E] text-[#E0E2EA]">
      {feedback && (
        <div className="bg-[#10B981] text-[#0B0F14] px-4 py-2 font-mono text-xs font-bold tracking-wider flex items-center justify-between z-30">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}>DISMISS</button>
        </div>
      )}

      {/* Control Strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111822] border-b border-[#233245] font-mono text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#06B6D4] font-bold">
            <Navigation className="w-4 h-4" />
            <span>INCIDENT GEOSPATIAL MAP &amp; HUMAN-IN-THE-LOOP QUEUE</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            TOTAL ACTIVE HAZARDS: <strong className="text-slate-100">{incidents.length}</strong>
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[11px]">FILTER:</span>
          {["ALL", "UNREVIEWED", "VERIFIED", "DISPATCHED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 text-[10px] font-semibold transition-all border ${
                statusFilter === st
                  ? "bg-[#06B6D4] text-[#0B0F14] border-[#06B6D4]"
                  : "bg-[#182230] text-slate-300 border-[#233245] hover:border-slate-400"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Map & Split Drawer */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative">
        {/* Leaflet Map Canvas (8 cols on lg) */}
        <div className="col-span-12 lg:col-span-8 h-full relative">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Legend Overlay */}
          <div className="absolute top-3 left-3 z-20 bg-[#0B0F14]/90 backdrop-blur-md p-2.5 border border-[#233245] font-mono text-[10px] space-y-1.5 pointer-events-auto">
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">
              SEVERITY TIERS
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#EF4444] inline-block border border-white"></span>
              <span>Level 4 - Critical (Life Threat)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#F59E0B] inline-block border border-white"></span>
              <span>Level 3 - Severe (Vehicles / Flood Ingress)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#3B82F6] inline-block border border-black"></span>
              <span>Level 2 - Moderate (Roadway Waterlogging)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#06B6D4] inline-block border border-black"></span>
              <span>Level 1 - Advisory (Drainage Monitored)</span>
            </div>
            <div className="pt-1 border-t border-[#233245] text-slate-400 text-[9px]">
              White border = Human Verified / Dispatched
            </div>
          </div>
        </div>

        {/* Right Drawer: Incident Details & Action Center (4 cols on lg) */}
        <div className="col-span-12 lg:col-span-4 bg-[#0E131A] border-l border-[#233245] flex flex-col h-full overflow-y-auto font-mono text-xs z-20">
          {selectedIncident ? (
            <div className="p-4 flex flex-col gap-3">
              {/* Incident Header */}
              <div className="flex justify-between items-start border-b border-[#233245] pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#06B6D4] font-bold text-sm">{selectedIncident.id}</span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                      selectedIncident.status === "VERIFIED"
                        ? "bg-[#10B981] text-[#0B0F14]"
                        : selectedIncident.status === "DISPATCHED"
                        ? "bg-[#EF4444] text-[#0B0F14] animate-pulse"
                        : "bg-[#F59E0B] text-[#0B0F14]"
                    }`}>
                      {selectedIncident.status}
                    </span>
                  </div>
                  <h3 className="text-slate-100 font-bold text-xs mt-1">
                    {selectedIncident.title}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    REGION: {selectedIncident.region}
                  </span>
                </div>
              </div>

              {/* Coordinates Pill */}
              <div className="flex items-center justify-between p-2 bg-[#060A0E] border border-[#233245] text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>{selectedIncident.lat.toFixed(4)}° N, {selectedIncident.lng.toFixed(4)}° W</span>
                </div>
                <button
                  onClick={() => flyToIncident(selectedIncident)}
                  className="px-2 py-0.5 bg-[#182230] hover:bg-[#233245] text-[#06B6D4] text-[10px] border border-[#233245]"
                >
                  RE-CENTER
                </button>
              </div>

              {/* Text Dispatch Evidence */}
              <div className="border border-[#233245] bg-[#101419] p-2.5">
                <span className="text-[9px] text-slate-500 uppercase block mb-1">
                  INGESTED EVIDENCE NARRATIVE
                </span>
                <p className="text-slate-200 text-xs leading-relaxed italic">
                  "{selectedIncident.text}"
                </p>
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-[#060A0E] border border-[#233245]">
                  <span className="text-[9px] text-slate-500 block">PRISM CALIBRATED CONF</span>
                  <span className="text-[#06B6D4] font-bold text-sm">
                    {selectedIncident.calibrated_confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 bg-[#060A0E] border border-[#233245]">
                  <span className="text-[9px] text-slate-500 block">RAW SOFTMAX (OVERCONF)</span>
                  <span className="text-[#EF4444] font-bold text-sm">
                    {selectedIncident.raw_softmax_confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 bg-[#060A0E] border border-[#233245]">
                  <span className="text-[9px] text-slate-500 block">SEVERITY LEVEL</span>
                  <span className="text-slate-100 font-bold text-sm">
                    CLASS {selectedIncident.severity_level}
                  </span>
                </div>
                <div className="p-2 bg-[#060A0E] border border-[#233245]">
                  <span className="text-[9px] text-slate-500 block">HUMAN REVIEW</span>
                  <span className={`font-bold text-xs ${selectedIncident.needs_review ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                    {selectedIncident.needs_review ? "FLAGGED FOR AUDIT" : "CONFIRMED"}
                  </span>
                </div>
              </div>

              {/* Reviewer Action Buttons */}
              <div className="pt-2 border-t border-[#233245] flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  OPERATIONAL COMMAND ACTIONS
                </span>
                <button
                  onClick={() => handleReview("DISPATCHED")}
                  className="w-full py-2 bg-[#EF4444] text-[#0B0F14] font-bold uppercase hover:bg-[#DC2626] transition-all flex items-center justify-center gap-1.5 border border-[#FF817A]"
                >
                  <Flame className="w-4 h-4" />
                  <span>AUTHORIZE RESCUE DISPATCH</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleReview("VERIFIED")}
                    className="py-1.5 px-2 bg-[#182230] border border-[#233245] hover:border-[#10B981] text-[#10B981] text-[10px] font-bold uppercase flex items-center justify-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>VERIFY ASSESSMENT</span>
                  </button>
                  <button
                    onClick={() => handleReview("REJECTED")}
                    className="py-1.5 px-2 bg-[#182230] border border-[#233245] hover:border-[#EF4444] text-slate-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>REJECT / DISCARD</span>
                  </button>
                </div>
              </div>

              {/* Incident Feed List Below Details */}
              <div className="mt-3 pt-3 border-t border-[#233245]">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">
                  ALL INCIDENTS IN CURRENT SECTOR ({incidents.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {incidents.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => flyToIncident(item)}
                      className={`p-2 bg-[#060A0E] border cursor-pointer transition-all flex items-center justify-between ${
                        selectedIncident.id === item.id
                          ? "border-[#06B6D4] bg-[#06B6D4]/10"
                          : "border-[#233245] hover:border-slate-500"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#06B6D4] font-bold text-[11px]">{item.id}</span>
                          <span className="text-[10px] text-slate-300 truncate max-w-[140px]">{item.title}</span>
                        </div>
                        <span className="text-[9px] text-slate-500">
                          Level {item.severity_level} • {item.status}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Select an incident marker on the map to review telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
