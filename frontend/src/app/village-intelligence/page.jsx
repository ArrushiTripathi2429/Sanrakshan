"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const vulnColor = (s) =>
  s >= 70 ? "#f87171" : s >= 40 ? "#fbbf24" : "#86efac";
const vulnBg = (s) =>
  s >= 70 ? "rgba(239,68,68,0.1)" : s >= 40 ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)";
const vulnLabel = (s) =>
  s >= 70 ? "High" : s >= 40 ? "Medium" : "Low";

export default function VillageIntelligencePage() {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("all");
  const [vulnFilter, setVulnFilter] = useState("all");
  const [sortBy, setSortBy] = useState("vulnerability_desc");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "villageProfiles"), snap => {
      setVillages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // unique blocks for filter
  const blocks = ["all", ...new Set(villages.map(v => v.cd_block).filter(Boolean).sort())];

  // filter + sort
  const filtered = villages
    .filter(v => {
      const matchSearch = !search ||
        v.villageName?.toLowerCase().includes(search.toLowerCase()) ||
        v.gram_panchayat?.toLowerCase().includes(search.toLowerCase());
      const matchBlock = blockFilter === "all" || v.cd_block === blockFilter;
      const matchVuln = vulnFilter === "all" ||
        (vulnFilter === "high" && v.vulnerability_score >= 70) ||
        (vulnFilter === "medium" && v.vulnerability_score >= 40 && v.vulnerability_score < 70) ||
        (vulnFilter === "low" && v.vulnerability_score < 40);
      return matchSearch && matchBlock && matchVuln;
    })
    .sort((a, b) => {
      if (sortBy === "vulnerability_desc") return (b.vulnerability_score || 0) - (a.vulnerability_score || 0);
      if (sortBy === "vulnerability_asc") return (a.vulnerability_score || 0) - (b.vulnerability_score || 0);
      if (sortBy === "population_desc") return (b.population || 0) - (a.population || 0);
      if (sortBy === "name_asc") return (a.villageName || "").localeCompare(b.villageName || "");
      return 0;
    });

  const badge = (val) => (
    <span style={{
      fontSize: "0.65rem", padding: "2px 7px", borderRadius: 100,
      background: val ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${val ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
      color: val ? "#86efac" : "#f87171"
    }}>{val ? "✓" : "✗"}</span>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: 'Outfit', sans-serif; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        select option { background: #0d1f12; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080e0a" }}>

        {/* HEADER */}
        <header style={{ height: 64, background: "rgba(8,14,10,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(134,239,172,0.08)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="/admin" style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.35)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>← Admin</a>
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1rem", color: "#86efac" }}>Nearby Villages Information</div>
            <div style={{ fontSize: "0.62rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.18em" }}>AIKosh · {villages.length} profiles</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "High Risk", val: villages.filter(v => v.vulnerability_score >= 70).length, color: "#f87171" },
              { label: "Medium Risk", val: villages.filter(v => v.vulnerability_score >= 40 && v.vulnerability_score < 70).length, color: "#fbbf24" },
              { label: "Low Risk", val: villages.filter(v => v.vulnerability_score < 40).length, color: "#86efac" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.95rem", color: s.color }}>{s.val}</span>
                <span style={{ fontSize: "0.62rem", color: "rgba(232,245,233,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </header>

        <main style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

          {/* FILTERS */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search village or gram panchayat..."
              style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", color: "#f0fdf4", fontFamily: "'Outfit',sans-serif", fontSize: "0.82rem", outline: "none" }}
            />
            <select value={blockFilter} onChange={e => setBlockFilter(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", color: "#f0fdf4", fontFamily: "'Outfit',sans-serif", fontSize: "0.82rem", outline: "none" }}>
              {blocks.map(b => <option key={b} value={b}>{b === "all" ? "All Blocks" : b}</option>)}
            </select>
            <select value={vulnFilter} onChange={e => setVulnFilter(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", color: "#f0fdf4", fontFamily: "'Outfit',sans-serif", fontSize: "0.82rem", outline: "none" }}>
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk (70+)</option>
              <option value="medium">Medium Risk (40-69)</option>
              <option value="low">Low Risk (&lt;40)</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px", color: "#f0fdf4", fontFamily: "'Outfit',sans-serif", fontSize: "0.82rem", outline: "none" }}>
              <option value="vulnerability_desc">Most Vulnerable First</option>
              <option value="vulnerability_asc">Least Vulnerable First</option>
              <option value="population_desc">Highest Population</option>
              <option value="name_asc">Name A-Z</option>
            </select>
            <div style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.3)", whiteSpace: "nowrap" }}>
              {filtered.length} villages
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "rgba(232,245,233,0.25)" }}>Loading 1663 village profiles...</div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, overflow: "hidden" }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr", gap: 0, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["Village", "Gram Panchayat", "Block", "Pop", "HH", "Vuln Score", "Power·Road·AWC·Mobile", "Water Source", "Hospital"].map(h => (
                  <div key={h} style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.25)" }}>{h}</div>
                ))}
              </div>

              {/* Table Rows */}
              <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                {filtered.map((v, i) => (
                  <div
                    key={v.id}
                    onClick={() => setSelected(selected?.id === v.id ? null : v)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr",
                      gap: 0,
                      padding: "11px 20px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      background: selected?.id === v.id ? "rgba(134,239,172,0.04)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", color: "#f0fdf4", fontWeight: 500 }}>{v.villageName}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(232,245,233,0.45)" }}>{v.gram_panchayat}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.4)" }}>{v.cd_block}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(232,245,233,0.6)" }}>{v.population?.toLocaleString("en-IN") || "—"}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(232,245,233,0.6)" }}>{v.households || "—"}</div>
                    <div>
                      <span style={{
                        fontSize: "0.72rem", fontWeight: 700,
                        padding: "2px 10px", borderRadius: 100,
                        background: vulnBg(v.vulnerability_score),
                        color: vulnColor(v.vulnerability_score),
                        border: `1px solid ${vulnColor(v.vulnerability_score)}30`
                      }}>
                        {v.vulnerability_score} · {vulnLabel(v.vulnerability_score)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {badge(v.has_power)}
                      {badge(v.has_pucca_road)}
                      {badge(v.has_anganwadi)}
                      {badge(v.has_mobile_coverage)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.45)" }}>{v.water_source || "—"}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.45)" }}>{v.hospital_distance || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SELECTED VILLAGE DETAIL */}
          {selected && (
            <div style={{ marginTop: 20, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(134,239,172,0.12)", borderRadius: 18, padding: "24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.2rem", color: "#f0fdf4" }}>{selected.villageName}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(232,245,233,0.35)", marginTop: 3 }}>{selected.gram_panchayat} · {selected.cd_block} Block</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,245,233,0.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  ["Population", selected.population?.toLocaleString("en-IN")],
                  ["Households", selected.households],
                  ["SC Population", selected.sc_population],
                  ["Vulnerability Score", selected.vulnerability_score],
                  ["Road Type", selected.road_type],
                  ["Water Source", selected.water_source],
                  ["Hospital Distance", selected.hospital_distance],
                  ["PHC Distance", selected.phc_distance],
                  ["Nearest Town", selected.nearest_town],
                  ["Distance to Town", `${selected.nearest_town_dist_km} km`],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(232,245,233,0.25)", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: "0.88rem", color: "#f0fdf4", fontWeight: 500 }}>{val || "—"}</div>
                  </div>
                ))}
                {[
                  ["Power", selected.has_power],
                  ["Pucca Road", selected.has_pucca_road],
                  ["Anganwadi", selected.has_anganwadi],
                  ["Mobile Coverage", selected.has_mobile_coverage],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: "12px 14px", background: val ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", borderRadius: 10, border: `1px solid ${val ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1rem" }}>{val ? "✅" : "❌"}</span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(232,245,233,0.6)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}