"use client";

import { useEffect, useRef, useState } from "react";

// ─── VILLAGE DATA ────────────────────────────────────────────────────────────
const VILLAGES_DATA = [
  { id:1,  name:"Rae Bareli",       hi:"रायबरेली",        lat:26.2309, lng:81.2408, type:"city"   },
  { id:2,  name:"Lalganj",          hi:"लालगंज",          lat:26.2477, lng:81.7098, type:"town"   },
  { id:3,  name:"Salon",            hi:"सलोन",            lat:26.1200, lng:81.3100, type:"town"   },
  { id:4,  name:"Dalmau",           hi:"डलमऊ",            lat:26.0631, lng:81.0364, type:"town"   },
  { id:5,  name:"Unchahar",         hi:"ऊंचाहार",         lat:26.1000, lng:81.3600, type:"town"   },
  { id:6,  name:"Bachhrawan",       hi:"बछरावां",         lat:26.3300, lng:81.3200, type:"town"   },
  { id:7,  name:"Harchandpur",      hi:"हरचंदपुर",        lat:26.2700, lng:81.0900, type:"town"   },
  { id:8,  name:"Tiloi",            hi:"तिलोई",           lat:26.0800, lng:81.5100, type:"town"   },
  { id:9,  name:"Sareni",           hi:"सरेनी",           lat:26.3500, lng:81.0500, type:"town"   },
  { id:10, name:"Maharajganj",      hi:"महाराजगंज",       lat:26.1900, lng:81.4300, type:"town"   },
  { id:11, name:"Khiri",            hi:"खीरी",            lat:26.3100, lng:81.1900, type:"town"   },
  { id:12, name:"Jagatpur",         hi:"जगतपुर",          lat:26.1500, lng:81.1500, type:"town"   },
  { id:13, name:"Amawa",            hi:"अमावा",           lat:26.1800, lng:81.2100, type:"village"},
  { id:14, name:"Parsadepur",       hi:"परसदेपुर",        lat:26.3800, lng:81.2600, type:"village"},
  { id:15, name:"Khajurgaon",       hi:"खजुरगांव",        lat:26.1300, lng:81.2500, type:"village"},
  { id:16, name:"Deeh",             hi:"डीह",             lat:26.2050, lng:81.3700, type:"village"},
  { id:17, name:"Rohaniya",         hi:"रोहनिया",         lat:26.2750, lng:81.4000, type:"village"},
  { id:18, name:"Semra",            hi:"सेमरा",           lat:26.1600, lng:81.4700, type:"village"},
  { id:19, name:"Pindra",           hi:"पिंडरा",          lat:26.3200, lng:81.1300, type:"village"},
  { id:20, name:"Fatehpur Chaurasi",hi:"फतेहपुर चौरासी",  lat:26.2200, lng:81.5500, type:"village"},
  { id:21, name:"Mukundpur",        hi:"मुकुंदपुर",       lat:26.0500, lng:81.2800, type:"village"},
  { id:22, name:"Sirsanwa",         hi:"सिरसांवा",        lat:26.1050, lng:81.1700, type:"village"},
  { id:23, name:"Rawatpur",         hi:"रावतपुर",         lat:26.2550, lng:81.3300, type:"village"},
  { id:24, name:"Bhitauli",         hi:"भिटौली",          lat:26.1400, lng:81.3900, type:"village"},
  { id:25, name:"Kunda",            hi:"कुंडा",           lat:26.0400, lng:81.5500, type:"village"},
  { id:26, name:"Khishni",          hi:"खिश्नी",          lat:26.3700, lng:81.4200, type:"village"},
  { id:27, name:"Barauli",          hi:"बरौली",           lat:26.2900, lng:81.2000, type:"village"},
  { id:28, name:"Atarha",           hi:"अटरहा",           lat:26.2400, lng:81.1400, type:"village"},
  { id:29, name:"Paschimgaon",      hi:"पश्चिमगांव",      lat:26.1750, lng:81.2900, type:"village"},
  { id:30, name:"Soraon",           hi:"सोरांव",          lat:26.3400, lng:81.5500, type:"village"},
  { id:31, name:"Gaura",            hi:"गौरा",            lat:26.0900, lng:81.3300, type:"village"},
  { id:32, name:"Chanda",           hi:"चंदा",            lat:26.1100, lng:81.4100, type:"village"},
  { id:33, name:"Bhagwantpur",      hi:"भगवंतपुर",        lat:26.3050, lng:81.3800, type:"village"},
  { id:34, name:"Nindura",          hi:"निंदूरा",         lat:26.2100, lng:81.1100, type:"village"},
  { id:35, name:"Husainpur",        hi:"हुसैनपुर",        lat:26.1650, lng:81.5300, type:"village"},
  { id:36, name:"Balrampur Kalan",  hi:"बलरामपुर कलाँ",   lat:26.2850, lng:81.4800, type:"village"},
  { id:37, name:"Rampur Kalan",     hi:"रामपुर कलाँ",     lat:26.0750, lng:81.6200, type:"village"},
  { id:38, name:"Katghara",         hi:"कटघरा",           lat:26.3600, lng:81.6000, type:"village"},
  { id:39, name:"Bisawan",          hi:"बिसवां",          lat:26.1350, lng:81.6500, type:"village"},
  { id:40, name:"Maholi",           hi:"महोली",           lat:26.2600, lng:81.6400, type:"village"},
  { id:41, name:"Padri",            hi:"पदरी",            lat:26.0300, lng:81.1200, type:"village"},
  { id:42, name:"Khajuriha",        hi:"खजुरिहा",         lat:26.4000, lng:81.3500, type:"village"},
  { id:43, name:"Bhavanpur",        hi:"भवानपुर",         lat:26.2200, lng:81.0400, type:"village"},
  { id:44, name:"Anwarpur",         hi:"अनवरपुर",         lat:26.1550, lng:81.0800, type:"village"},
  { id:45, name:"Musafirkhana",     hi:"मुसाफिरखाना",     lat:26.3900, lng:81.7400, type:"village"},
  { id:46, name:"Daryapur",         hi:"दरियापुर",        lat:26.0600, lng:81.4200, type:"village"},
  { id:47, name:"Jafarganj",        hi:"जाफरगंज",         lat:26.1950, lng:81.6000, type:"village"},
  { id:48, name:"Sikandarpur",      hi:"सिकंदरपुर",       lat:26.3150, lng:81.5100, type:"village"},
  { id:49, name:"Bahadurpur",       hi:"बहादुरपुर",       lat:26.2350, lng:81.4800, type:"village"},
  { id:50, name:"Chandpur",         hi:"चंदपुर",          lat:26.3450, lng:81.2300, type:"village"},
  { id:51, name:"Gurdaha",          hi:"गुरदाहा",         lat:26.1200, lng:81.2000, type:"village"},
  { id:52, name:"Nanpara",          hi:"नानपारा",         lat:26.2650, lng:81.5800, type:"village"},
  { id:53, name:"Shivgarh",         hi:"शिवगढ़",          lat:26.2000, lng:81.6700, type:"village"},
  { id:54, name:"Ramnagar",         hi:"रामनगर",          lat:26.1700, lng:81.1300, type:"village"},
  { id:55, name:"Semari",           hi:"सेमारी",          lat:26.0200, lng:81.3500, type:"village"},
  { id:56, name:"Gauriganj",        hi:"गौरीगंज",         lat:26.4100, lng:81.5700, type:"village"},
];

const VOLUNTEERS = [
  { id:1, name:"Neha Gupta",    skills:["Medical","First Aid"],     avail:true,  color:"#6366f1", init:"NG" },
  { id:2, name:"Arjun Mishra",  skills:["Construction","Safety"],   avail:true,  color:"#3b82f6", init:"AM" },
  { id:3, name:"Kavya Rao",     skills:["Education","Water"],       avail:false, color:"#8b5cf6", init:"KR" },
  { id:4, name:"Rohit Pandey",  skills:["Food","Logistics"],        avail:true,  color:"#06b6d4", init:"RP" },
  { id:5, name:"Sunita Verma",  skills:["Medical","Elderly Care"],  avail:true,  color:"#ec4899", init:"SV" },
  { id:6, name:"Deepak Tiwari", skills:["Safety","Construction"],   avail:true,  color:"#f59e0b", init:"DT" },
];

const MAPTILER_KEY = "HM59a9JA1VrdbDNkObtI";

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pulseMarkersRef = useRef({});

  const [villages, setVillages] = useState(() =>
    VILLAGES_DATA.map((v) => ({ ...v, issues: 0 }))
  );
  const [issues, setIssues] = useState([]);
  const [issueCounter, setIssueCounter] = useState(0);
  const [selIssue, setSelIssue] = useState(null);
  const [selVol, setSelVol] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState({ open: false, villageId: null });
  const [form, setForm] = useState({ village: "1", cat: "Water", sev: "medium", desc: "" });
  const [toast, setToast] = useState({ show: false, icon: "", msg: "", color: "" });
  const [activeVillageRow, setActiveVillageRow] = useState(null);

  // ── Init Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return;
    let L;
    const init = async () => {
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current, { zoomControl: false }).setView([26.22, 81.28], 11);
      L.tileLayer(
        `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
        { tileSize: 512, zoomOffset: -1, attribution: "© MapTiler", crossOrigin: true }
      ).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;

      VILLAGES_DATA.forEach((v) => addMarker(L, map, { ...v, issues: 0 }));
    };
    init();
  }, []);

  // ── Marker helpers ──────────────────────────────────────────────────────────
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
        radius: r + 9, color: "#ef4444", fillColor: "#ef4444",
        fillOpacity: 0.07, weight: 1, opacity: 0.2,
      }).addTo(map);
      pulseMarkersRef.current[v.id] = p;
    }
    const m = L.circleMarker([v.lat, v.lng], {
      radius: r, color: c, fillColor: c,
      fillOpacity: v.issues > 0 ? 0.95 : 0.82,
      weight: v.type === "city" ? 2.5 : 1.5,
    }).addTo(map);
    m.bindPopup(buildPopupHTML(v));
    markersRef.current[v.id] = m;
  };

  const buildPopupHTML = (v) => {
    const st =
      v.issues > 0
        ? `<span style="color:#ef4444">⚠️ ${v.issues} issue${v.issues > 1 ? "s" : ""}</span>`
        : `<span style="color:#22c55e">✅ Safe</span>`;
    return `<div style="font-family:sans-serif;min-width:170px">
      <div style="font-weight:700;font-size:13px;color:#f1f5f9;margin-bottom:2px">${v.name}</div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:6px">${v.hi} · ${v.type}</div>
      <div style="font-size:11px;margin-bottom:8px">Status: ${st}</div>
      <button onclick="window.__openReportModal(${v.id})"
        style="width:100%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
        color:#ef4444;font-size:11px;font-weight:600;padding:6px;border-radius:6px;cursor:pointer;">
        + Report Issue Here
      </button>
    </div>`;
  };

  const refreshMarker = async (v) => {
    const L = (await import("leaflet")).default;
    const map = mapInstanceRef.current;
    if (!map) return;
    if (markersRef.current[v.id]) { markersRef.current[v.id].remove(); delete markersRef.current[v.id]; }
    if (pulseMarkersRef.current[v.id]) { pulseMarkersRef.current[v.id].remove(); delete pulseMarkersRef.current[v.id]; }
    addMarker(L, map, v);
  };

  // Expose openModal to popup button
  useEffect(() => {
    window.__openReportModal = (vid) => openModal(vid);
    return () => { delete window.__openReportModal; };
  }, []);

  // ── Modal ───────────────────────────────────────────────────────────────────
  const openModal = (vid) => {
    setForm((f) => ({ ...f, village: String(vid ?? 1) }));
    setModal({ open: true, villageId: vid });
  };
  const closeModal = () => { setModal({ open: false, villageId: null }); setForm((f) => ({ ...f, desc: "" })); };

  const submitIssue = () => {
    const vid = parseInt(form.village);
    const v = villages.find((x) => x.id === vid);
    const desc = form.desc.trim() || `${form.cat} issue reported in ${v.name}`;
    const newId = issueCounter + 1;
    setIssueCounter(newId);
    const newIssue = {
      id: newId,
      title: desc.slice(0, 55) + (desc.length > 55 ? "…" : ""),
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
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 14, { duration: 1 });
    setTimeout(() => markersRef.current[vid]?.openPopup(), 900);
    showToast("🚨", `Issue reported in ${v.name}`, "rgba(239,68,68,0.4)");
  };

  // ── Assign ──────────────────────────────────────────────────────────────────
  const doAssign = () => {
    if (!selIssue || !selVol) return;
    setIssues((prev) =>
      prev.map((i) => i.id === selIssue.id ? { ...i, assigned: true, assignedTo: selVol.name } : i)
    );
    showToast("✅", `${selVol.name} assigned to "${selIssue.title}"`, "rgba(34,197,94,0.4)");
    setSelIssue(null);
    setSelVol(null);
  };

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (icon, msg, color) => {
    setToast({ show: true, icon, msg, color });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  // ── Fly to village ──────────────────────────────────────────────────────────
  const flyToVillage = (v) => {
    setActiveVillageRow(v.id);
    mapInstanceRef.current?.flyTo([v.lat, v.lng], 14, { duration: 1 });
    setTimeout(() => markersRef.current[v.id]?.openPopup(), 900);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredVillages = villages.filter((v) => {
    const q = search.toLowerCase();
    const matchQ = v.name.toLowerCase().includes(q) || v.hi.includes(q);
    const matchF =
      filter === "all" ||
      (filter === "red" && v.issues > 0) ||
      (filter === "green" && v.issues === 0);
    return matchQ && matchF;
  });

  const pendingIssues = issues.filter((i) => !i.assigned).length;
  const assignedIssues = issues.filter((i) => i.assigned).length;
  const redVillages = villages.filter((v) => v.issues > 0).length;

  // ── SEV color helpers ───────────────────────────────────────────────────────
  const sevStyles = {
    high:   { badge: "bg-red-500/15 text-red-400 border border-red-500/25",   bar: "bg-red-500" },
    medium: { badge: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25", bar: "bg-yellow-500" },
    low:    { badge: "bg-blue-500/15 text-blue-400 border border-blue-500/25",  bar: "bg-blue-500" },
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');
        .font-heading { font-family: 'Fraunces', serif; }
        .font-body    { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .leaflet-popup-content-wrapper {
          background: #131e30 !important; color: #e2e8f0 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 12px !important; box-shadow: 0 12px 32px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip { background: #131e30 !important; }
        .leaflet-popup-close-button { color: #64748b !important; top: 8px !important; right: 8px !important; }
        .leaflet-control-zoom a { background: #131e30 !important; color: #e2e8f0 !important; border-color: rgba(255,255,255,0.08) !important; }
        .leaflet-container { background: #070b12 !important; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .live-dot { animation: blink 2s infinite; }
      `}</style>

      <div className="font-body min-h-screen bg-[#070b12] text-slate-200 flex flex-col">

        {/* ── TOPBAR ── */}
        <header className="sticky top-0 z-50 bg-[#0c1220] border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight font-heading text-slate-100">SahaYog Admin</h1>
            <span className="text-xs text-slate-500">Rae Bareli District</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium px-3 py-1 rounded-full">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
              Live
            </span>
            <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] px-3 py-1 rounded-full">📍 Uttar Pradesh</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT PANEL: Village List ── */}
          <aside className="w-72 flex-shrink-0 bg-[#0c1220] border-r border-white/5 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold font-heading text-slate-200">Villages</span>
              <span className="text-[10px] text-slate-500">{filteredVillages.length} shown</span>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-white/5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍  Search village..."
                className="w-full bg-[#111827] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="px-3 py-2 border-b border-white/5 flex gap-1.5">
              {[["all","All"],["red","🔴 Issues"],["green","🟢 Safe"]].map(([val,label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    filter === val
                      ? val === "red"
                        ? "bg-red-500/15 border-red-500/30 text-red-400"
                        : val === "green"
                        ? "bg-green-500/10 border-green-500/25 text-green-400"
                        : "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "bg-transparent border-white/5 text-slate-500 hover:border-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 p-2 overflow-y-auto">
              {filteredVillages.map((v) => {
                const dotColor = v.issues > 0 ? "#ef4444" : v.type === "city" || v.type === "town" ? "#3b82f6" : "#22c55e";
                return (
                  <div
                    key={v.id}
                    onClick={() => flyToVillage(v)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mb-0.5 transition-all ${
                      activeVillageRow === v.id ? "bg-blue-500/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-200 truncate">
                        {v.name}
                        {v.issues > 0 && <span className="text-red-400 text-[10px] ml-1">({v.issues})</span>}
                      </div>
                      <div className="text-[10px] text-slate-500">{v.hi}</div>
                    </div>
                    <span className="text-[9px] text-slate-500 bg-[#1a2235] border border-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize">{v.type}</span>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 p-5">

              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:"Total Villages", val:56,           sub:"Mapped",           color:"text-blue-400",   bar:"bg-blue-500" },
                  { label:"Active Issues",  val:issues.length, sub:"Reported",         color:"text-red-400",    bar:"bg-red-500"  },
                  { label:"Assigned",       val:assignedIssues,sub:"In progress",      color:"text-green-400",  bar:"bg-green-500"},
                  { label:"Volunteers",     val:6,             sub:"Available",        color:"text-yellow-400", bar:"bg-yellow-500"},
                ].map((s) => (
                  <div key={s.label} className="bg-[#0c1220] border border-white/5 rounded-xl p-4 relative overflow-hidden hover:-translate-y-0.5 transition-transform group">
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.bar} opacity-80`} />
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{s.label}</div>
                    <div className={`font-heading text-3xl font-bold mt-1 ${s.color}`}>{s.val}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Map */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-base font-semibold font-heading text-slate-100">
                  District Map
                  <span className="font-body text-[10px] text-slate-500 font-normal bg-[#111827] border border-white/5 px-2.5 py-0.5 rounded-full">
                    56 villages · click markers
                  </span>
                </div>
                <div className="bg-[#0c1220] border border-white/5 rounded-2xl overflow-hidden relative">
                  <div ref={mapRef} style={{ height: 420, width: "100%" }} />
                  {/* Map overlay */}
                  <div className="absolute top-3 left-3 z-[500] bg-[#070b12]/90 border border-white/10 rounded-xl px-4 py-2 pointer-events-none">
                    <div className="text-sm font-heading text-slate-100">Rae Bareli Region</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Uttar Pradesh · {redVillages} active zones</div>
                  </div>
                  {/* Report btn */}
                  <button
                    onClick={() => openModal(null)}
                    className="absolute top-3 right-3 z-[500] bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    + Report Issue
                  </button>
                  {/* Legend */}
                  <div className="absolute bottom-4 right-3 z-[500] bg-[#070b12]/92 border border-white/10 rounded-xl px-4 py-3 pointer-events-none">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Legend</div>
                    {[["#ef4444","Active Issue"],["#22c55e","Safe Zone"],["#3b82f6","Town / HQ"]].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 last:mb-0">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Issues + Volunteers */}
              <div className="grid grid-cols-2 gap-4">

                {/* Active Issues */}
                <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-4">
                  <div className="font-heading text-[15px] font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    🚨 Active Issues
                    <span className="font-body text-[10px] text-slate-500 bg-[#111827] border border-white/5 px-2 py-0.5 rounded-full">
                      {pendingIssues} open
                    </span>
                    <button
                      onClick={() => openModal(null)}
                      className="ml-auto text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      + Report
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 pr-1 overflow-y-auto max-h-96">
                    {issues.length === 0 ? (
                      <div className="py-10 text-sm text-center text-slate-500">
                        <div className="mb-2 text-3xl">✅</div>
                        No active issues yet.
                        <div className="mt-1 text-xs">Click map markers to report.</div>
                      </div>
                    ) : issues.map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => !issue.assigned && setSelIssue(issue)}
                        className={`relative bg-[#111827] border rounded-xl px-3 py-3 transition-all overflow-hidden
                          ${issue.assigned ? "opacity-50 cursor-default" : "cursor-pointer hover:border-white/10 hover:translate-x-0.5"}
                          ${selIssue?.id === issue.id ? "border-blue-500/60 bg-blue-500/5" : "border-white/5"}
                        `}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl ${sevStyles[issue.severity]?.bar}`} />
                        <div className="flex items-start justify-between pl-2 mb-1">
                          <div>
                            <div className="text-[12px] font-medium text-slate-200 leading-snug">{issue.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">📍 {issue.village}</div>
                          </div>
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 capitalize ${sevStyles[issue.severity]?.badge}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-2 mt-2">
                          <span className="text-[9px] text-slate-500 bg-[#1a2235] border border-white/5 px-2 py-0.5 rounded-full">{issue.category}</span>
                          {issue.assigned && (
                            <span className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">✓ {issue.assignedTo}</span>
                          )}
                          <span className="text-[9px] text-slate-500 ml-auto">{issue.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volunteers */}
                <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-4">
                  <div className="font-heading text-[15px] font-semibold text-slate-100 mb-3">👤 Volunteers</div>
                  <div className="flex flex-col gap-2 pr-1 overflow-y-auto max-h-96">
                    {VOLUNTEERS.map((vol) => (
                      <div
                        key={vol.id}
                        onClick={() => vol.avail && setSelVol(vol)}
                        className={`flex items-center gap-3 bg-[#111827] border rounded-xl px-3 py-3 transition-all
                          ${!vol.avail ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-white/10"}
                          ${selVol?.id === vol.id ? "border-green-500/50 bg-green-500/5" : "border-white/5"}
                        `}
                      >
                        <div className="flex items-center justify-center flex-shrink-0 text-xs font-semibold rounded-full w-9 h-9"
                          style={{ background: `${vol.color}22`, color: vol.color }}>
                          {vol.init}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-slate-200">{vol.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {vol.skills.map((s) => (
                              <span key={s} className="text-[9px] text-slate-500 bg-[#1a2235] border border-white/5 px-1.5 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <div className={`w-1.5 h-1.5 rounded-full ${vol.avail ? "bg-green-400 shadow-[0_0_4px_#4ade80]" : "bg-yellow-400"}`} />
                          {vol.avail ? "Available" : "Busy"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assign Bar */}
              <div className="bg-[#0c1220] border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1 bg-[#111827] border border-white/5 rounded-xl px-4 py-3">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest">Selected Issue</div>
                  <div className={`text-[12px] mt-1 font-medium ${selIssue ? "text-slate-200" : "text-slate-500 italic font-normal"}`}>
                    {selIssue ? selIssue.title : "Choose an issue above →"}
                  </div>
                </div>
                <div className="flex-shrink-0 text-lg text-slate-600">→</div>
                <div className="flex-1 bg-[#111827] border border-white/5 rounded-xl px-4 py-3">
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest">Selected Volunteer</div>
                  <div className={`text-[12px] mt-1 font-medium ${selVol ? "text-slate-200" : "text-slate-500 italic font-normal"}`}>
                    {selVol ? selVol.name : "Choose a volunteer above →"}
                  </div>
                </div>
                <button
                  onClick={doAssign}
                  disabled={!selIssue || !selVol}
                  className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all text-white text-xs font-semibold px-7 py-3 rounded-xl cursor-pointer"
                >
                  Assign Volunteer
                </button>
              </div>

            </div>
          </main>
        </div>

        {/* ── MODAL ── */}
        {modal.open && (
          <div
            className="fixed inset-0 bg-black/65 z-[900] flex items-center justify-center"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="bg-[#0c1220] border border-white/10 rounded-2xl p-6 w-[420px] shadow-2xl">
              <h3 className="mb-1 text-lg font-semibold font-heading">Report an Issue</h3>
              <p className="mb-4 text-xs text-slate-500">
                {modal.villageId
                  ? `Reporting in ${villages.find((v) => v.id === modal.villageId)?.name}`
                  : "Select village and describe the problem"}
              </p>
              {[
                { label:"Village", el:(
                  <select value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}
                    className="w-full bg-[#111827] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/40">
                    {villages.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.hi}</option>)}
                  </select>
                )},
                { label:"Category", el:(
                  <select value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))}
                    className="w-full bg-[#111827] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/40">
                    {["Water","Health","Food","Safety","Education","Infrastructure"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                )},
                { label:"Severity", el:(
                  <select value={form.sev} onChange={(e) => setForm((f) => ({ ...f, sev: e.target.value }))}
                    className="w-full bg-[#111827] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500/40">
                    <option value="high">High — Urgent</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                )},
                { label:"Description", el:(
                  <textarea value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                    placeholder="Describe the issue..."
                    rows={3}
                    className="w-full bg-[#111827] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/40 resize-none" />
                )},
              ].map(({ label, el }) => (
                <div key={label} className="mb-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{label}</div>
                  {el}
                </div>
              ))}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={closeModal} className="bg-[#111827] border border-white/5 text-slate-400 text-xs px-4 py-2 rounded-lg cursor-pointer hover:border-white/10">Cancel</button>
                <button onClick={submitIssue} className="px-5 py-2 text-xs font-semibold text-white transition-colors bg-red-500 rounded-lg cursor-pointer hover:bg-red-600">Submit Report</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        <div
          className={`fixed bottom-6 right-6 z-[1000] bg-[#1a2235] border rounded-xl px-5 py-3 flex items-center gap-2.5 text-sm transition-all duration-300 ${
            toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
          }`}
          style={{ borderColor: toast.color }}
        >
          <span>{toast.icon}</span>
          <span className="text-xs text-slate-200">{toast.msg}</span>
        </div>
      </div>
    </>
  );
}
