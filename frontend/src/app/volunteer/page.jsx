"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import VILLAGES_DATA from "@/data/villages";

const categoryColor = {
  flood: "#67e8f9", medical: "#f87171", road: "#fbbf24",
  food: "#86efac", education: "#c084fc", electricity: "#fb923c",
  water: "#38bdf8", other: "#94a3b8",
};
const categoryLabel = {
  flood: "🌊 Flood", medical: "🏥 Medical", road: "🛣️ Road",
  food: "🌾 Food", education: "📚 Education", electricity: "⚡ Electricity",
  water: "💧 Water", other: "📋 Other",
};
const severityLabel = ["", "Low", "Low-Med", "Medium", "High", "Critical"];
const severityColor = ["", "#86efac", "#a3e635", "#fbbf24", "#fb923c", "#f87171"];

function timeAgo(date) {
  if (!date) return "Just now";
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-IN");
}

// ── Find village coords from name ─────────────────────────────────────────────
function findVillageCoords(nameOrLocation) {
  if (!nameOrLocation) return null;
  const lower = nameOrLocation.toLowerCase();
  const match = VILLAGES_DATA.find(v =>
    lower.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(lower)
  );
  return match ? { lat: match.lat, lng: match.lng, name: match.name } : null;
}

// ── Task Map Component ────────────────────────────────────────────────────────
function TaskMap({ village, location }) {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const [info, setInfo] = useState(null); // { distance, duration }
  const [gpsError, setGpsError] = useState(false);

  const dest = findVillageCoords(village || location);

  useEffect(() => {
    if (!dest || !mapRef.current) return;
    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
        .setView([dest.lat, dest.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInst.current = map;

      // Destination marker — red pulsing pin
      const destIcon = L.divIcon({
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#ef4444;border:3px solid white;
          box-shadow:0 0 0 4px rgba(239,68,68,0.3),0 2px 8px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9], className: "",
      });
      L.marker([dest.lat, dest.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b style="font-family:'Outfit',sans-serif">${dest.name}</b><br><span style="font-size:11px;color:#94a3b8">Destination</span>`)
        .openPopup();

      // Try to get volunteer's GPS and draw route
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;

            // Volunteer marker — blue dot
            const volIcon = L.divIcon({
              html: `<div style="
                width:14px;height:14px;border-radius:50%;
                background:#67e8f9;border:3px solid white;
                box-shadow:0 0 0 3px rgba(103,232,249,0.3),0 2px 6px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [14, 14], iconAnchor: [7, 7], className: "",
            });
            L.marker([lat, lng], { icon: volIcon })
              .addTo(map)
              .bindPopup(`<span style="font-family:'Outfit',sans-serif;font-size:12px">📍 Your location</span>`);

            // Fetch route from OSRM (free, no key)
            try {
              const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
              );
              const data = await res.json();
              if (data.routes?.[0]) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

                // Draw route polyline
                L.polyline(coords, {
                  color: "#fbbf24", weight: 4, opacity: 0.85,
                  dashArray: null,
                }).addTo(map);

                // Fit map to show both points
                map.fitBounds(L.latLngBounds([[lat, lng], [dest.lat, dest.lng]]).pad(0.2));

                // Distance + ETA
                const km = (route.distance / 1000).toFixed(1);
                const mins = Math.ceil(route.duration / 60);
                setInfo({ distance: `${km} km`, duration: mins < 60 ? `~${mins} min` : `~${Math.round(mins/60)}h ${mins%60}m` });
              }
            } catch {
              // OSRM failed — just fit to destination
              map.setView([dest.lat, dest.lng], 13);
            }
          },
          () => {
            setGpsError(true);
            map.setView([dest.lat, dest.lng], 13);
          },
          { timeout: 6000 }
        );
      } else {
        setGpsError(true);
      }
    };

    init();
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [dest?.lat, dest?.lng]);

  if (!dest) return (
    <div style={{ padding: "14px 0", fontSize: "0.78rem", color: "rgba(226,237,228,0.3)" }}>
      📍 Location not matched to a known village
    </div>
  );

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Info bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#67e8f9" }} />
            <span style={{ fontSize: "0.68rem", color: "rgba(226,237,228,0.4)" }}>You</span>
          </div>
          <span style={{ fontSize: "0.68rem", color: "rgba(226,237,228,0.2)" }}>→</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ fontSize: "0.68rem", color: "rgba(226,237,228,0.4)" }}>{dest.name}</span>
          </div>
        </div>
        {info && (
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 600 }}>{info.distance}</span>
            <span style={{ fontSize: "0.72rem", color: "rgba(226,237,228,0.4)" }}>{info.duration}</span>
          </div>
        )}
        {gpsError && (
          <span style={{ fontSize: "0.68rem", color: "rgba(226,237,228,0.25)" }}>GPS unavailable · showing destination</span>
        )}
      </div>

      {/* Map */}
      <div style={{
        height: 220, borderRadius: 12, overflow: "hidden",
        border: "1px solid rgba(251,191,36,0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

export default function VolunteerPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("active");
  const [completing, setCompleting] = useState(false);
  const [available, setAvailable] = useState(true);
  const user = auth.currentUser;

  // ── Real-time listener: tasks assigned to this volunteer ──────────────────
  useEffect(() => {
    // Match by volunteer name (since admin assigns by name from VOLUNTEERS list)
    // We query all assigned reports and filter client-side by name
    const q = query(
      collection(db, "reports"),
      where("assigned", "==", true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const userName = user?.displayName || "";
      const docs = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          assignedAt: d.data().assignedAt?.toDate
            ? timeAgo(d.data().assignedAt.toDate())
            : d.data().createdAt?.toDate
            ? timeAgo(d.data().createdAt.toDate())
            : "Just now",
        }))
        // show tasks assigned to this user, or all if not logged in (demo mode)
        .filter((d) => !userName || d.assignedTo === userName);
      setTasks(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "active" ? t.status === "assigned" : t.status === "resolved"
  );

  const activeCount    = tasks.filter((t) => t.status === "assigned").length;
  const completedCount = tasks.filter((t) => t.status === "resolved").length;

  const handleComplete = async (taskId) => {
    setCompleting(true);
    try {
      await updateDoc(doc(db, "reports", taskId), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
      });
      setSelected(null);
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #09100b; color: #e2ede4; font-family: 'Outfit', sans-serif; min-height: 100vh; }
        .vl-wrap { min-height: 100vh; display: grid; grid-template-columns: 220px 1fr; }
        .vl-sidebar { background: rgba(255,255,255,0.015); border-right: 1px solid rgba(251,191,36,0.07); padding: 28px 16px; display: flex; flex-direction: column; gap: 4px; position: sticky; top: 0; height: 100vh; }
        .vl-logo { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.05rem; color: #fbbf24; margin-bottom: 32px; padding: 0 8px; }
        .vl-logo span { opacity: 0.3; color: #e2ede4; font-weight: 300; }
        .vl-nav { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; font-size: 0.83rem; color: rgba(226,237,228,0.38); cursor: pointer; transition: all 0.2s; border: none; background: none; width: 100%; text-align: left; font-family: 'Outfit', sans-serif; }
        .vl-nav:hover { color: #e2ede4; background: rgba(255,255,255,0.04); }
        .vl-nav.active { color: #fbbf24; background: rgba(251,191,36,0.08); }
        .vl-sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(251,191,36,0.07); }
        .vl-user { display: flex; align-items: center; gap: 10px; padding: 8px; }
        .vl-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #09100b; flex-shrink: 0; }
        .vl-user-name { font-size: 0.8rem; font-weight: 500; color: #e2ede4; }
        .vl-user-role { font-size: 0.63rem; color: rgba(226,237,228,0.28); text-transform: uppercase; letter-spacing: 0.08em; }
        .vl-avail { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; margin-top: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
        .vl-avail-label { font-size: 0.72rem; color: rgba(226,237,228,0.35); letter-spacing: 0.06em; text-transform: uppercase; }
        .vl-main { padding: 36px 40px; overflow-y: auto; }
        .vl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; opacity: 0; animation: vlUp 0.5s ease 0.1s forwards; }
        .vl-greeting { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(226,237,228,0.25); margin-bottom: 5px; }
        .vl-title { font-family: 'Fraunces', serif; font-weight: 400; font-size: 1.7rem; letter-spacing: -0.01em; color: #f0f7f1; }
        .vl-title em { font-style: italic; color: #fbbf24; }
        .vl-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; opacity: 0; animation: vlUp 0.5s ease 0.15s forwards; }
        .vl-stat { padding: 18px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
        .vl-stat-num { font-family: 'Fraunces', serif; font-weight: 400; font-size: 2rem; line-height: 1; margin-bottom: 4px; }
        .vl-stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(226,237,228,0.3); }
        .vl-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 4px; margin-bottom: 20px; width: fit-content; opacity: 0; animation: vlUp 0.5s ease 0.2s forwards; }
        .vl-tab { padding: 7px 18px; border-radius: 7px; border: none; font-family: 'Outfit', sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; color: rgba(226,237,228,0.38); background: none; }
        .vl-tab.active { background: rgba(251,191,36,0.12); color: #fbbf24; }
        .vl-tab:hover:not(.active) { color: #e2ede4; }
        .vl-tasks { display: flex; flex-direction: column; gap: 10px; opacity: 0; animation: vlUp 0.5s ease 0.25s forwards; }
        .vl-task { border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px 22px; cursor: pointer; transition: all 0.22s ease; background: rgba(255,255,255,0.015); position: relative; overflow: hidden; }
        .vl-task::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; opacity: 0; transition: opacity 0.2s; }
        .vl-task:hover { border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.03); }
        .vl-task:hover::before { opacity: 1; background: #fbbf24; }
        .vl-task.selected { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.05); }
        .vl-task.selected::before { opacity: 1; background: #fbbf24; }
        .vl-task.done { opacity: 0.5; }
        .vl-task-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .vl-task-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .vl-cat-badge { font-size: 0.63rem; padding: 3px 9px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
        .vl-sev-badge { font-size: 0.63rem; padding: 3px 9px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; border: 1px solid; }
        .vl-task-title { font-family: 'Fraunces', serif; font-weight: 400; font-size: 1.05rem; color: #f0f7f1; margin-bottom: 6px; }
        .vl-task-loc { font-size: 0.78rem; color: rgba(226,237,228,0.38); display: flex; align-items: center; gap: 5px; }
        .vl-task-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .vl-time { font-size: 0.68rem; color: rgba(226,237,228,0.22); }
        .vl-done-badge { font-size: 0.62rem; padding: 3px 9px; border-radius: 3px; background: rgba(134,239,172,0.08); border: 1px solid rgba(134,239,172,0.2); color: #86efac; text-transform: uppercase; }
        .vl-detail { margin-top: 10px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); opacity: 0; animation: vlUp 0.3s ease forwards; }
        .vl-detail-desc { font-size: 0.85rem; font-weight: 300; line-height: 1.7; color: rgba(226,237,228,0.5); margin-bottom: 16px; }
        .vl-detail-actions { display: flex; gap: 10px; }
        .vl-btn-primary { flex: 1; padding: 11px; border: none; border-radius: 10px; background: linear-gradient(135deg, #fbbf24, #f59e0b); font-family: 'Outfit', sans-serif; font-weight: 500; font-size: 0.82rem; letter-spacing: 0.06em; text-transform: uppercase; color: #09100b; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
        .vl-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .vl-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .vl-btn-secondary { padding: 11px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: none; font-family: 'Outfit', sans-serif; font-size: 0.82rem; color: rgba(226,237,228,0.4); cursor: pointer; transition: all 0.2s; }
        .vl-btn-secondary:hover { color: #e2ede4; border-color: rgba(255,255,255,0.18); }
        .vl-completing { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px 0; }
        .vl-spinner { width: 28px; height: 28px; border: 2px solid rgba(251,191,36,0.12); border-top-color: #fbbf24; border-radius: 50%; animation: vlSpin 0.7s linear infinite; }
        .vl-comp-text { font-size: 0.8rem; color: rgba(226,237,228,0.38); }
        .vl-empty { padding: 48px; text-align: center; border: 1px dashed rgba(255,255,255,0.06); border-radius: 14px; }
        .vl-empty-icon { font-size: 2rem; margin-bottom: 12px; opacity: 0.4; }
        .vl-empty-text { font-size: 0.82rem; color: rgba(226,237,228,0.22); line-height: 1.6; }
        @media (max-width: 768px) { .vl-wrap { grid-template-columns: 1fr; } .vl-sidebar { display: none; } .vl-main { padding: 20px 16px; } }
        @keyframes vlUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes vlSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="vl-wrap">
        <aside className="vl-sidebar">
          <div className="vl-logo">Sanrakshan<span>.</span></div>
          <button className="vl-nav active"><span>△</span> Dashboard</button>
          <button className="vl-nav"><span>◉</span> My Tasks</button>
          <button className="vl-nav"><span>✓</span> Completed</button>
          <button className="vl-nav"><span>◷</span> History</button>
          <div className="vl-avail" style={{ marginTop: 12 }}>
            <span className="vl-avail-label">Available</span>
            <button
              onClick={() => setAvailable((v) => !v)}
              style={{
                width: 36, height: 20, borderRadius: 100, border: "none", cursor: "pointer",
                position: "relative", flexShrink: 0,
                background: available ? "rgba(134,239,172,0.4)" : "rgba(255,255,255,0.08)",
                transition: "background 0.25s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, width: 14, height: 14, borderRadius: "50%",
                background: "white", transition: "left 0.25s ease",
                left: available ? 19 : 3,
              }} />
            </button>
          </div>
          <div className="vl-sidebar-footer">
            <div className="vl-user">
              <div className="vl-avatar">{user?.displayName?.[0] || "V"}</div>
              <div>
                <div className="vl-user-name">{user?.displayName || "Volunteer"}</div>
                <div className="vl-user-role">Volunteer</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="vl-main">
          <div className="vl-header">
            <div>
              <div className="vl-greeting">Volunteer Dashboard</div>
              <div className="vl-title">Your <em>Tasks</em></div>
            </div>
            <div style={{
              fontSize: "0.72rem", padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${available ? "rgba(134,239,172,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: available ? "#86efac" : "rgba(226,237,228,0.3)",
              background: available ? "rgba(134,239,172,0.06)" : "transparent",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {available ? "● Available" : "○ Unavailable"}
            </div>
          </div>

          <div className="vl-stats">
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#fbbf24" }}>{activeCount}</div>
              <div className="vl-stat-label">Active Tasks</div>
            </div>
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#86efac" }}>{completedCount}</div>
              <div className="vl-stat-label">Completed</div>
            </div>
            <div className="vl-stat">
              <div className="vl-stat-num" style={{ color: "#67e8f9" }}>{tasks.length}</div>
              <div className="vl-stat-label">Total Assigned</div>
            </div>
          </div>

          <div className="vl-tabs">
            {[["active", "Active"], ["completed", "Completed"], ["all", "All"]].map(([val, label]) => (
              <button key={val} className={`vl-tab ${filter === val ? "active" : ""}`} onClick={() => { setFilter(val); setSelected(null); }}>
                {label}
              </button>
            ))}
          </div>

          <div className="vl-tasks">
            {loading ? (
              <div className="vl-empty">
                <div className="vl-spinner" style={{ margin: "0 auto 12px" }} />
                <div className="vl-empty-text">Loading your tasks...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="vl-empty">
                <div className="vl-empty-icon">📋</div>
                <div className="vl-empty-text">
                  No {filter === "all" ? "" : filter} tasks right now.<br />
                  Admin will assign tasks based on your skills.
                </div>
              </div>
            ) : filtered.map((task) => (
              <div
                key={task.id}
                className={`vl-task ${selected === task.id ? "selected" : ""} ${task.status === "resolved" ? "done" : ""}`}
                onClick={() => setSelected(selected === task.id ? null : task.id)}
              >
                <div className="vl-task-top">
                  <div style={{ flex: 1 }}>
                    <div className="vl-task-meta">
                      <span className="vl-cat-badge" style={{ color: categoryColor[task.category] || "#94a3b8", background: `${categoryColor[task.category] || "#94a3b8"}15`, border: `1px solid ${categoryColor[task.category] || "#94a3b8"}30` }}>
                        {categoryLabel[task.category] || task.category}
                      </span>
                      {task.severity && (
                        <span className="vl-sev-badge" style={{ color: severityColor[task.severity] || "#fbbf24", borderColor: `${severityColor[task.severity] || "#fbbf24"}40`, background: `${severityColor[task.severity] || "#fbbf24"}10` }}>
                          {severityLabel[task.severity] || `Sev ${task.severity}`}
                        </span>
                      )}
                    </div>
                    <div className="vl-task-title">{task.title || task.description?.slice(0, 60)}</div>
                    <div className="vl-task-loc"><span>📍</span> {task.village || task.location}</div>
                  </div>
                  <div className="vl-task-right">
                    {task.status === "resolved"
                      ? <span className="vl-done-badge">✓ Done</span>
                      : <span style={{ fontSize: "0.65rem", padding: "3px 9px", borderRadius: 4, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>Assigned</span>
                    }
                    <span className="vl-time">{task.assignedAt}</span>
                  </div>
                </div>

                {selected === task.id && (
                  <div className="vl-detail">
                    <div className="vl-detail-desc">{task.description}</div>
                    {task.affected && (
                      <div style={{ fontSize: "0.78rem", color: "rgba(226,237,228,0.35)", marginBottom: 14 }}>
                        👥 ~{task.affected} people affected
                      </div>
                    )}

                    {/* DESTINATION MAP */}
                    {task.status === "assigned" && (
                      <TaskMap village={task.village} location={task.location} />
                    )}

                    {task.status === "assigned" && (
                      completing ? (
                        <div className="vl-completing">
                          <div className="vl-spinner" />
                          <div className="vl-comp-text">Marking as complete...</div>
                        </div>
                      ) : (
                        <div className="vl-detail-actions">
                          <button className="vl-btn-primary" onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }}>
                            ✓ Mark as Complete
                          </button>
                          <button className="vl-btn-secondary" onClick={(e) => { e.stopPropagation(); window.open(`https://maps.google.com?q=${encodeURIComponent(task.village || task.location)}`); }}>
                            🗺 Open in Maps
                          </button>
                        </div>
                      )
                    )}
                    {task.status === "resolved" && (
                      <div style={{ fontSize: "0.78rem", color: "rgba(134,239,172,0.5)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>✓</span> Task completed · Thank you for your service
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
