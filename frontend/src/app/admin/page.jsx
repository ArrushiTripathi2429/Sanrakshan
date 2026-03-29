"use client";

import { useEffect, useRef, useState } from "react";
import VILLAGES_DATA  from "../../data/villages";



const VOLUNTEERS = [
  { id: 1, name: "Neha Gupta", skills: ["Medical", "First Aid"], avail: true, color: "#6366f1", init: "NG" },
  { id: 2, name: "Arjun Mishra", skills: ["Construction", "Safety"], avail: true, color: "#3b82f6", init: "AM" },
  { id: 3, name: "Kavya Rao", skills: ["Education", "Water"], avail: false, color: "#8b5cf6", init: "KR" },
  { id: 4, name: "Rohit Pandey", skills: ["Food", "Logistics"], avail: true, color: "#06b6d4", init: "RP" },
  { id: 5, name: "Sunita Verma", skills: ["Medical", "Elderly Care"], avail: true, color: "#ec4899", init: "SV" },
  { id: 6, name: "Deepak Tiwari", skills: ["Safety", "Construction"], avail: true, color: "#f59e0b", init: "DT" },
];



const sevStyles = {
  high:   { badge: "bg-red-500/15 text-red-400 border-red-500/30",   bar: "bg-red-500",   dot: "#ef4444" },
  medium: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", bar: "bg-amber-500", dot: "#f59e0b" },
  low:    { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", bar: "bg-emerald-500", dot: "#22c55e" },
};

export default function AdminPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pulseMarkersRef = useRef({});

  const [villages, setVillages] = useState(() => VILLAGES_DATA.map((v) => ({ ...v, issues: 0 })));
  const [issues, setIssues] = useState([]);
  const [issueCounter, setIssueCounter] = useState(0);
  const [selIssue, setSelIssue] = useState(null);
  const [selVol, setSelVol] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ open: false, villageId: null });
  const [form, setForm] = useState({ village: "1", cat: "Water", sev: "medium", desc: "" });
  const [toast, setToast] = useState({ show: false, icon: "", msg: "" });

  useEffect(() => {
    if (mapInstanceRef.current) {
    mapInstanceRef.current.remove();
    mapInstanceRef.current = null; }

    const init = async () => {
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");

  
  const map = L.map(mapRef.current, { zoomControl: false }).setView([26.22, 81.28], 11);


  mapInstanceRef.current = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  VILLAGES_DATA.forEach((v) => addMarker(L, map, { ...v, issues: 0 }));
};
   
    init();
  }, []);

  const getColor = (v) => {
    if (v.issues > 0) return "#ef4444";
    if (v.type === "city" || v.type === "town") return "#3b82f6";
    return "#22c55e";
  };
  const getRadius = (v) => v.type === "city" ? 11 : v.type === "town" ? 8 : 6;

  const addMarker = (L, map, v) => {
    const c = getColor(v), r = getRadius(v);
    if (v.issues > 0) {
      const p = L.circleMarker([v.lat, v.lng], {
        radius: r + 10, color: "#ef4444", fillColor: "#ef4444",
        fillOpacity: 0.05, weight: 1, opacity: 0.3,
      }).addTo(map);
      pulseMarkersRef.current[v.id] = p;
    }
    const m = L.circleMarker([v.lat, v.lng], {
      radius: r, color: c, fillColor: c,
      fillOpacity: v.issues > 0 ? 0.9 : 0.7, weight: 2,
    }).addTo(map);
    m.bindPopup(buildPopupHTML(v));
    markersRef.current[v.id] = m;
  };

  const buildPopupHTML = (v) => {
    const status = v.issues > 0
      ? `<span style="color:#f87171;font-weight:600">⚠️ ${v.issues} Issues Active</span>`
      : `<span style="color:#4ade80;font-weight:600">✅ Zone Secure</span>`;
    return `<div style="font-family:'Outfit',sans-serif;min-width:180px;padding:4px">
      <div style="font-weight:700;font-size:14px;color:#f8fafc;margin-bottom:2px">${v.name}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${v.hi} • ${v.type.toUpperCase()}</div>
      <div style="font-size:12px;margin-bottom:12px;padding:6px;background:rgba(0,0,0,0.2);border-radius:6px">${status}</div>
      <button onclick="window.__openReportModal(${v.id})" style="width:100%;background:#ef4444;border:none;color:white;font-size:11px;font-weight:700;padding:8px;border-radius:6px;cursor:pointer">REPORT INCIDENT</button>
    </div>`;
  };

  const refreshMarker = async (v) => {
    const L = (await import("leaflet")).default;
    const map = mapInstanceRef.current;
    if (!map) return;
    if (markersRef.current[v.id]) markersRef.current[v.id].remove();
    if (pulseMarkersRef.current[v.id]) pulseMarkersRef.current[v.id].remove();
    addMarker(L, map, v);
  };

  useEffect(() => {
    window.__openReportModal = (vid) => openModal(vid);
    return () => { delete window.__openReportModal; };
  }, []);

  const openModal = (vid) => {
    setForm((f) => ({ ...f, village: String(vid ?? 1) }));
    setModal({ open: true, villageId: vid });
  };
  const closeModal = () => {
    setModal({ open: false, villageId: null });
    setForm((f) => ({ ...f, desc: "" }));
  };

  const submitIssue = () => {
    const vid = parseInt(form.village);
    const v = villages.find((x) => x.id === vid);
    const desc = form.desc.trim() || `${form.cat} issue reported in ${v.name}`;
    const newId = issueCounter + 1;
    setIssueCounter(newId);
    const newIssue = {
      id: newId,
      title: desc.slice(0, 50) + (desc.length > 50 ? "..." : ""),
      village: v.name, villageId: vid,
      category: form.cat, severity: form.sev,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      assigned: false, assignedTo: null,
    };
    setIssues((prev) => [newIssue, ...prev]);
    const updated = { ...v, issues: v.issues + 1 };
    setVillages((prev) => prev.map((x) => (x.id === vid ? updated : x)));
    refreshMarker(updated);
    closeModal();
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 14, { duration: 1.5 });
    setTimeout(() => markersRef.current[vid]?.openPopup(), 1600);
    showToast("🚨", `Alert raised for ${v.name}`);
  };

  const doAssign = () => {
    if (!selIssue || !selVol) return;
    setIssues((prev) =>
      prev.map((i) => i.id === selIssue.id ? { ...i, assigned: true, assignedTo: selVol.name } : i)
    );
    showToast("", `${selVol.name} deployed`);
    setSelIssue(null);
    setSelVol(null);
  };

  const showToast = (icon, msg) => {
    setToast({ show: true, icon, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  const flyToVillage = (v) => {
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 13, { duration: 1.2 });
    setTimeout(() => markersRef.current[v.id]?.openPopup(), 1300);
  };

  const filteredVillages = villages.filter((v) => {
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.hi.includes(q);
  });

  const problemVillages = filteredVillages.filter((v) => v.issues > 0);
  const safeVillages = filteredVillages.filter((v) => v.issues === 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: 'Outfit', sans-serif; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .leaflet-popup-content-wrapper { background: #0d1f12 !important; color: #f0fdf4 !important; border: 1px solid rgba(134,239,172,0.15) !important; border-radius: 14px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-tip { background: #0d1f12 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        @keyframes adm-fade-up { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .adm-fade { opacity:0; animation: adm-fade-up 0.5s ease forwards; }
        .adm-fade-1 { animation-delay: 0.05s; }
        .adm-fade-2 { animation-delay: 0.12s; }
        .adm-fade-3 { animation-delay: 0.2s; }
        .adm-fade-4 { animation-delay: 0.28s; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080e0a", display: "flex", flexDirection: "column" }}>

        {/* ── HEADER ── */}
        <header style={{
          height: 64, flexShrink: 0, background: "rgba(8,14,10,0.85)",
          backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(134,239,172,0.08)",
          padding: "0 32px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 1000,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(134,239,172,0.15), rgba(103,232,249,0.1))",
              border: "1px solid rgba(134,239,172,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem",
            }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.05rem", color: "#86efac", letterSpacing: "-0.01em", lineHeight: 1 }}>
                Sanrakshan
              </div>
              <div style={{ fontSize: "0.62rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 3 }}>
                Admin Command · Raebareli
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[
                { label: "Alerts", val: issues.length, color: "#f87171" },
                { label: "Pending", val: issues.filter(i => !i.assigned).length, color: "#fbbf24" },
                { label: "Assigned", val: issues.filter(i => i.assigned).length, color: "#67e8f9" },
              ].map((s, i) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "0.95rem", color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", boxShadow: "0 0 8px #86efac" }} />
              <span style={{ fontSize: "0.72rem", color: "#86efac", fontWeight: 500 }}>Live</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>

          {/* ── VILLAGE STRIP above map ── */}
          <div className="adm-fade adm-fade-1" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, background: "#86efac", borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>
                  Zone Overview · {villages.length} locations
                </span>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search village..."
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, padding: "6px 12px", color: "#f0fdf4",
                  fontFamily: "'Outfit', sans-serif", fontSize: "0.78rem", outline: "none", width: 180,
                }}
              />
            </div>
            <div style={{
              display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6,
              scrollbarWidth: "thin",
            }}>
              {problemVillages.length > 0 && problemVillages.map((v) => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171", fontSize: "0.75rem", fontFamily: "'Outfit', sans-serif",
                  whiteSpace: "nowrap", transition: "all 0.2s",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  {v.name}
                  <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>({v.issues})</span>
                </button>
              ))}
              {safeVillages.map((v) => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(232,245,233,0.45)", fontSize: "0.75rem", fontFamily: "'Outfit', sans-serif",
                  whiteSpace: "nowrap", transition: "all 0.2s",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── MAP ── */}
          <div className="adm-fade adm-fade-2" style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, background: "#67e8f9", borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>
                  Operational Map
                </span>
              </div>
              <button
                onClick={() => openModal(null)}
                style={{
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171", fontSize: "0.75rem", fontWeight: 600,
                  padding: "8px 18px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", letterSpacing: "0.04em",
                  transition: "all 0.2s",
                }}
              >
                + Report Incident
              </button>
            </div>
            <div style={{
              height: 420, borderRadius: 18, overflow: "hidden",
              border: "1px solid rgba(134,239,172,0.08)",
              boxShadow: "0 4px 40px rgba(0,0,0,0.4)",
            }}>
              <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>

          {/* ── ACTION CENTER: Issues + Volunteers stacked full-width ── */}
          <div className="adm-fade adm-fade-3" style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>

            {/* ACTIVE ISSUES */}
            <div style={{
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, overflow: "hidden",
            }}>
              <div style={{
                padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: "#f87171", borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>
                    Active Issues
                  </span>
                </div>
                <span style={{
                  fontSize: "0.65rem", padding: "3px 10px", borderRadius: 100,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }}>
                  {issues.filter(i => !i.assigned).length} unresolved
                </span>
              </div>

              {issues.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(232,245,233,0.22)", lineHeight: 1.6 }}>
                    No active incidents.<br />Use the map or the button above to report one.
                  </div>
                </div>
              ) : (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => !issue.assigned && setSelIssue(issue)}
                      style={{
                        padding: "16px 20px", borderRadius: 14, position: "relative",
                        overflow: "hidden", cursor: issue.assigned ? "default" : "pointer",
                        border: selIssue?.id === issue.id
                          ? "1px solid rgba(103,232,249,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                        background: issue.assigned
                          ? "rgba(255,255,255,0.01)"
                          : selIssue?.id === issue.id
                          ? "rgba(103,232,249,0.05)"
                          : "rgba(255,255,255,0.02)",
                        opacity: issue.assigned ? 0.45 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                        background: sevStyles[issue.severity]?.dot || "#86efac", borderRadius: "3px 0 0 3px",
                      }} />
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f0fdf4", marginBottom: 5 }}>
                            {issue.title}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.72rem", color: "rgba(232,245,233,0.35)" }}>
                            <span>📍 {issue.village}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{issue.category}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{issue.date}</span>
                            {issue.assigned && (
                              <>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ color: "#86efac" }}>✓ {issue.assignedTo}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: "0.62rem", fontWeight: 700, padding: "3px 10px",
                          borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.06em",
                          flexShrink: 0,
                          background: issue.severity === "high" ? "rgba(239,68,68,0.12)" : issue.severity === "medium" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                          color: issue.severity === "high" ? "#f87171" : issue.severity === "medium" ? "#fbbf24" : "#86efac",
                          border: `1px solid ${issue.severity === "high" ? "rgba(239,68,68,0.25)" : issue.severity === "medium" ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)"}`,
                        }}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VOLUNTEERS */}
            <div style={{
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18, overflow: "hidden",
            }}>
              <div style={{
                padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: "#86efac", borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>
                    Field Responders
                  </span>
                </div>
                <span style={{
                  fontSize: "0.65rem", padding: "3px 10px", borderRadius: 100,
                  background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.15)",
                  color: "#86efac",
                }}>
                  {VOLUNTEERS.filter(v => v.avail).length} available
                </span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {VOLUNTEERS.map((vol) => (
                  <div
                    key={vol.id}
                    onClick={() => vol.avail && setSelVol(vol)}
                    style={{
                      padding: "14px 20px", borderRadius: 14,
                      display: "flex", alignItems: "center", gap: 16,
                      cursor: vol.avail ? "pointer" : "default",
                      border: selVol?.id === vol.id
                        ? "1px solid rgba(134,239,172,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                      background: selVol?.id === vol.id
                        ? "rgba(134,239,172,0.05)"
                        : "rgba(255,255,255,0.02)",
                      opacity: vol.avail ? 1 : 0.35,
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: `${vol.color}18`, border: `1px solid ${vol.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.78rem", fontWeight: 700, color: vol.color,
                    }}>{vol.init}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f0fdf4", marginBottom: 4 }}>{vol.name}</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {vol.skills.map((s) => (
                          <span key={s} style={{
                            fontSize: "0.62rem", padding: "2px 8px", borderRadius: 4,
                            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                            color: "rgba(232,245,233,0.4)",
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: vol.avail ? "#86efac" : "#fbbf24",
                        boxShadow: vol.avail ? "0 0 8px #86efac" : "none",
                      }} />
                      <span style={{ fontSize: "0.65rem", color: vol.avail ? "#86efac" : "#fbbf24" }}>
                        {vol.avail ? "Available" : "Busy"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ASSIGN BAR ── */}
          <div className="adm-fade adm-fade-4" style={{
            position: "sticky", bottom: 20,
            background: "rgba(8,14,10,0.9)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(134,239,172,0.12)",
            borderRadius: 16, padding: "16px 24px",
            display: "flex", alignItems: "center", gap: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(232,245,233,0.25)", marginBottom: 5 }}>
                Assignment
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem" }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 8,
                  background: selIssue ? "rgba(103,232,249,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selIssue ? "rgba(103,232,249,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: selIssue ? "#67e8f9" : "rgba(232,245,233,0.2)",
                  fontSize: "0.75rem",
                }}>
                  {selIssue ? selIssue.title.slice(0, 30) + "..." : "Select an issue"}
                </span>
                <span style={{ color: "rgba(232,245,233,0.2)", fontSize: "0.9rem" }}>→</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 8,
                  background: selVol ? "rgba(134,239,172,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selVol ? "rgba(134,239,172,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: selVol ? "#86efac" : "rgba(232,245,233,0.2)",
                  fontSize: "0.75rem",
                }}>
                  {selVol ? selVol.name : "Select a responder"}
                </span>
              </div>
            </div>
            <button
              disabled={!selIssue || !selVol}
              onClick={doAssign}
              style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: selIssue && selVol
                  ? "linear-gradient(135deg, #86efac, #4ade80)"
                  : "rgba(255,255,255,0.04)",
                color: selIssue && selVol ? "#080e0a" : "rgba(232,245,233,0.2)",
                fontFamily: "'Outfit', sans-serif", fontWeight: 700,
                fontSize: "0.82rem", letterSpacing: "0.04em",
                cursor: selIssue && selVol ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              Deploy Responder
            </button>
          </div>

        </main>
      </div>

      {/* ── MODAL ── */}
      {modal.open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(8,14,10,0.88)",
          backdropFilter: "blur(12px)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#0d1f12", border: "1px solid rgba(134,239,172,0.12)",
            borderRadius: 22, padding: 36, width: "100%", maxWidth: 420,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.3rem", color: "#f0fdf4", marginBottom: 6 }}>
              Report Incident
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(232,245,233,0.35)", marginBottom: 28 }}>
              Location: <span style={{ color: "#86efac" }}>{villages.find(v => v.id == form.village)?.name || "—"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Village", field: "village", type: "select", options: villages.map(v => ({ val: String(v.id), label: v.name })) },
                { label: "Category", field: "cat", type: "select", options: ["Water","Health","Food","Safety","Education","Infrastructure"].map(c => ({ val: c, label: c })) },
                { label: "Severity", field: "sev", type: "select", options: [{ val: "high", label: "Urgent (High)" }, { val: "medium", label: "Standard (Medium)" }, { val: "low", label: "Low Priority" }] },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(232,245,233,0.3)", marginBottom: 7 }}>{label}</div>
                  <select
                    value={form[field]}
                    onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                      padding: "10px 14px", color: "#f0fdf4",
                      fontFamily: "'Outfit', sans-serif", fontSize: "0.85rem", outline: "none",
                    }}
                  >
                    {options.map(o => <option key={o.val} value={o.val} style={{ background: "#0d1f12" }}>{o.label}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(232,245,233,0.3)", marginBottom: 7 }}>Notes</div>
                <textarea
                  rows={3}
                  value={form.desc}
                  onChange={(e) => setForm(f => ({ ...f, desc: e.target.value }))}
                  placeholder="Describe the situation..."
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                    padding: "10px 14px", color: "#f0fdf4",
                    fontFamily: "'Outfit', sans-serif", fontSize: "0.85rem",
                    outline: "none", resize: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)",
                  background: "none", color: "rgba(232,245,233,0.35)",
                  fontFamily: "'Outfit', sans-serif", fontSize: "0.82rem", cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={submitIssue}
                style={{
                  flex: 2, padding: "12px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "white", fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(239,68,68,0.25)",
                }}
              >Submit Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div style={{
        position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${toast.show ? 0 : 16}px)`,
        zIndex: 3000, padding: "12px 22px", borderRadius: 14,
        background: "rgba(13,31,18,0.95)", border: "1px solid rgba(134,239,172,0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", gap: 10,
        opacity: toast.show ? 1 : 0, pointerEvents: toast.show ? "auto" : "none",
        transition: "all 0.4s ease",
      }}>
        <span style={{ fontSize: "1.1rem" }}>{toast.icon}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f0fdf4" }}>{toast.msg}</span>
      </div>
    </>
  );
}
