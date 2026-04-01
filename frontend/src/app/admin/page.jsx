"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, orderBy, query, where,
  doc, updateDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import VILLAGES_DATA from "@/data/villages";
import DownloadReport from "@/components/DownloadReport";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";


const VOL_COLORS = ["#6366f1","#3b82f6","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#86efac","#f87171"];

const initials = (name) =>
  name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

const sevStyles = {
  high:   { dot: "#ef4444" },
  medium: { dot: "#f59e0b" },
  low:    { dot: "#22c55e" },
};

const CAT_COLORS = {
  flood: "#67e8f9", medical: "#f87171", road: "#fbbf24",
  food: "#86efac", education: "#c084fc", electricity: "#fb923c",
  water: "#38bdf8", other: "#94a3b8",
};

const STAT_COLORS = ["#f87171", "#67e8f9", "#86efac"];
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1f12", border: "1px solid rgba(134,239,172,0.15)", borderRadius: 10, padding: "8px 14px" }}>
      <div style={{ fontSize: "0.7rem", color: "rgba(232,245,233,0.4)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#86efac" }}>{payload[0].value}</div>
    </div>
  );
}

//  ChartsSection 
function ChartsSection({ issues }) {
  const catData = Object.entries(
    issues.reduce((a, i) => {
      const c = i.category || "other";
      a[c] = (a[c] || 0) + 1;
      return a;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const count = issues.filter(
      (x) => x.createdAt?.toDate && x.createdAt.toDate().toDateString() === d.toDateString()
    ).length;
    return { label, count };
  });

  const statData = [
    { name: "Pending",  value: issues.filter((i) => !i.assigned && i.status !== "resolved").length },
    { name: "Assigned", value: issues.filter((i) => i.assigned && i.status !== "resolved").length },
    { name: "Resolved", value: issues.filter((i) => i.status === "resolved").length },
  ].filter((d) => d.value > 0);

  const card = {
    background: "rgba(255,255,255,0.015)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: "20px 22px",
  };
  const lbl = {
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "rgba(232,245,233,0.3)",
    marginBottom: 14,
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ width: 3, height: 14, background: "#c084fc", borderRadius: 2, display: "inline-block" }} />
        <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>
          Analytics · {issues.length} total reports
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: 16 }}>

        {/* Bar chart — by category */}
        <div style={card}>
          <div style={lbl}>By Category</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={catData} barSize={20}>
              <XAxis dataKey="name" tick={{ fill: "rgba(232,245,233,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(232,245,233,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                {catData.map((e) => <Cell key={e.name} fill={CAT_COLORS[e.name] || "#94a3b8"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart — last 7 days */}
        <div style={card}>
          <div style={lbl}>Last 7 Days</div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={trendData}>
              <XAxis dataKey="label" tick={{ fill: "rgba(232,245,233,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(232,245,233,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="count" stroke="#fbbf24" strokeWidth={2.5} dot={{ fill: "#fbbf24", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart — by status */}
        <div style={card}>
          <div style={lbl}>Status</div>
          {statData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={statData} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value">
                    {statData.map((_, i) => <Cell key={i} fill={STAT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {statData.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: STAT_COLORS[i] }} />
                      <span style={{ fontSize: "0.7rem", color: "rgba(232,245,233,0.4)" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: STAT_COLORS[i] }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(232,245,233,0.2)" }}>No data yet</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

//  AdminPage
export default function AdminPage() {
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef({});
  const pulseMarkersRef = useRef({});
  const leafletRef      = useRef(null);

  const [villages,   setVillages]   = useState(() => VILLAGES_DATA.map((v) => ({ ...v, issues: 0 })));
  const [issues,     setIssues]     = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selIssue,   setSelIssue]   = useState(null);
  const [selVol,     setSelVol]     = useState(null);
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState({ open: false, villageId: null });
  const [form,       setForm]       = useState({ village: "1", cat: "water", sev: "medium", desc: "" });
  const [toast,      setToast]      = useState({ show: false, icon: "", msg: "" });
  const [assigning,  setAssigning]  = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "volunteer"));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(
        snap.docs.map((d, i) => ({
          id: d.id,
          ...d.data(),
          color: VOL_COLORS[i % VOL_COLORS.length],
          init: initials(d.data().name),
          avail: d.data().available !== false,
        }))
      );
    });
    return () => unsub();
  }, []);

  
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      leafletRef.current = L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([26.22, 81.28], 11);
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      VILLAGES_DATA.forEach((v) => addMarker(L, map, { ...v, issues: 0 }));
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : "Just now",
      }));

      // Pending = unassigned and not resolved
      const pending = docs.filter((i) => !i.assigned && i.status !== "resolved");

      if (pending.length > 0) {
        try {
          const res = await fetch("http://localhost:8000/api/priority", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reports: pending.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                category: r.category,
                severity: r.severity,
                affected: r.affected,
                location: r.location,
                village: r.village,
              })),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            // data expected: [{ id, score, reason }, ...]
            const scoreMap = {};
            (data.scores || data).forEach((s) => { scoreMap[s.id] = s; });
            const merged = docs.map((d) =>
              scoreMap[d.id] ? { ...d, score: scoreMap[d.id].score, reason: scoreMap[d.id].reason } : d
            );
            // Sort pending by score desc, keep rest in original order
            const scoredPending = merged
              .filter((i) => !i.assigned && i.status !== "resolved")
              .sort((a, b) => (b.score || 0) - (a.score || 0));
            const rest = merged.filter((i) => i.assigned || i.status === "resolved");
            setIssues([...scoredPending, ...rest]);
          } else {
            setIssues(docs);
          }
        } catch {
          setIssues(docs);
        }
      } else {
        setIssues(docs);
      }

      // Update village issue counts
      const counts = {};
      docs.filter((i) => !i.assigned).forEach((i) => {
        VILLAGES_DATA.forEach((v) => {
          if (
            i.location?.toLowerCase().includes(v.name.toLowerCase()) ||
            i.village?.toLowerCase() === v.name.toLowerCase() ||
            i.villageId === v.id
          ) {
            counts[v.id] = (counts[v.id] || 0) + 1;
          }
        });
      });
      setVillages((prev) => {
        const updated = prev.map((v) => ({ ...v, issues: counts[v.id] || 0 }));
        if (leafletRef.current && mapInstanceRef.current) {
          updated.forEach((v) => refreshMarkerDirect(leafletRef.current, mapInstanceRef.current, v));
        }
        return updated;
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getColor  = (v) => v.issues > 0 ? "#ef4444" : (v.type === "city" || v.type === "town") ? "#3b82f6" : "#22c55e";
  const getRadius = (v) => v.type === "city" ? 11 : v.type === "town" ? 8 : 6;

  const buildPopupHTML = (v) => {
    const status = v.issues > 0
      ? `<span style="color:#f87171;font-weight:600">⚠️ ${v.issues} Issues Active</span>`
      : `<span style="color:#4ade80;font-weight:600">✅ Zone Secure</span>`;
    return `<div style="font-family:'Outfit',sans-serif;min-width:180px;padding:4px">
      <div style="font-weight:700;font-size:14px;color:#f8fafc;margin-bottom:2px">${v.name}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${v.hi} · ${v.type.toUpperCase()}</div>
      <div style="font-size:12px;margin-bottom:12px;padding:6px;background:rgba(0,0,0,0.2);border-radius:6px">${status}</div>
      <button onclick="window.__openReportModal(${v.id})" style="width:100%;background:#ef4444;border:none;color:white;font-size:11px;font-weight:700;padding:8px;border-radius:6px;cursor:pointer">REPORT INCIDENT</button>
    </div>`;
  };

  const addMarker = (L, map, v) => {
    const c = getColor(v);
    const r = getRadius(v);
    if (v.issues > 0) {
      pulseMarkersRef.current[v.id] = L.circleMarker([v.lat, v.lng], {
        radius: r + 10, color: "#ef4444", fillColor: "#ef4444",
        fillOpacity: 0.05, weight: 1, opacity: 0.3,
      }).addTo(map);
    }
    const m = L.circleMarker([v.lat, v.lng], {
      radius: r, color: c, fillColor: c,
      fillOpacity: v.issues > 0 ? 0.9 : 0.7, weight: 2,
    }).addTo(map);
    m.bindPopup(buildPopupHTML(v));
    markersRef.current[v.id] = m;
  };

  const refreshMarkerDirect = (L, map, v) => {
    if (markersRef.current[v.id])      { markersRef.current[v.id].remove();      delete markersRef.current[v.id]; }
    if (pulseMarkersRef.current[v.id]) { pulseMarkersRef.current[v.id].remove(); delete pulseMarkersRef.current[v.id]; }
    addMarker(L, map, v);
  };

  // Expose modal opener to Leaflet popup buttons
  useEffect(() => {
    window.__openReportModal = (vid) => openModal(vid);
    return () => { delete window.__openReportModal; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  const openModal  = (vid) => {
    setForm((f) => ({ ...f, village: String(vid ?? 1) }));
    setModal({ open: true, villageId: vid });
  };
  const closeModal = () => {
    setModal({ open: false, villageId: null });
    setForm((f) => ({ ...f, desc: "" }));
  };

  
  const submitIssue = async () => {
    const vid = parseInt(form.village);
    const v   = villages.find((x) => x.id === vid);
    const desc = form.desc.trim() || `${form.cat} issue in ${v.name}`;
    try {
      await addDoc(collection(db, "reports"), {
        title: desc.slice(0, 55),
        village: v.name,
        villageId: vid,
        location: v.name,
        category: form.cat,
        severity: form.sev,
        status: "pending",
        assigned: false,
        assignedTo: null,
        fieldWorkerId: "admin",
        fieldWorkerName: "Admin",
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    closeModal();
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 14, { duration: 1.5 });
    setTimeout(() => markersRef.current[vid]?.openPopup(), 1600);
    showToast("🚨", `Alert raised for ${v.name}`);
  };
  const doAssign = async () => {
    if (!selIssue || !selVol) return;
    setAssigning(true);
    try {
      await updateDoc(doc(db, "reports", selIssue.id), {
        assigned: true,
        assignedTo: selVol.name,
        status: "assigned",
      });
      showToast("🤝", `${selVol.name} deployed`);
      setSelIssue(null);
      setSelVol(null);
    } catch (e) { console.error(e); }
    finally { setAssigning(false); }
  };
  const showToast = (icon, msg) => {
    setToast({ show: true, icon, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  
  const flyToVillage = (v) => {
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 13, { duration: 1.2 });
    setTimeout(() => markersRef.current[v.id]?.openPopup(), 1300);
  };

  const filteredVillages = villages.filter(
    (v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.hi.includes(search)
  );
  const problemVillages = filteredVillages.filter((v) => v.issues > 0);
  const safeVillages    = filteredVillages.filter((v) => v.issues === 0);

  
  const scoreBadgeColor = (score) => {
    if (score >= 70) return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171" };
    if (score >= 40) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#fbbf24" };
    return { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#86efac" };
  };

  
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#080e0a;color:#e8f5e9;font-family:'Outfit',sans-serif;min-height:100vh;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:10px;}
        .leaflet-popup-content-wrapper{background:#0d1f12!important;color:#f0fdf4!important;border:1px solid rgba(134,239,172,0.15)!important;border-radius:14px!important;box-shadow:0 8px 32px rgba(0,0,0,0.5)!important;}
        .leaflet-popup-tip{background:#0d1f12!important;}
        .leaflet-popup-content{margin:0!important;}
        @keyframes adm-up{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        .adm-fade{opacity:0;animation:adm-up 0.5s ease forwards;}
        .adm-1{animation-delay:0.05s;}.adm-2{animation-delay:0.12s;}.adm-3{animation-delay:0.2s;}.adm-4{animation-delay:0.28s;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080e0a", display: "flex", flexDirection: "column" }}>

        {/* ── HEADER ── */}
        <header style={{
          height: 64, flexShrink: 0,
          background: "rgba(8,14,10,0.85)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(134,239,172,0.08)",
          padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 1000,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg,rgba(134,239,172,0.15),rgba(103,232,249,0.1))",
              border: "1px solid rgba(134,239,172,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
            }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.05rem", color: "#86efac", letterSpacing: "-0.01em", lineHeight: 1 }}>Sanrakshan</div>
              <div style={{ fontSize: "0.62rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: 3 }}>Admin Command · Raebareli</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[
                { label: "Alerts",   val: issues.length,                                    color: "#f87171" },
                { label: "Pending",  val: issues.filter((i) => !i.assigned).length,          color: "#fbbf24" },
                { label: "Assigned", val: issues.filter((i) => i.assigned).length,           color: "#67e8f9" },
              ].map((s) => (
                <div key={s.label} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.95rem", color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", boxShadow: "0 0 8px #86efac" }} />


              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
  <DownloadReport issues={issues} villages={villages} />
  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", boxShadow: "0 0 8px #86efac" }} />
    <span style={{ fontSize: "0.72rem", color: "#86efac", fontWeight: 500 }}>Live</span>
  </div>
</div>
              <span style={{ fontSize: "0.72rem", color: "#86efac", fontWeight: 500 }}>Live</span>
              
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>

          {/* ── VILLAGE STRIP ── */}
          <div className="adm-fade adm-1" style={{ marginBottom: 16 }}>
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
                  fontFamily: "'Outfit',sans-serif", fontSize: "0.78rem", outline: "none", width: 180,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
              {problemVillages.map((v) => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171", fontSize: "0.75rem", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  {v.name} <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>({v.issues})</span>
                </button>
              ))}
              {safeVillages.map((v) => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(232,245,233,0.45)", fontSize: "0.75rem", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── MAP ── */}
          <div className="adm-fade adm-2" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, background: "#67e8f9", borderRadius: 2, display: "inline-block" }} />
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>Operational Map</span>
              </div>
              <button onClick={() => openModal(null)} style={{
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171", fontSize: "0.75rem", fontWeight: 600,
                padding: "8px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              }}>
                + Report Incident
              </button>
            </div>
            <div style={{
              height: 420, borderRadius: 18, overflow: "hidden",
              border: "1px solid rgba(134,239,172,0.08)", boxShadow: "0 4px 40px rgba(0,0,0,0.4)",
            }}>
              <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>

          {/* ── CHARTS ── */}
          <div className="adm-fade adm-3">
            <ChartsSection issues={issues} />
          </div>

          {/* ── ISSUES ── */}
          <div style={{
            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18, overflow: "hidden", marginBottom: 20,
          }}>
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, background: "#f87171", borderRadius: 2 }} />
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>Active Issues</span>
              </div>
              <span style={{
                fontSize: "0.65rem", padding: "3px 10px", borderRadius: 100,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171",
              }}>
                {issues.filter((i) => !i.assigned).length} unresolved
              </span>
            </div>

            {issues.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(232,245,233,0.22)", lineHeight: 1.6 }}>
                  No active incidents.<br />Field workers will appear here in real time.
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {issues.map((issue) => {
                  const sc = issue.score != null ? scoreBadgeColor(issue.score) : null;
                  return (
                    <div
                      key={issue.id}
                      onClick={() => !issue.assigned && setSelIssue(issue)}
                      style={{
                        padding: "16px 20px", borderRadius: 14, position: "relative", overflow: "hidden",
                        cursor: issue.assigned ? "default" : "pointer",
                        border: selIssue?.id === issue.id ? "1px solid rgba(103,232,249,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        background: issue.assigned ? "rgba(255,255,255,0.01)" : selIssue?.id === issue.id ? "rgba(103,232,249,0.05)" : "rgba(255,255,255,0.02)",
                        opacity: issue.assigned ? 0.45 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Severity left bar */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                        background: sevStyles[issue.severity]?.dot || "#86efac",
                        borderRadius: "3px 0 0 3px",
                      }} />

                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f0fdf4", marginBottom: 5 }}>
                            {issue.title || issue.description?.slice(0, 50)}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "rgba(232,245,233,0.35)", flexWrap: "wrap" }}>
                            <span>📍 {issue.village || issue.location}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{issue.category}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{issue.date}</span>
                            {issue.fieldWorkerName && (
                              <>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span>👤 {issue.fieldWorkerName}</span>
                              </>
                            )}
                            {issue.assigned && (
                              <>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ color: "#86efac" }}>✓ {issue.assignedTo}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {/* Severity badge */}
                          <span style={{
                            fontSize: "0.62rem", fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            background: issue.severity === "high" ? "rgba(239,68,68,0.12)" : issue.severity === "medium" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                            color: issue.severity === "high" ? "#f87171" : issue.severity === "medium" ? "#fbbf24" : "#86efac",
                            border: `1px solid ${issue.severity === "high" ? "rgba(239,68,68,0.25)" : issue.severity === "medium" ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)"}`,
                          }}>
                            {issue.severity}
                          </span>

                          {/* Priority score badge */}
                          {issue.score != null && sc && (
                            <span
                              title={issue.reason || ""}
                              style={{
                                fontSize: "0.62rem", fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                                letterSpacing: "0.06em", cursor: issue.reason ? "help" : "default",
                                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                              }}
                            >
                              ⚡ {issue.score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── VOLUNTEERS ── */}
          <div style={{
            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18, overflow: "hidden", marginBottom: 24,
          }}>
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, background: "#86efac", borderRadius: 2 }} />
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(232,245,233,0.35)" }}>Field Responders</span>
              </div>
              <span style={{
                fontSize: "0.65rem", padding: "3px 10px", borderRadius: 100,
                background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.15)", color: "#86efac",
              }}>
                {volunteers.filter((v) => v.avail).length} available
              </span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {volunteers.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.3 }}>👤</div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(232,245,233,0.22)", lineHeight: 1.6 }}>
                    No volunteers yet.<br />They'll appear here once they sign in.
                  </div>
                </div>
              ) : volunteers.map((vol) => (
                <div
                  key={vol.id}
                  onClick={() => vol.avail && setSelVol(vol)}
                  style={{
                    padding: "14px 20px", borderRadius: 14, display: "flex", alignItems: "center", gap: 16,
                    cursor: vol.avail ? "pointer" : "default",
                    border: selVol?.id === vol.id ? "1px solid rgba(134,239,172,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    background: selVol?.id === vol.id ? "rgba(134,239,172,0.05)" : "rgba(255,255,255,0.02)",
                    opacity: vol.avail ? 1 : 0.35,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `${vol.color}18`, border: `1px solid ${vol.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.78rem", fontWeight: 700, color: vol.color,
                  }}>
                    {vol.init}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f0fdf4", marginBottom: 4 }}>{vol.name}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {(vol.skills || [vol.email]).filter(Boolean).map((s) => (
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

          {/* ── STICKY ASSIGN BAR ── */}
          <div className="adm-fade adm-4" style={{
            position: "sticky", bottom: 20,
            background: "rgba(8,14,10,0.9)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(134,239,172,0.12)", borderRadius: 16,
            padding: "16px 24px", display: "flex", alignItems: "center", gap: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(232,245,233,0.25)", marginBottom: 5 }}>Assignment</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 8,
                  background: selIssue ? "rgba(103,232,249,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selIssue ? "rgba(103,232,249,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: selIssue ? "#67e8f9" : "rgba(232,245,233,0.2)", fontSize: "0.75rem",
                }}>
                  {selIssue ? ((selIssue.title || selIssue.description)?.slice(0, 30) + "...") : "Select an issue"}
                </span>
                <span style={{ color: "rgba(232,245,233,0.2)" }}>→</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 8,
                  background: selVol ? "rgba(134,239,172,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selVol ? "rgba(134,239,172,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: selVol ? "#86efac" : "rgba(232,245,233,0.2)", fontSize: "0.75rem",
                }}>
                  {selVol ? selVol.name : "Select a responder"}
                </span>
              </div>
            </div>
            <button
              disabled={!selIssue || !selVol || assigning}
              onClick={doAssign}
              style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: selIssue && selVol ? "linear-gradient(135deg,#86efac,#4ade80)" : "rgba(255,255,255,0.04)",
                color: selIssue && selVol ? "#080e0a" : "rgba(232,245,233,0.2)",
                fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "0.82rem",
                cursor: selIssue && selVol ? "pointer" : "not-allowed", transition: "all 0.2s",
              }}
            >
              {assigning ? "Deploying..." : "Deploy Responder"}
            </button>
          </div>

        </main>
      </div>

      {/* ── MODAL ── */}
      {modal.open && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(8,14,10,0.88)", backdropFilter: "blur(12px)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#0d1f12", border: "1px solid rgba(134,239,172,0.12)",
            borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 480,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1.15rem", color: "#f0fdf4" }}>Report Incident</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(232,245,233,0.3)", marginTop: 3 }}>Submit a new field report</div>
              </div>
              <button onClick={closeModal} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", color: "rgba(232,245,233,0.4)",
                cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Village select */}
              <div>
                <label style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.3)", display: "block", marginBottom: 6 }}>Village</label>
                <select
                  value={form.village}
                  onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px", color: "#f0fdf4",
                    fontFamily: "'Outfit',sans-serif", fontSize: "0.85rem", outline: "none",
                  }}
                >
                  {VILLAGES_DATA.map((v) => (
                    <option key={v.id} value={String(v.id)} style={{ background: "#0d1f12" }}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Category + Severity row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.3)", display: "block", marginBottom: 6 }}>Category</label>
                  <select
                    value={form.cat}
                    onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 14px", color: "#f0fdf4",
                      fontFamily: "'Outfit',sans-serif", fontSize: "0.85rem", outline: "none",
                    }}
                  >
                    {Object.keys(CAT_COLORS).map((c) => (
                      <option key={c} value={c} style={{ background: "#0d1f12" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.3)", display: "block", marginBottom: 6 }}>Severity</label>
                  <select
                    value={form.sev}
                    onChange={(e) => setForm((f) => ({ ...f, sev: e.target.value }))}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 14px", color: "#f0fdf4",
                      fontFamily: "'Outfit',sans-serif", fontSize: "0.85rem", outline: "none",
                    }}
                  >
                    {["low", "medium", "high"].map((s) => (
                      <option key={s} value={s} style={{ background: "#0d1f12" }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.3)", display: "block", marginBottom: 6 }}>Description</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  placeholder="Describe the incident..."
                  rows={3}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px", color: "#f0fdf4",
                    fontFamily: "'Outfit',sans-serif", fontSize: "0.85rem", outline: "none",
                    resize: "vertical", lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={closeModal} style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)", background: "none",
                  color: "rgba(232,245,233,0.4)", fontFamily: "'Outfit',sans-serif",
                  fontSize: "0.82rem", cursor: "pointer",
                }}>Cancel</button>
                <button onClick={submitIssue} style={{
                  flex: 2, padding: "12px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "white", fontFamily: "'Outfit',sans-serif",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                }}>🚨 Submit Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast.show && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#0d1f12", border: "1px solid rgba(134,239,172,0.2)",
          borderRadius: 12, padding: "12px 22px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 3000,
          animation: "adm-up 0.3s ease forwards",
        }}>
          <span style={{ fontSize: "1.1rem" }}>{toast.icon}</span>
          <span style={{ fontSize: "0.85rem", color: "#f0fdf4", fontWeight: 500 }}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
