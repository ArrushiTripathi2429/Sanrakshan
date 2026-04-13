"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, orderBy, query, where,
  doc, updateDoc, addDoc, serverTimestamp, getDocs  
} from "firebase/firestore";

import VILLAGES_DATA from "@/data/villages";
import DownloadReport from "@/components/DownloadReport";
import CommunityImpactBoard from "@/components/CommunityImpactBoard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

// ── Constants 
const VOL_COLORS = ["#6366f1","#3b82f6","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#86efac","#f87171"];
const initials = (name) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
const sevDot   = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
const CAT_COLORS = { flood:"#67e8f9", medical:"#f87171", road:"#fbbf24", food:"#86efac", education:"#c084fc", electricity:"#fb923c", water:"#38bdf8", other:"#94a3b8" };
const STAT_COLORS = ["#f87171","#67e8f9","#86efac"];
const sc  = s => s==="high" ? "#f87171" : s==="medium" ? "#fbbf24" : "#86efac";
const sb  = s => s==="high" ? "rgba(239,68,68,0.12)" : s==="medium" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)";
const sbd = s => s==="high" ? "rgba(239,68,68,0.3)"  : s==="medium" ? "rgba(245,158,11,0.3)"  : "rgba(34,197,94,0.3)";
const scoreBadge = n => n >= 70
  ? { bg:"rgba(239,68,68,0.12)",  bd:"rgba(239,68,68,0.3)",  c:"#f87171" }
  : n >= 40
  ? { bg:"rgba(245,158,11,0.12)", bd:"rgba(245,158,11,0.3)", c:"#fbbf24" }
  : { bg:"rgba(34,197,94,0.12)",  bd:"rgba(34,197,94,0.3)",  c:"#86efac" };

// ── Tooltip 
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d1f12", border:"1px solid rgba(134,239,172,0.15)", borderRadius:10, padding:"8px 14px" }}>
      <div style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.4)", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:"0.9rem", fontWeight:700, color:"#86efac" }}>{payload[0].value}</div>
    </div>
  );
}

// ── Charts 
function ChartsSection({ issues }) {
  const catData = Object.entries(
    issues.reduce((a, i) => { const c = i.category || "other"; a[c] = (a[c] || 0) + 1; return a; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("en-IN", { day:"numeric", month:"short" }),
      count: issues.filter(x => x.createdAt?.toDate && x.createdAt.toDate().toDateString() === d.toDateString()).length,
    };
  });

  const statData = [
    { name:"Pending",  value: issues.filter(i => !i.assigned && i.status !== "resolved").length },
    { name:"Assigned", value: issues.filter(i =>  i.assigned && i.status !== "resolved").length },
    { name:"Resolved", value: issues.filter(i =>  i.status === "resolved").length },
  ].filter(d => d.value > 0);

  const card = { background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"20px 22px" };
  const lbl  = { fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.15em", color:"rgba(232,245,233,0.3)", marginBottom:14 };

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <span style={{ width:3, height:14, background:"#c084fc", borderRadius:2, display:"inline-block" }}/>
        <span style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.18em", color:"rgba(232,245,233,0.35)" }}>
          Analytics · {issues.length} total reports
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 260px", gap:16 }}>
        {/* By Category */}
        <div style={card}>
          <div style={lbl}>By Category</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={catData} barSize={20}>
              <XAxis dataKey="name" tick={{ fill:"rgba(232,245,233,0.35)", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"rgba(232,245,233,0.25)", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTip/>} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
              <Bar dataKey="count" radius={[5,5,0,0]}>
                {catData.map(e => <Cell key={e.name} fill={CAT_COLORS[e.name] || "#94a3b8"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Last 7 Days */}
        <div style={card}>
          <div style={lbl}>Last 7 Days</div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={trendData}>
              <XAxis dataKey="label" tick={{ fill:"rgba(232,245,233,0.35)", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"rgba(232,245,233,0.25)", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Line type="monotone" dataKey="count" stroke="#fbbf24" strokeWidth={2.5} dot={{ fill:"#fbbf24", r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status */}
        <div style={card}>
          <div style={lbl}>Status</div>
          {statData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={statData} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value">
                    {statData.map((_, i) => <Cell key={i} fill={STAT_COLORS[i]}/>)}
                  </Pie>
                  <Tooltip content={<ChartTip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
                {statData.map((d, i) => (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:STAT_COLORS[i] }}/>
                      <span style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.4)" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:STAT_COLORS[i] }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:"0.78rem", color:"rgba(232,245,233,0.2)" }}>No data yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Volunteer Leaderboard 
function VolunteerLeaderboard({ volunteers, issues }) {
  // Compute resolved count per volunteer name
  const resolvedMap = issues
    .filter(i => i.status === "resolved" && i.assignedTo)
    .reduce((acc, i) => { acc[i.assignedTo] = (acc[i.assignedTo] || 0) + 1; return acc; }, {});

  const assignedMap = issues
    .filter(i => i.assigned && i.assignedTo)
    .reduce((acc, i) => { acc[i.assignedTo] = (acc[i.assignedTo] || 0) + 1; return acc; }, {});

  const ranked = [...volunteers]
    .map(v => ({
      ...v,
      resolved: resolvedMap[v.name] || 0,
      assigned: assignedMap[v.name] || 0,
      score: (resolvedMap[v.name] || 0) * 10 + (assignedMap[v.name] || 0) * 3,
    }))
    .sort((a, b) => b.score - a.score);

  const medalColors = ["#fbbf24", "#94a3b8", "#f59e0b"];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      {ranked.length === 0 ? (
        <div style={{ padding:"40px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"1.8rem", marginBottom:10, opacity:0.3 }}>🏆</div>
          <div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.22)", lineHeight:1.6 }}>
            No activity yet.<br/>Leaderboard updates as volunteers resolve issues.
          </div>
        </div>
      ) : (
        <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
          {ranked.map((vol, idx) => {
            const isTop3 = idx < 3;
            const barWidth = ranked[0].score > 0 ? (vol.score / ranked[0].score) * 100 : 0;
            return (
              <div key={vol.id} style={{
                padding:"14px 18px",
                borderRadius:13,
                border: isTop3
                  ? `1px solid ${medalColors[idx]}30`
                  : "1px solid rgba(255,255,255,0.05)",
                background: isTop3
                  ? `${medalColors[idx]}08`
                  : "rgba(255,255,255,0.015)",
                position:"relative",
                overflow:"hidden",
                transition:"all 0.2s",
              }}>
                {/* Score bar */}
                <div style={{
                  position:"absolute", bottom:0, left:0,
                  height:2, width:`${barWidth}%`,
                  background: isTop3 ? medalColors[idx] : "rgba(134,239,172,0.2)",
                  borderRadius:"0 2px 0 0",
                  transition:"width 0.6s ease",
                }}/>

                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {/* Rank */}
                  <div style={{ width:28, textAlign:"center", flexShrink:0 }}>
                    {isTop3 ? (
                      <span style={{ fontSize:"1.1rem" }}>{medals[idx]}</span>
                    ) : (
                      <span style={{ fontSize:"0.75rem", fontWeight:700, color:"rgba(232,245,233,0.2)" }}>#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width:36, height:36, borderRadius:"50%", flexShrink:0,
                    background: vol.color,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.78rem", fontWeight:700, color:"#080e0a",
                    boxShadow: isTop3 ? `0 0 10px ${vol.color}60` : "none",
                  }}>{vol.init}</div>

                  {/* Name + stats */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.84rem", fontWeight:600, color:"#f0fdf4", marginBottom:4 }}>{vol.name}</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.67rem", color:"#86efac" }}>✓ {vol.resolved} resolved</span>
                      <span style={{ fontSize:"0.67rem", color:"#67e8f9" }}>⚡ {vol.assigned} assigned</span>
                      {vol.skills?.length > 0 && (
                        <span style={{ fontSize:"0.67rem", color:"rgba(232,245,233,0.3)" }}>{vol.skills.slice(0, 2).join(", ")}</span>
                      )}
                    </div>
                  </div>

                  {/* Score badge */}
                  <div style={{ flexShrink:0, textAlign:"right" }}>
                    <div style={{
                      fontSize:"1rem", fontWeight:700,
                      color: isTop3 ? medalColors[idx] : "rgba(232,245,233,0.35)",
                      fontFamily:"'Fraunces',serif",
                    }}>{vol.score}</div>
                    <div style={{ fontSize:"0.6rem", color:"rgba(232,245,233,0.2)", textTransform:"uppercase", letterSpacing:"0.1em" }}>pts</div>
                  </div>

                  {/* Avail dot */}
                  <div style={{
                    width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background: vol.avail ? "#22c55e" : "#f59e0b",
                    boxShadow: vol.avail ? "0 0 6px #22c55e" : "none",
                  }}/>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ padding:"10px 4px", display:"flex", gap:16, borderTop:"1px solid rgba(255,255,255,0.04)", marginTop:4 }}>
            <span style={{ fontSize:"0.65rem", color:"rgba(232,245,233,0.25)" }}>🏆 Score = resolved × 10 + assigned × 3</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weather + Early Warning 
function WeatherAndAlerts() {
  const [weather, setWeather]       = useState(null);
  const [newsAlerts, setNewsAlerts] = useState([]);
  const [scanning, setScanning]     = useState(false);
  const [expanded, setExpanded]     = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/weather/raebareli")
      .then(r => r.json())
      .then(d => setWeather(d))
      .catch(() => {});
  }, []);

  const scanNews = async () => {
    setScanning(true);
    try {
      const res  = await fetch("http://localhost:8000/api/early-warning/scan", { method:"POST" });
      const data = await res.json();
      if (data.success) setNewsAlerts(data.alerts || []);
    } catch {}
    setScanning(false);
  };

  const riskColor = { low:"#86efac", medium:"#fbbf24", high:"#f87171" };
  const riskBg    = { low:"rgba(134,239,172,0.08)", medium:"rgba(251,191,36,0.08)", high:"rgba(239,68,68,0.08)" };

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>

        {/* WEATHER CARD */}
        {weather && (
          <div style={{ flex:1, minWidth:260, background:riskBg[weather.flood_risk] || "rgba(255,255,255,0.02)", border:`1px solid ${riskColor[weather.flood_risk] || "rgba(255,255,255,0.07)"}40`, borderRadius:14, padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:"1.1rem" }}></span>
                <span style={{ fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.4)" }}>Weather · Raebareli</span>
              </div>
              <span style={{ fontSize:"0.65rem", padding:"2px 10px", borderRadius:100, background:riskBg[weather.flood_risk], border:`1px solid ${riskColor[weather.flood_risk]}40`, color:riskColor[weather.flood_risk], fontWeight:700, textTransform:"uppercase" }}>
                {weather.flood_risk} flood risk
              </span>
            </div>
            {weather.alert && (
              <div style={{ fontSize:"0.78rem", color:riskColor[weather.alert.level], marginBottom:8, lineHeight:1.5 }}>
                {weather.alert.message}
              </div>
            )}
            <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
              {weather.forecast?.slice(0, 4).map(d => (
                <div key={d.date} style={{ flexShrink:0, textAlign:"center", padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:`1px solid ${d.risk==="high"?"rgba(239,68,68,0.2)":d.risk==="medium"?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.06)"}` }}>
                  <div style={{ fontSize:"0.62rem", color:"rgba(232,245,233,0.35)", marginBottom:3 }}>{d.date.slice(5)}</div>
                  <div style={{ fontSize:"0.82rem", fontWeight:700, color:riskColor[d.risk] }}>{d.rainfall_mm}mm</div>
                  <div style={{ fontSize:"0.6rem", color:"rgba(232,245,233,0.3)" }}>{d.rain_prob}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EARLY WARNING CARD */}
        <div style={{ flex:1, minWidth:260, background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"14px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontSize:"1.1rem" }}></span>
              <span style={{ fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.4)" }}>News Early Warning</span>
            </div>
            <button onClick={scanNews} disabled={scanning} style={{ background:"rgba(134,239,172,0.08)", border:"1px solid rgba(134,239,172,0.2)", color:"#86efac", fontSize:"0.68rem", fontWeight:600, padding:"4px 12px", borderRadius:7, cursor:scanning?"not-allowed":"pointer", fontFamily:"'Outfit',sans-serif" }}>
              {scanning ? "Scanning..." : " Scan News"}
            </button>
          </div>
          {newsAlerts.length === 0 ? (
            <div style={{ fontSize:"0.75rem", color:"rgba(232,245,233,0.25)", lineHeight:1.6 }}>
              Click "Scan News" to check Google News for Raebareli disaster alerts via Gemini AI.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {newsAlerts.slice(0, expanded ? undefined : 2).map((a, i) => (
                <div key={i} style={{ padding:"8px 12px", background:"rgba(255,255,255,0.02)", borderRadius:8, border:`1px solid ${riskColor[a.severity]||"#94a3b8"}25` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:"0.72rem", fontWeight:600, color:riskColor[a.severity]||"#94a3b8" }}>{a.category?.toUpperCase()} · {a.severity}</span>
                    {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" style={{ fontSize:"0.62rem", color:"rgba(232,245,233,0.3)" }}>↗ source</a>}
                  </div>
                  <div style={{ fontSize:"0.78rem", color:"#f0fdf4", marginBottom:2 }}>{a.title}</div>
                  <div style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.4)" }}>{a.summary}</div>
                </div>
              ))}
              {newsAlerts.length > 2 && (
                <button onClick={() => setExpanded(e => !e)} style={{ background:"none", border:"none", color:"rgba(232,245,233,0.3)", fontSize:"0.7rem", cursor:"pointer", textAlign:"left", padding:0 }}>
                  {expanded ? "Show less" : `+${newsAlerts.length - 2} more alerts`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 

// ── Data Ingestion: CSV Upload + Auto Report Generator
function DataIngestionSection({ showToast }) {
  const [csvTab, setCsvTab] = useState("csv"); // "csv" | "report"
  const [csvData, setCsvData] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [reportForm, setReportForm] = useState({
    date: new Date().toISOString().split("T")[0],
    village: "", volunteers: "", impact: "", category: "flood",
    description: "", affected: "", severity: "medium",
  });
  const [generatedReport, setGeneratedReport] = useState(null);

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim());
        return headers.reduce((obj, h, i) => { obj[h] = vals[i] || ""; return obj; }, {});
      }).filter(r => r.village || r.location);
      setCsvData(rows);
    };
    reader.readAsText(file);
  };

  const importCSV = async () => {
    if (!csvData.length) return;
    setImporting(true);
    let count = 0;
    try {
      for (const row of csvData) {
        await addDoc(collection(db, "reports"), {
          title: row.title || row.issue || `${row.category || "Issue"} in ${row.village || row.location}`,
          category: row.category || "other",
          location: row.village || row.location || "",
          village: row.village || row.location || "",
          severity: row.severity || "medium",
          affected: row.affected || row.affected_count || "",
          description: row.description || "",
          status: "pending",
          assigned: false,
          fieldWorkerName: "CSV Import",
          fieldWorkerId: "csv_import",
          createdAt: serverTimestamp(),
          source: "csv_import",
        });
        count++;
      }
      showToast("📊", `${count} records imported successfully`);
      setCsvData([]);
      setCsvFileName("");
    } catch (e) {
      console.error(e);
      showToast("❌", "Import failed, check console");
    }
    setImporting(false);
  };

  const generateReport = () => {
    const r = reportForm;
    if (!r.village || !r.description) return;
    const report = `SANRAKSHAN FIELD REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date         : ${r.date}
Village      : ${r.village}
Category     : ${r.category.toUpperCase()}
Severity     : ${r.severity.toUpperCase()}
Affected     : ~${r.affected || "N/A"} people
Volunteers   : ${r.volunteers || "None deployed"}

SITUATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${r.description}

IMPACT ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${r.impact || "No impact data provided."}

Generated by Sanrakshan · Raebareli District
Report Date: ${new Date().toLocaleString("en-IN")}`;
    setGeneratedReport(report);
  };

  const downloadReport = () => {
    const blob = new Blob([generatedReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sanrakshan-report-${reportForm.village}-${reportForm.date}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const card = { background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, overflow:"hidden", marginBottom:20 };
  const label = { fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(232,245,233,0.3)", marginBottom:5, display:"block" };
  const input = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#f0fdf4", fontFamily:"'Outfit',sans-serif", fontSize:"0.82rem", outline:"none" };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:3, height:14, background:"#38bdf8", borderRadius:2, display:"inline-block" }}/>
          <span style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.18em", color:"rgba(232,245,233,0.35)" }}>Data Ingestion · NGO & Survey Data</span>
        </div>
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:3 }}>
          {[["csv"," CSV Import"],["report"," Auto Report"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setCsvTab(tab)} style={{ padding:"6px 16px", borderRadius:7, border:"none", fontFamily:"'Outfit',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:csvTab===tab?"rgba(56,189,248,0.15)":"transparent", color:csvTab===tab?"#38bdf8":"rgba(232,245,233,0.35)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CSV TAB */}
      {csvTab === "csv" && (
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"0.78rem", color:"rgba(232,245,233,0.35)", marginBottom:16, lineHeight:1.6 }}>
            Upload CSV files from paper surveys or NGO field reports. Expected columns: <span style={{ color:"#38bdf8", fontFamily:"monospace" }}>village, category, description, severity, affected</span>
          </div>

          {/* Upload area */}
          <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"28px", border:"1px dashed rgba(56,189,248,0.25)", borderRadius:12, background:"rgba(56,189,248,0.03)", cursor:"pointer", marginBottom:16, transition:"all 0.2s" }}>
            <span style={{ fontSize:"1.8rem" }}>📁</span>
            <span style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.5)" }}>{csvFileName || "Click to upload CSV file"}</span>
            <span style={{ fontSize:"0.68rem", color:"rgba(232,245,233,0.25)" }}>Supports .csv files from paper surveys and NGO reports</span>
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display:"none" }}/>
          </label>

          {/* Preview */}
          {csvData.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:"0.68rem", color:"#38bdf8", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.12em" }}>
                ✓ {csvData.length} records detected — preview (first 3):
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {csvData.slice(0, 3).map((row, i) => (
                  <div key={i} style={{ padding:"8px 12px", background:"rgba(56,189,248,0.04)", border:"1px solid rgba(56,189,248,0.12)", borderRadius:8, fontSize:"0.75rem", color:"rgba(232,245,233,0.6)" }}>
                    📍 {row.village || row.location} · {row.category || "other"} · {row.severity || "medium"}
                    {row.description && <span style={{ color:"rgba(232,245,233,0.35)" }}> — {row.description.slice(0, 60)}</span>}
                  </div>
                ))}
                {csvData.length > 3 && <div style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.25)", padding:"4px 12px" }}>+{csvData.length - 3} more rows</div>}
              </div>
            </div>
          )}

          <button onClick={importCSV} disabled={!csvData.length || importing} style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", background:csvData.length?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.04)", color:csvData.length?"#38bdf8":"rgba(232,245,233,0.2)", fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.82rem", cursor:csvData.length?"pointer":"not-allowed", transition:"all 0.2s" }}>
            {importing ? `Importing ${csvData.length} records...` : `Import ${csvData.length || 0} Records to Firestore`}
          </button>
        </div>
      )}

      {/* REPORT TAB */}
      {csvTab === "report" && (
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"0.78rem", color:"rgba(232,245,233,0.35)", marginBottom:16 }}>
            Fill in the details and generate a structured field report automatically.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <span style={label}>Date</span>
              <input type="date" value={reportForm.date} onChange={e => setReportForm(f => ({...f, date:e.target.value}))} style={input}/>
            </div>
            <div>
              <span style={label}>Village</span>
              <input placeholder="e.g. Dalmau" value={reportForm.village} onChange={e => setReportForm(f => ({...f, village:e.target.value}))} style={input}/>
            </div>
            <div>
              <span style={label}>Category</span>
              <select value={reportForm.category} onChange={e => setReportForm(f => ({...f, category:e.target.value}))} style={input}>
                {["flood","medical","road","food","education","electricity","water","other"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <span style={label}>Severity</span>
              <select value={reportForm.severity} onChange={e => setReportForm(f => ({...f, severity:e.target.value}))} style={input}>
                {["low","medium","high"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>People Affected</span>
              <input placeholder="e.g. 200" value={reportForm.affected} onChange={e => setReportForm(f => ({...f, affected:e.target.value}))} style={input}/>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <span style={label}>Volunteers Deployed</span>
            <input placeholder="e.g. Ramesh Kumar, Priya Verma" value={reportForm.volunteers} onChange={e => setReportForm(f => ({...f, volunteers:e.target.value}))} style={input}/>
          </div>
          <div style={{ marginBottom:12 }}>
            <span style={label}>Situation Description *</span>
            <textarea placeholder="Describe the situation on ground..." value={reportForm.description} onChange={e => setReportForm(f => ({...f, description:e.target.value}))} rows={3} style={{...input, resize:"none"}}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <span style={label}>Impact Assessment</span>
            <textarea placeholder="What was the impact? What resources were used?" value={reportForm.impact} onChange={e => setReportForm(f => ({...f, impact:e.target.value}))} rows={2} style={{...input, resize:"none"}}/>
          </div>

          <button onClick={generateReport} disabled={!reportForm.village || !reportForm.description} style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", background:"rgba(56,189,248,0.15)", color:"#38bdf8", fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.82rem", cursor:"pointer", marginBottom:16 }}>
            Generate Report
          </button>

          {generatedReport && (
            <div>
              <pre style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:10, padding:"16px", fontSize:"0.72rem", color:"rgba(232,245,233,0.6)", fontFamily:"monospace", lineHeight:1.8, overflowX:"auto", whiteSpace:"pre-wrap", marginBottom:10 }}>
                {generatedReport}
              </pre>
              <button onClick={downloadReport} style={{ width:"100%", padding:"10px", borderRadius:10, border:"1px solid rgba(56,189,248,0.25)", background:"rgba(56,189,248,0.08)", color:"#38bdf8", fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.82rem", cursor:"pointer" }}>
                ↓ Download Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Village Detail Drawer
function VillageDrawer({ village, onClose, issues, chronicNeeds }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!village) return;
  setLoading(true);
  const q = query(
    collection(db, "villageProfiles"),
    where("cd_block", "==", village.name)
  );
  getDocs(q).then(snap => {
    if (!snap.empty) {
      const profiles = snap.docs.map(d => d.data());
      const agg = {
        total_villages: profiles.length,
        total_population: profiles.reduce((s, p) => s + (p.population || 0), 0),
        total_households: profiles.reduce((s, p) => s + (p.households || 0), 0),
        avg_vulnerability: Math.round(profiles.reduce((s, p) => s + (p.vulnerability_score || 0), 0) / profiles.length),
        no_power: profiles.filter(p => !p.has_power).length,
        no_road: profiles.filter(p => !p.has_pucca_road).length,
        no_anganwadi: profiles.filter(p => !p.has_anganwadi).length,
        no_mobile: profiles.filter(p => !p.has_mobile_coverage).length,
        most_vulnerable: [...profiles].sort((a, b) => b.vulnerability_score - a.vulnerability_score)[0],
        water_sources: [...new Set(profiles.map(p => p.water_source).filter(Boolean))],
      };
      setProfile(agg);
    } else setProfile(null);
    setLoading(false);
  }).catch(() => setLoading(false));
}, [village]);

  if (!village) return null;

  const villageIssues = issues.filter(i =>
    (i.village === village.name || i.location === village.name) && i.status !== "resolved"
  );
  const villageNeeds = chronicNeeds.filter(n =>
    n.village === village.name && n.status === "open"
  );

  const vulnColor = !profile ? "#94a3b8"
    : profile.vulnerability_score >= 70 ? "#f87171"
    : profile.vulnerability_score >= 40 ? "#fbbf24"
    : "#86efac";

  const row = (label, value, color) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.35)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{label}</span>
      <span style={{ fontSize:"0.8rem", color: color || "#f0fdf4", fontWeight:500 }}>{value || "—"}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1500, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)" }}/>

      {/* Drawer */}
      <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:1600, width:380, background:"#0a1a0d", borderLeft:"1px solid rgba(134,239,172,0.12)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)", overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"24px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", position:"sticky", top:0, background:"#0a1a0d", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
            <div>
              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"1.2rem", color:"#f0fdf4", letterSpacing:"-0.02em" }}>{village.name}</div>
              <div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.35)", marginTop:2 }}>{village.hi} · {village.type}</div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(232,245,233,0.5)", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
          </div>

          {/* Status pills */}
          <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:100, background: villageIssues.length > 0 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)", border: `1px solid ${villageIssues.length > 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}`, color: villageIssues.length > 0 ? "#f87171" : "#86efac" }}>
              {villageIssues.length > 0 ? `🚨 ${villageIssues.length} active issue${villageIssues.length > 1 ? "s" : ""}` : "✅ No active issues"}
            </span>
            {villageNeeds.length > 0 && (
              <span style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:100, background:"rgba(192,132,252,0.1)", border:"1px solid rgba(192,132,252,0.25)", color:"#c084fc" }}>
                📋 {villageNeeds.length} chronic need{villageNeeds.length > 1 ? "s" : ""}
              </span>
            )}
            {profile && (
              <span style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:100, background:`${vulnColor}15`, border:`1px solid ${vulnColor}40`, color:vulnColor }}>
                ⚡ Vulnerability: {profile.vulnerability_score}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding:"16px 24px", flex:1 }}>

    {loading ? (
  <div style={{ padding:"40px 0", textAlign:"center", color:"rgba(232,245,233,0.25)", fontSize:"0.82rem" }}>Loading profile...</div>
) : profile ? (
  <>
    {/* Block Overview */}
    <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", marginBottom:8 }}>Block Overview</div>
    {row("Villages in Block", profile.total_villages)}
    {row("Total Population", profile.total_population?.toLocaleString("en-IN"))}
    {row("Total Households", profile.total_households?.toLocaleString("en-IN"))}
    {row("Avg Vulnerability Score", profile.avg_vulnerability, vulnColor)}

    {/* Infrastructure Gaps */}
    <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", margin:"16px 0 8px" }}>Infrastructure Gaps</div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
      {[
        ["No Power", profile.no_power],
        ["No Pucca Road", profile.no_road],
        ["No Anganwadi", profile.no_anganwadi],
        ["No Mobile Coverage", profile.no_mobile],
      ].map(([label, count]) => (
        <div key={label} style={{ padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.55)" }}>{label}</span>
          <span style={{ fontSize:"0.82rem", fontWeight:700, color:"#f87171" }}>{count}</span>
        </div>
      ))}
    </div>

    {/* Most Vulnerable */}
    {profile.most_vulnerable && (
      <>
        <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", margin:"16px 0 8px" }}>Most Vulnerable Village</div>
        <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)" }}>
          <div style={{ fontSize:"0.82rem", color:"#f0fdf4", fontWeight:600 }}>{profile.most_vulnerable.villageName}</div>
          <div style={{ fontSize:"0.7rem", color:"rgba(232,245,233,0.4)", marginTop:3 }}>
            Score: {profile.most_vulnerable.vulnerability_score} · Pop: {profile.most_vulnerable.population}
          </div>
        </div>
      </>
    )}

    {/* Water Sources */}
    {profile.water_sources?.length > 0 && (
      <>
        <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", margin:"16px 0 8px" }}>Water Sources</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {profile.water_sources.map(ws => (
            <span key={ws} style={{ fontSize:"0.68rem", padding:"3px 10px", borderRadius:100, background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", color:"#38bdf8" }}>{ws}</span>
          ))}
        </div>
      </>
    )}
  </>
) : (
  <div style={{ padding:"20px 0", textAlign:"center", color:"rgba(232,245,233,0.2)", fontSize:"0.8rem" }}>
    No AIKosh data found for {village.name} block.
  </div>
)}

          {/* Active Issues */}
          {villageIssues.length > 0 && (
            <>
              <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", margin:"20px 0 8px" }}>Active Emergency Reports</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {villageIssues.map(issue => (
                  <div key={issue.id} style={{ padding:"10px 12px", borderRadius:10, background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)" }}>
                    <div style={{ fontSize:"0.8rem", color:"#f0fdf4", marginBottom:3 }}>{issue.title || issue.description?.slice(0, 50)}</div>
                    <div style={{ fontSize:"0.68rem", color:"rgba(232,245,233,0.35)" }}>{issue.category} · {issue.date} · 👤 {issue.fieldWorkerName}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Chronic Needs */}
          {villageNeeds.length > 0 && (
            <>
              <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(232,245,233,0.25)", margin:"20px 0 8px" }}>Chronic Needs</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {villageNeeds.map(need => (
                  <div key={need.id} style={{ padding:"10px 12px", borderRadius:10, background:"rgba(192,132,252,0.05)", border:"1px solid rgba(192,132,252,0.15)" }}>
                    <div style={{ fontSize:"0.8rem", color:"#f0fdf4", marginBottom:3 }}>{need.description}</div>
                    <div style={{ fontSize:"0.68rem", color:"rgba(232,245,233,0.35)" }}>{need.category} · {need.date}</div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
// ── Main AdminPage
export default function AdminPage() {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef({});
  const leafletRef     = useRef(null);

  const [villages, setVillages]         = useState(() => VILLAGES_DATA.map(v => ({ ...v, issues:0 })));
  const [issues, setIssues]             = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [volunteers, setVolunteers]     = useState([]);
  const [chronicNeeds, setChronicNeeds] = useState([]);
  const [selVol, setSelVol]             = useState(null);
  const [modal, setModal]               = useState({ open:false, issue:null });
  const [search, setSearch]             = useState("");
  const [toast, setToast]               = useState({ show:false, icon:"", msg:"" });
  const [assigning, setAssigning]       = useState(false);
  const [issueTab, setIssueTab]         = useState("emergency"); // "emergency" | "chronic"
  const [volTab, setVolTab]             = useState("responders"); // "responders" | "leaderboard"
  const [chronicForm, setChronicForm]   = useState({ village:"", category:"education", description:"", _open:false });
  const [addingChronic, setAddingChronic] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState(null);

  useEffect(() => {
  window.__setSelectedVillage = setSelectedVillage;
}, [setSelectedVillage]);

  const showToast = (icon, msg) => {
    setToast({ show:true, icon, msg });
    setTimeout(() => setToast(t => ({ ...t, show:false })), 3500);
  };

  const flyToVillage = v => {
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 13, { duration:1.2 });
    setTimeout(() => markersRef.current[v.id]?.openPopup(), 1300);
  };

  // ── Volunteers listener 
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "volunteer")),
      snap => {
        const vols = snap.docs.map((d, i) => ({
          id: d.id, ...d.data(),
          color: VOL_COLORS[i % VOL_COLORS.length],
          init:  initials(d.data().name),
          avail: d.data().available !== false,
        }));
        setVolunteers(vols);
        window.__volunteers = vols;
      }
    );
    return () => unsub();
  }, []);

  // ── Chronic needs listener 
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "chronicNeeds"), orderBy("createdAt", "desc")),
      snap => {
        setChronicNeeds(snap.docs.map(d => ({
          id: d.id, ...d.data(),
          date: d.data().createdAt?.toDate
            ? d.data().createdAt.toDate().toLocaleDateString("en-IN", { day:"numeric", month:"short" })
            : "—",
        })));
      }
    );
    return () => unsub();
  }, []);

  // ── Reports listener 
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "reports"), orderBy("createdAt", "desc")),
      async snap => {
        const docs = snap.docs.map(d => ({
          id: d.id, ...d.data(),
          date: d.data().createdAt?.toDate
            ? d.data().createdAt.toDate().toLocaleDateString("en-IN", { day:"numeric", month:"short" })
            : "Just now",
        }));

        const pending = docs.filter(i => !i.assigned && i.status !== "resolved");
        if (pending.length > 0) {
          try {
            const res = await fetch("http://localhost:8000/api/priority", {
              method: "POST",
              headers: { "Content-Type":"application/json" },
              body: JSON.stringify({ reports: pending.map(r => ({ id:r.id, title:r.title, category:r.category, severity:r.severity, affected:r.affected, village:r.village, location:r.location })) }),
            });
            if (res.ok) {
              const data = await res.json();
              const m = {};
              (data.scores || data).forEach(s => { m[s.id] = s; });
              const merged = docs.map(d => m[d.id] ? { ...d, score:m[d.id].score, reason:m[d.id].reason } : d);
              setIssues([
                ...merged.filter(i => !i.assigned && i.status !== "resolved").sort((a, b) => (b.score||0) - (a.score||0)),
                ...merged.filter(i =>  i.assigned || i.status === "resolved"),
              ]);
            } else setIssues(docs);
          } catch { setIssues(docs); }
        } else setIssues(docs);

        setLoadingIssues(false);

        // Update village issue counts
        const countMap = docs.reduce((a, r) => {
          if (r.village) a[r.village] = (a[r.village] || 0) + 1;
          return a;
        }, {});
        setVillages(prev => prev.map(v => ({ ...v, issues: countMap[v.name] || 0 })));
      }
    );
    return () => unsub();
  }, []);

  // ── Map 
// ── Map 
  useEffect(() => {
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    (async () => {
      const L = (await import("leaflet")).default;
      leafletRef.current = L;
      const map = L.map(mapRef.current, { zoomControl:false }).setView([26.22, 81.28], 11);
      mapInstanceRef.current = map;
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      L.tileLayer(
        key
          ? `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${key}`
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: key ? "© Google Maps" : "© OpenStreetMap", maxZoom:20, tileSize:256 }
      ).addTo(map);
    })();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // ── Village markers (red/green based on issues)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    villages.forEach(v => {
      const hasIssue = v.issues > 0  || v.chronicIssues > 0;;
      const color = hasIssue ? "#ef4444" : "#22c55e";
      const glowColor = hasIssue ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: ${hasIssue ? 14 : 9}px;
          height: ${hasIssue ? 14 : 9}px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 0 ${hasIssue ? 10 : 5}px ${glowColor};
          ${hasIssue ? "animation: pulse 1.5s ease infinite;" : ""}
        "></div>`,
        iconSize: [hasIssue ? 14 : 9, hasIssue ? 14 : 9],
        iconAnchor: [hasIssue ? 7 : 4, hasIssue ? 7 : 4],
      });

     const marker = L.marker([v.lat, v.lng], { icon })
  .addTo(map)
  .bindPopup(`
    <div style="padding:10px;min-width:140px;">
      <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${v.name}</div>
      <div style="font-size:0.75rem;color:${hasIssue ? "#f87171" : "#86efac"}">
        ${hasIssue ? `🚨 ${v.issues} active issue${v.issues > 1 ? "s" : ""}` : "✅ No active issues"}
      </div>
    </div>
  `)
  .on("click", () => window.__setSelectedVillage(v));

markersRef.current[v.id] = marker;
    });
  }, [villages]);

  // ── Assign volunteer 
  const doAssign = async (issue, volName) => {
    setAssigning(true);
    try {
      await updateDoc(doc(db, "reports", issue.id), {
        assigned: true,
        assignedTo: volName,
        assignedAt: serverTimestamp(),
        status: "assigned",
      });
      showToast("✓", `Assigned to ${volName}`);
    } catch (e) { console.error(e); }
    finally { setAssigning(false); }
  };

  // ── Chronic needs helpers 
  const addChronicNeed = async () => {
    if (!chronicForm.village || !chronicForm.description) return;
    setAddingChronic(true);
    try {
      await addDoc(collection(db, "chronicNeeds"), {
        village: chronicForm.village, category: chronicForm.category,
        description: chronicForm.description, status: "open",
        createdAt: serverTimestamp(), addedBy: "admin",
      });
      setChronicForm({ village:"", category:"education", description:"", _open:false });
      showToast("", `Chronic need logged for ${chronicForm.village}`);
    } catch (e) { console.error(e); }
    finally { setAddingChronic(false); }
  };

  const resolveChronicNeed = async (id) => {
    try {
      await updateDoc(doc(db, "chronicNeeds", id), { status:"resolved", resolvedAt:serverTimestamp() });
      showToast("✓", "Marked as resolved");
    } catch (e) { console.error(e); }
  };

  // ── Derived data 
  const filteredVillages = search
    ? villages.filter(v => v.name.toLowerCase().includes(search.toLowerCase()))
    : villages;
  const problemV = filteredVillages.filter(v => v.issues > 0);
  const safeV    = filteredVillages.filter(v => v.issues === 0);

  // ── Render
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#080e0a;color:#e8f5e9;font-family:'Outfit',sans-serif;min-height:100vh;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:10px;}
        .leaflet-popup-content-wrapper{background:#0d1f12!important;color:#f0fdf4!important;border:1px solid rgba(134,239,172,0.15)!important;border-radius:14px!important;box-shadow:0 8px 32px rgba(0,0,0,0.5)!important;}
        .leaflet-popup-tip{background:#0d1f12!important;}.leaflet-popup-content{margin:0!important;}
        @keyframes au{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:0.6;}50%{opacity:0.3;}}
        .af{opacity:0;animation:au 0.5s ease forwards;}.a1{animation-delay:.05s;}.a2{animation-delay:.12s;}.a3{animation-delay:.2s;}.a4{animation-delay:.28s;}
        select option{background:#0d1f12;}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#080e0a", display:"flex", flexDirection:"column" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header style={{ height:64, flexShrink:0, background:"rgba(8,14,10,0.85)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(134,239,172,0.08)", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:1000 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,rgba(134,239,172,0.15),rgba(103,232,249,0.1))", border:"1px solid rgba(134,239,172,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>⬡</div>
            <div>
              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"1.05rem", color:"#86efac", letterSpacing:"-0.01em", lineHeight:1 }}>Sanrakshan</div>
              <div style={{ fontSize:"0.62rem", color:"rgba(232,245,233,0.3)", textTransform:"uppercase", letterSpacing:"0.18em", marginTop:3 }}>Admin Command · Raebareli</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {[
                { label:"Alerts",   val:issues.length,                             color:"#f87171" },
                { label:"Pending",  val:issues.filter(i => !i.assigned).length,    color:"#fbbf24" },
                { label:"Assigned", val:issues.filter(i =>  i.assigned).length,    color:"#67e8f9" },
              ].map(s => (
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"0.95rem", color:s.color }}>{s.val}</span>
                  <span style={{ fontSize:"0.65rem", color:"rgba(232,245,233,0.3)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#86efac", boxShadow:"0 0 8px #86efac" }}/>
              <span style={{ fontSize:"0.72rem", color:"#86efac", fontWeight:500 }}>Live</span>
            </div>



             <a href="/village-intelligence" style={{ fontSize:"0.72rem", color:"#38bdf8", textDecoration:"none", padding:"5px 12px", borderRadius:8, background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)" }}>
               Village Intelligence
            </a>
            <DownloadReport issues={issues} villages={villages}/>
          </div>
        </header>

        <main style={{ flex:1, overflowY:"auto", padding:"28px 32px", maxWidth:1400, width:"100%", margin:"0 auto" }}>

          {/* WEATHER + EARLY WARNING */}
          <WeatherAndAlerts/>

          {/* VILLAGE STRIP */}
          <div className="af a1" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:3, height:14, background:"#86efac", borderRadius:2, display:"inline-block" }}/>
                <span style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.18em", color:"rgba(232,245,233,0.35)" }}>Zone Overview · {villages.length} locations</span>
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search village..." style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"6px 12px", color:"#f0fdf4", fontFamily:"'Outfit',sans-serif", fontSize:"0.78rem", outline:"none", width:180 }}/>
            </div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6 }}>
              {problemV.map(v => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", fontSize:"0.75rem", fontFamily:"'Outfit',sans-serif", whiteSpace:"nowrap" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", flexShrink:0 }}/>{v.name} <span style={{ fontSize:"0.65rem", opacity:0.7 }}>({v.issues})</span>
                </button>
              ))}
              {safeV.map(v => (
                <button key={v.id} onClick={() => flyToVillage(v)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, cursor:"pointer", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", color:"rgba(232,245,233,0.45)", fontSize:"0.75rem", fontFamily:"'Outfit',sans-serif", whiteSpace:"nowrap" }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#22c55e", flexShrink:0 }}/>{v.name}
                </button>
              ))}
            </div>
          </div>

          {/* MAP */}
          <div className="af a2" style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", marginBottom:12 }}>
              <span style={{ width:3, height:14, background:"#67e8f9", borderRadius:2, display:"inline-block", marginRight:8 }}/>
              <span style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.18em", color:"rgba(232,245,233,0.35)" }}>Operational Map</span>
            </div>
            <div style={{ height:420, borderRadius:18, overflow:"hidden", border:"1px solid rgba(134,239,172,0.08)", boxShadow:"0 4px 40px rgba(0,0,0,0.4)" }}>
              <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
            </div>
          </div>

          {/* CHARTS */}
          <div className="af a3"><ChartsSection issues={issues}/></div>

          {/* ISSUES — tabbed: Emergency + Chronic */}
          <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, overflow:"hidden", marginBottom:20 }}>
            <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:3 }}>
                {[
                  ["emergency", " Emergency", issues.filter(i => !i.assigned && i.status !== "resolved").length, "#f87171"],
                  ["chronic",   " Chronic Needs", chronicNeeds.filter(n => n.status === "open").length, "#c084fc"],
                ].map(([tab, label, count, color]) => (
                  <button key={tab} onClick={() => setIssueTab(tab)} style={{ padding:"6px 16px", borderRadius:7, border:"none", fontFamily:"'Outfit',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:issueTab===tab?`${color}15`:"transparent", color:issueTab===tab?color:"rgba(232,245,233,0.35)", display:"flex", alignItems:"center", gap:6 }}>
                    {label}
                    <span style={{ fontSize:"0.65rem", padding:"1px 7px", borderRadius:100, background:issueTab===tab?`${color}20`:"rgba(255,255,255,0.05)", color:issueTab===tab?color:"rgba(232,245,233,0.3)" }}>{count}</span>
                  </button>
                ))}
              </div>
              {issueTab === "chronic" && (
                <button onClick={() => setChronicForm(f => ({ ...f, _open:!f._open }))} style={{ background:"rgba(192,132,252,0.1)", border:"1px solid rgba(192,132,252,0.25)", color:"#c084fc", fontSize:"0.72rem", fontWeight:600, padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                  + Add Need
                </button>
              )}
            </div>

            {/* EMERGENCY TAB */}
            {issueTab === "emergency" && (
              loadingIssues ? (
                <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height:68, borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}/>)}
                </div>
              ) : issues.length === 0 ? (
                <div style={{ padding:"48px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:"1.8rem", marginBottom:10, opacity:0.3 }}>🚨</div>
                  <div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.22)", lineHeight:1.6 }}>No active incidents.<br/>Field workers will appear here in real time.</div>
                </div>
              ) : (
                <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                  {issues.map(issue => {
                    const isAssigned = issue.assigned || issue.status === "resolved";
                    const ss = issue.score != null ? scoreBadge(issue.score) : null;
                    return (
                      <div key={issue.id} onClick={() => !isAssigned && setModal({ open:true, issue })} style={{ padding:"16px 20px", borderRadius:14, position:"relative", overflow:"hidden", cursor:isAssigned?"default":"pointer", border:"1px solid rgba(255,255,255,0.06)", background:isAssigned?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)", opacity:isAssigned?0.5:1, transition:"all 0.2s" }}>
                        <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:sevDot[issue.severity]||"#86efac", borderRadius:"3px 0 0 3px" }}/>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:"0.88rem", fontWeight:600, color:"#f0fdf4", marginBottom:5 }}>{issue.title || issue.description?.slice(0,50)}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:"0.72rem", color:"rgba(232,245,233,0.35)", flexWrap:"wrap" }}>
                              <span>📍 {issue.village || issue.location}</span>
                              <span style={{ opacity:0.4 }}>·</span><span>{issue.category}</span>
                              <span style={{ opacity:0.4 }}>·</span><span>{issue.date}</span>
                              {issue.fieldWorkerName && <><span style={{ opacity:0.4 }}>·</span><span>👤 {issue.fieldWorkerName}</span></>}
                              {isAssigned && issue.assignedTo && <><span style={{ opacity:0.4 }}>·</span><span style={{ color:"#86efac" }}>✓ {issue.assignedTo}</span></>}
                            </div>
                            {!isAssigned && (
                              <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                                <select id={`vs-${issue.id}`} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, padding:"5px 10px", color:"#e8f5e9", fontFamily:"'Outfit',sans-serif", fontSize:"0.72rem", outline:"none" }}>
                                  <option value="">— Assign volunteer —</option>
                                  {volunteers.map(vol => <option key={vol.id} value={vol.name}>{vol.name}{vol.avail ? "" : " (busy)"}</option>)}
                                </select>
                                <button onClick={() => { const s = document.getElementById(`vs-${issue.id}`); if (s?.value) doAssign(issue, s.value); }} style={{ background:"rgba(134,239,172,0.1)", border:"1px solid rgba(134,239,172,0.25)", color:"#86efac", fontSize:"0.72rem", fontWeight:600, padding:"5px 14px", borderRadius:7, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>Assign</button>
                              </div>
                            )}
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                            <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"3px 10px", borderRadius:100, background:sb(issue.severity), border:`1px solid ${sbd(issue.severity)}`, color:sc(issue.severity), textTransform:"uppercase", letterSpacing:"0.08em" }}>{issue.severity || "—"}</span>
                            {ss && <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"3px 10px", borderRadius:100, background:ss.bg, border:`1px solid ${ss.bd}`, color:ss.c }}>⚡ {issue.score}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* CHRONIC NEEDS TAB */}
            {issueTab === "chronic" && (
              <div>
                {chronicForm._open && (
                  <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)", background:"rgba(192,132,252,0.03)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(232,245,233,0.3)", marginBottom:5 }}>Village</div>
                        <input value={chronicForm.village} onChange={e => setChronicForm(f => ({ ...f, village:e.target.value }))} placeholder="Village name" style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#f0fdf4", fontFamily:"'Outfit',sans-serif", fontSize:"0.82rem", outline:"none" }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(232,245,233,0.3)", marginBottom:5 }}>Category</div>
                        <select value={chronicForm.category} onChange={e => setChronicForm(f => ({ ...f, category:e.target.value }))} style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#f0fdf4", fontFamily:"'Outfit',sans-serif", fontSize:"0.82rem", outline:"none" }}>
                          {["education","healthcare","livelihood","infrastructure","water","women_empowerment","other"].map(c => <option key={c} value={c}>{c.replace("_"," ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(232,245,233,0.3)", marginBottom:5 }}>Description</div>
                      <textarea value={chronicForm.description} onChange={e => setChronicForm(f => ({ ...f, description:e.target.value }))} placeholder="Describe the chronic need..." rows={2} style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 12px", color:"#f0fdf4", fontFamily:"'Outfit',sans-serif", fontSize:"0.82rem", outline:"none", resize:"none" }}/>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => setChronicForm(f => ({ ...f, _open:false }))} style={{ flex:1, padding:"8px", borderRadius:8, border:"1px solid rgba(255,255,255,0.07)", background:"none", color:"rgba(232,245,233,0.35)", fontFamily:"'Outfit',sans-serif", fontSize:"0.78rem", cursor:"pointer" }}>Cancel</button>
                      <button onClick={addChronicNeed} disabled={addingChronic || !chronicForm.village || !chronicForm.description} style={{ flex:2, padding:"8px", borderRadius:8, border:"none", background:"rgba(192,132,252,0.15)", color:"#c084fc", fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:"0.78rem", cursor:"pointer" }}>
                        {addingChronic ? "Saving..." : "Log Chronic Need"}
                      </button>
                    </div>
                  </div>
                )}
                {chronicNeeds.length === 0 ? (
                  <div style={{ padding:"48px 24px", textAlign:"center" }}>
                    <div style={{ fontSize:"1.8rem", marginBottom:10, opacity:0.3 }}>📋</div>
                    <div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.22)", lineHeight:1.6 }}>No chronic needs logged yet.<br/>These are long-term community needs — education, health, livelihood.</div>
                  </div>
                ) : (
                  <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                    {chronicNeeds.map(need => (
                      <div key={need.id} style={{ padding:"14px 18px", borderRadius:12, border:"1px solid rgba(192,132,252,0.12)", background:need.status==="resolved"?"rgba(255,255,255,0.01)":"rgba(192,132,252,0.03)", opacity:need.status==="resolved"?0.5:1, transition:"all 0.2s" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                              <span style={{ fontSize:"0.65rem", padding:"2px 9px", borderRadius:100, background:"rgba(192,132,252,0.12)", border:"1px solid rgba(192,132,252,0.2)", color:"#c084fc", textTransform:"uppercase", letterSpacing:"0.08em" }}>{need.category?.replace("_"," ")}</span>
                              <span style={{ fontSize:"0.65rem", color:"rgba(232,245,233,0.3)" }}>📍 {need.village}</span>
                              <span style={{ fontSize:"0.65rem", color:"rgba(232,245,233,0.2)" }}>· {need.date}</span>
                            </div>
                            <div style={{ fontSize:"0.85rem", color:"#f0fdf4", lineHeight:1.5 }}>{need.description}</div>
                          </div>
                          {need.status === "open" ? (
                            <button onClick={() => resolveChronicNeed(need.id)} style={{ flexShrink:0, background:"rgba(134,239,172,0.08)", border:"1px solid rgba(134,239,172,0.2)", color:"#86efac", fontSize:"0.68rem", fontWeight:600, padding:"5px 12px", borderRadius:7, cursor:"pointer", fontFamily:"'Outfit',sans-serif", whiteSpace:"nowrap" }}>✓ Resolve</button>
                          ) : (
                            <span style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:100, background:"rgba(134,239,172,0.08)", color:"#86efac", flexShrink:0 }}>Resolved</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/*  Leaderboard */}
          <div style={{ background:"rgba(255,255,255,0.015)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, overflow:"hidden", marginBottom:80 }}>
            <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:3 }}>
                {[
                  ["responders", " Field Responders", volunteers.filter(v => v.avail).length, "#86efac"],
                  ["leaderboard"," Leaderboard",      volunteers.length,                       "#fbbf24"],
                ].map(([tab, label, count, color]) => (
                  <button key={tab} onClick={() => setVolTab(tab)} style={{ padding:"6px 16px", borderRadius:7, border:"none", fontFamily:"'Outfit',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:volTab===tab?`${color}15`:"transparent", color:volTab===tab?color:"rgba(232,245,233,0.35)", display:"flex", alignItems:"center", gap:6 }}>
                    {label}
                    <span style={{ fontSize:"0.65rem", padding:"1px 7px", borderRadius:100, background:volTab===tab?`${color}20`:"rgba(255,255,255,0.05)", color:volTab===tab?color:"rgba(232,245,233,0.3)" }}>{count}</span>
                  </button>
                ))}
              </div>
              <span style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:100, background:"rgba(134,239,172,0.08)", border:"1px solid rgba(134,239,172,0.15)", color:"#86efac" }}>
                {volunteers.filter(v => v.avail).length} available
              </span>
            </div>

            {/* RESPONDERS TAB */}
            {volTab === "responders" && (
              volunteers.length === 0 ? (
                <div style={{ padding:"40px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.22)" }}>No volunteers registered yet.</div>
                </div>
              ) : (
                <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
                  {volunteers.map(vol => (
                    <div key={vol.id} onClick={() => setSelVol(selVol?.id === vol.id ? null : vol)} style={{ padding:"14px 16px", borderRadius:12, cursor:"pointer", border:selVol?.id===vol.id?"1px solid rgba(134,239,172,0.35)":"1px solid rgba(255,255,255,0.06)", background:selVol?.id===vol.id?"rgba(134,239,172,0.06)":"rgba(255,255,255,0.02)", transition:"all 0.2s" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:vol.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.78rem", fontWeight:700, color:"#080e0a" }}>{vol.init}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"0.82rem", fontWeight:600, color:"#f0fdf4", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{vol.name}</div>
                          <div style={{ fontSize:"0.68rem", color:"rgba(232,245,233,0.35)" }}>{vol.avail ? "Available" : "Busy"}</div>
                        </div>
                        <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:vol.avail?"#22c55e":"#f59e0b", boxShadow:vol.avail?"0 0 6px #22c55e":"none" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* LEADERBOARD TAB */}
            {volTab === "leaderboard" && (
              <VolunteerLeaderboard volunteers={volunteers} issues={issues}/>
            )}
          </div>
          {/* ── CSV UPLOAD + AUTO REPORT GENERATOR ── */}
          <DataIngestionSection showToast={showToast} />

          {/*  Leaderboard */}
        </main>
      </div>

      {/* ISSUE DETAIL MODAL */}
      {modal.open && modal.issue && (
        <div onClick={() => setModal({ open:false, issue:null })} style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#0d1f12", border:"1px solid rgba(134,239,172,0.15)", borderRadius:20, padding:"28px 32px", width:"100%", maxWidth:520, boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:"1.1rem", fontWeight:700, color:"#f0fdf4", marginBottom:4 }}>{modal.issue.title || "Issue Details"}</div>
                <div style={{ fontSize:"0.72rem", color:"rgba(232,245,233,0.35)" }}>{modal.issue.village || modal.issue.location} · {modal.issue.date}</div>
              </div>
              <button onClick={() => setModal({ open:false, issue:null })} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(232,245,233,0.5)", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
            </div>
            {[["Category",modal.issue.category],["Severity",modal.issue.severity],["Affected",modal.issue.affected?`~${modal.issue.affected} people`:"—"],["Reported by",modal.issue.fieldWorkerName||"—"],["Status",modal.issue.status||"pending"],["Assigned to",modal.issue.assignedTo||"Unassigned"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"0.72rem", color:"rgba(232,245,233,0.35)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{k}</span>
                <span style={{ fontSize:"0.82rem", color:"#f0fdf4", fontWeight:500 }}>{v || "—"}</span>
              </div>
            ))}
            {modal.issue.description && <div style={{ marginTop:16, padding:14, background:"rgba(255,255,255,0.03)", borderRadius:10 }}><div style={{ fontSize:"0.68rem", color:"rgba(232,245,233,0.3)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Description</div><div style={{ fontSize:"0.82rem", color:"rgba(232,245,233,0.7)", lineHeight:1.6 }}>{modal.issue.description}</div></div>}
            {modal.issue.reason && <div style={{ marginTop:12, padding:14, background:"rgba(134,239,172,0.04)", borderRadius:10, border:"1px solid rgba(134,239,172,0.1)" }}><div style={{ fontSize:"0.68rem", color:"rgba(134,239,172,0.5)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>AI Priority Reason</div><div style={{ fontSize:"0.78rem", color:"rgba(232,245,233,0.6)", lineHeight:1.6 }}>{modal.issue.reason}</div></div>}
            <button onClick={() => setModal({ open:false, issue:null })} style={{ marginTop:20, width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(232,245,233,0.5)", fontSize:"0.78rem", padding:"10px", borderRadius:10, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>Close</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:3000, background:"#0d1f12", border:"1px solid rgba(134,239,172,0.2)", borderRadius:12, padding:"12px 22px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize:"1.1rem" }}>{toast.icon}</span>
          <span style={{ fontSize:"0.82rem", color:"#f0fdf4", fontWeight:500 }}>{toast.msg}</span>
        </div>
      )}

       {/* VILLAGE DRAWER */}
      <VillageDrawer
        village={selectedVillage}
        onClose={() => setSelectedVillage(null)}
        issues={issues}
        chronicNeeds={chronicNeeds}
      />
    </>
  );
}
