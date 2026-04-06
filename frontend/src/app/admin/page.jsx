"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import VILLAGES_DATA from "@/data/villages";
import DownloadReport from "@/components/DownloadReport";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const VOL_COLORS = ["#6366f1","#3b82f6","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#86efac","#f87171"];
const initials = (name) => name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
const sevDot = { high:"#ef4444", medium:"#f59e0b", low:"#22c55e" };
const CAT_COLORS = { flood:"#67e8f9",medical:"#f87171",road:"#fbbf24",food:"#86efac",education:"#c084fc",electricity:"#fb923c",water:"#38bdf8",other:"#94a3b8" };
const STAT_COLORS = ["#f87171","#67e8f9","#86efac"];
const sc  = s => s==="high"?"#f87171":s==="medium"?"#fbbf24":"#86efac";
const sb  = s => s==="high"?"rgba(239,68,68,0.12)":s==="medium"?"rgba(245,158,11,0.12)":"rgba(34,197,94,0.12)";
const sbd = s => s==="high"?"rgba(239,68,68,0.3)":s==="medium"?"rgba(245,158,11,0.3)":"rgba(34,197,94,0.3)";
const scoreBadge = n => n>=70?{bg:"rgba(239,68,68,0.12)",bd:"rgba(239,68,68,0.3)",c:"#f87171"}:n>=40?{bg:"rgba(245,158,11,0.12)",bd:"rgba(245,158,11,0.3)",c:"#fbbf24"}:{bg:"rgba(34,197,94,0.12)",bd:"rgba(34,197,94,0.3)",c:"#86efac"};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#0d1f12",border:"1px solid rgba(134,239,172,0.15)",borderRadius:10,padding:"8px 14px"}}>
      <div style={{fontSize:"0.7rem",color:"rgba(232,245,233,0.4)",marginBottom:2}}>{label}</div>
      <div style={{fontSize:"0.9rem",fontWeight:700,color:"#86efac"}}>{payload[0].value}</div>
    </div>
  );
}

function ChartsSection({ issues }) {
  const catData = Object.entries(issues.reduce((a,i)=>{const c=i.category||"other";a[c]=(a[c]||0)+1;return a;},{}))
    .map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  const trendData = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i));
    return {label:d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),count:issues.filter(x=>x.createdAt?.toDate&&x.createdAt.toDate().toDateString()===d.toDateString()).length};
  });
  const statData=[{name:"Pending",value:issues.filter(i=>!i.assigned&&i.status!=="resolved").length},{name:"Assigned",value:issues.filter(i=>i.assigned&&i.status!=="resolved").length},{name:"Resolved",value:issues.filter(i=>i.status==="resolved").length}].filter(d=>d.value>0);
  const card={background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"20px 22px"};
  const lbl={fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.15em",color:"rgba(232,245,233,0.3)",marginBottom:14};
  return (
    <div style={{marginBottom:28}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{width:3,height:14,background:"#c084fc",borderRadius:2,display:"inline-block"}}/>
        <span style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(232,245,233,0.35)"}}>Analytics · {issues.length} total reports</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 260px",gap:16}}>
        <div style={card}><div style={lbl}>By Category</div>
          <ResponsiveContainer width="100%" height={170}><BarChart data={catData} barSize={20}>
            <XAxis dataKey="name" tick={{fill:"rgba(232,245,233,0.35)",fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"rgba(232,245,233,0.25)",fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
            <Tooltip content={<ChartTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
            <Bar dataKey="count" radius={[5,5,0,0]}>{catData.map(e=><Cell key={e.name} fill={CAT_COLORS[e.name]||"#94a3b8"}/>)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
        <div style={card}><div style={lbl}>Last 7 Days</div>
          <ResponsiveContainer width="100%" height={170}><LineChart data={trendData}>
            <XAxis dataKey="label" tick={{fill:"rgba(232,245,233,0.35)",fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"rgba(232,245,233,0.25)",fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
            <Tooltip content={<ChartTip/>}/>
            <Line type="monotone" dataKey="count" stroke="#fbbf24" strokeWidth={2.5} dot={{fill:"#fbbf24",r:4,strokeWidth:0}} activeDot={{r:6}}/>
          </LineChart></ResponsiveContainer>
        </div>
        <div style={card}><div style={lbl}>Status</div>
          {statData.length>0?(
            <><ResponsiveContainer width="100%" height={120}><PieChart>
              <Pie data={statData} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value">
                {statData.map((_,i)=><Cell key={i} fill={STAT_COLORS[i]}/>)}
              </Pie><Tooltip content={<ChartTip/>}/>
            </PieChart></ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:10}}>
              {statData.map((d,i)=>(
                <div key={d.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:STAT_COLORS[i]}}/><span style={{fontSize:"0.7rem",color:"rgba(232,245,233,0.4)"}}>{d.name}</span></div>
                  <span style={{fontSize:"0.78rem",fontWeight:700,color:STAT_COLORS[i]}}>{d.value}</span>
                </div>
              ))}
            </div></>
          ):<div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"0.78rem",color:"rgba(232,245,233,0.2)"}}>No data yet</span></div>}
        </div>
      </div>
    </div>
  );
}

// weather
function WeatherAndAlerts() {
  const [weather, setWeather] = useState(null);
  const [newsAlerts, setNewsAlerts] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/api/weather");
        const data = await res.json();
        setWeather(data);
      } catch {}
    })();
  }, []);

  const scanNews = async () => {
    setScanning(true);
    try {
      const res = await fetch("http://localhost:8000/api/early-warning/scan", { method: "POST" });
      const data = await res.json();
      if (data.success) setNewsAlerts(data.alerts || []);
    } catch {}
    setScanning(false);
  };

  const riskColor = { low: "#86efac", medium: "#fbbf24", high: "#f87171" };
  const riskBg    = { low: "rgba(134,239,172,0.08)", medium: "rgba(251,191,36,0.08)", high: "rgba(239,68,68,0.08)" };

  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

        {/* WEATHER CARD */}
        {weather && (
          <div style={{flex:1,minWidth:260,background:riskBg[weather.flood_risk]||"rgba(255,255,255,0.02)",border:`1px solid ${riskColor[weather.flood_risk]||"rgba(255,255,255,0.07)"}40`,borderRadius:14,padding:"14px 18px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:"1.1rem"}}>🌧️</span>
                <span style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(232,245,233,0.4)"}}>Weather · Raebareli</span>
              </div>
              <span style={{fontSize:"0.65rem",padding:"2px 10px",borderRadius:100,background:riskBg[weather.flood_risk],border:`1px solid ${riskColor[weather.flood_risk]}40`,color:riskColor[weather.flood_risk],fontWeight:700,textTransform:"uppercase"}}>
                {weather.flood_risk} flood risk
              </span>
            </div>
            {weather.alert && (
              <div style={{fontSize:"0.78rem",color:riskColor[weather.alert.level],marginBottom:8,lineHeight:1.5}}>
                ⚠️ {weather.alert.message}
              </div>
            )}
            <div style={{display:"flex",gap:8,overflowX:"auto"}}>
              {weather.forecast?.slice(0,4).map(d=>(
                <div key={d.date} style={{flexShrink:0,textAlign:"center",padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:`1px solid ${d.risk==="high"?"rgba(239,68,68,0.2)":d.risk==="medium"?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.06)"}`}}>
                  <div style={{fontSize:"0.62rem",color:"rgba(232,245,233,0.35)",marginBottom:3}}>{d.date.slice(5)}</div>
                  <div style={{fontSize:"0.82rem",fontWeight:700,color:riskColor[d.risk]}}>{d.rainfall_mm}mm</div>
                  <div style={{fontSize:"0.6rem",color:"rgba(232,245,233,0.3)"}}>{d.rain_prob}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EARLY WARNING CARD */}
        <div style={{flex:1,minWidth:260,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:"1.1rem"}}>📡</span>
              <span style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(232,245,233,0.4)"}}>News Early Warning</span>
            </div>
            <button onClick={scanNews} disabled={scanning} style={{background:"rgba(134,239,172,0.08)",border:"1px solid rgba(134,239,172,0.2)",color:"#86efac",fontSize:"0.68rem",fontWeight:600,padding:"4px 12px",borderRadius:7,cursor:scanning?"not-allowed":"pointer",fontFamily:"'Outfit',sans-serif"}}>
              {scanning?"Scanning...":"🔍 Scan News"}
            </button>
          </div>
          {newsAlerts.length===0?(
            <div style={{fontSize:"0.75rem",color:"rgba(232,245,233,0.25)",lineHeight:1.6}}>
              Click "Scan News" to check Google News for Raebareli disaster alerts via Gemini AI.
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {newsAlerts.slice(0,expanded?undefined:2).map((a,i)=>(
                <div key={i} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:`1px solid ${riskColor[a.severity]||"#94a3b8"}25`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:"0.72rem",fontWeight:600,color:riskColor[a.severity]||"#94a3b8"}}>{a.category?.toUpperCase()} · {a.severity}</span>
                    {a.source_url&&<a href={a.source_url} target="_blank" rel="noreferrer" style={{fontSize:"0.62rem",color:"rgba(232,245,233,0.3)"}}>↗ source</a>}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"#f0fdf4",marginBottom:2}}>{a.title}</div>
                  <div style={{fontSize:"0.7rem",color:"rgba(232,245,233,0.4)"}}>{a.summary}</div>
                </div>
              ))}
              {newsAlerts.length>2&&(
                <button onClick={()=>setExpanded(e=>!e)} style={{background:"none",border:"none",color:"rgba(232,245,233,0.3)",fontSize:"0.7rem",cursor:"pointer",textAlign:"left",padding:0}}>
                  {expanded?"Show less":`+${newsAlerts.length-2} more alerts`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const mapRef=useRef(null), mapInstanceRef=useRef(null), markersRef=useRef({}), leafletRef=useRef(null);
  const [villages,setVillages]=useState(()=>VILLAGES_DATA.map(v=>({...v,issues:0})));
  const [issues,setIssues]=useState([]);
  const [chronicNeeds,setChronicNeeds]=useState([]);
  const [volunteers,setVolunteers]=useState([]);
  const [selIssue,setSelIssue]=useState(null);
  const [selVol,setSelVol]=useState(null);
  const [modal,setModal]=useState({open:false,issue:null});
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState({show:false,icon:"",msg:""});
  const [assigning,setAssigning]=useState(false);
  const [issueTab,setIssueTab]=useState("emergency");
  const [chronicForm,setChronicForm]=useState({village:"",category:"education",description:"",_open:false});
  const [addingChronic,setAddingChronic]=useState(false);

  const addMarker = (L, map, village) => {
    const hasIssues = (village.issues || 0) > 0;
    const marker = L.circleMarker([village.lat, village.lng], {
      radius: hasIssues ? 8 : 6,
      color: hasIssues ? "#ef4444" : "#22c55e",
      fillColor: hasIssues ? "#ef4444" : "#22c55e",
      fillOpacity: hasIssues ? 0.6 : 0.35,
      weight: 2,
    }).addTo(map);

    marker.bindPopup(`
      <div style="min-width:160px;padding:4px 2px;">
        <div style="font-weight:700;margin-bottom:4px;">${village.name}</div>
        <div style="font-size:12px;opacity:0.8;">Active issues: ${village.issues || 0}</div>
      </div>
    `);
    markersRef.current[village.id] = marker;
  };

  // volunteers
  useEffect(()=>{
    const unsub=onSnapshot(query(collection(db,"users"),where("role","==","volunteer")),snap=>{
      const vols=snap.docs.map((d,i)=>({id:d.id,...d.data(),color:VOL_COLORS[i%VOL_COLORS.length],init:initials(d.data().name),avail:d.data().available!==false}));
      setVolunteers(vols);
      window.__volunteers=vols;
    });
    return ()=>unsub();
  },[]);

  // Refresh map markers when village issue counts change
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};
    villages.forEach((v) => addMarker(L, map, v));
  }, [villages]);

  // chronic needs
  useEffect(()=>{
    const unsub=onSnapshot(query(collection(db,"chronicNeeds"),orderBy("createdAt","desc")),snap=>{
      setChronicNeeds(snap.docs.map(d=>({id:d.id,...d.data(),date:d.data().createdAt?.toDate?d.data().createdAt.toDate().toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"})));
    });
    return ()=>unsub();
  },[]);

  // map
  useEffect(()=>{
    if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null;}
    (async()=>{
      const L=(await import("leaflet")).default;
      leafletRef.current=L;
      const map=L.map(mapRef.current,{zoomControl:false}).setView([26.22,81.28],11);
      mapInstanceRef.current=map;
      const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      L.tileLayer(
        key
          ? `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${key}`
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {attribution:key?"© Google Maps":"© OpenStreetMap",maxZoom:20,tileSize:256}
      ).addTo(map);
      L.control.zoom({position:"bottomright"}).addTo(map);
      VILLAGES_DATA.forEach(v=>addMarker(L,map,{...v,issues:0}));
    })();
  },[]);

  // reports
  useEffect(()=>{
    const unsub=onSnapshot(query(collection(db,"reports"),orderBy("createdAt","desc")),async snap=>{
      const docs=snap.docs.map(d=>({id:d.id,...d.data(),date:d.data().createdAt?.toDate?d.data().createdAt.toDate().toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Just now"}));
      const pending=docs.filter(i=>!i.assigned&&i.status!=="resolved");
      if(pending.length>0){
        try{
          const res=await fetch("http://localhost:8000/api/priority",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reports:pending.map(r=>({id:r.id,title:r.title,category:r.category,severity:r.severity,affected:r.affected,village:r.village,location:r.location}))})});
          if(res.ok){
            const data=await res.json();
            const m={};(data.scores||data).forEach(s=>{m[s.id]=s;});
            const merged=docs.map(d=>m[d.id]?{...d,score:m[d.id].score,reason:m[d.id].reason}:d);
            setIssues([...merged.filter(i=>!i.assigned&&i.status!=="resolved").sort((a,b)=>(b.score||0)-(a.score||0)),...merged.filter(i=>i.assigned||i.status==="resolved")]);
          } else setIssues(docs);
        }catch{setIssues(docs);}
      } else setIssues(docs);

      // update village issue counts on map
      const counts={};
      docs.filter(i=>i.status!=="resolved").forEach(i=>{
        const key=i.village||i.location;
        if(key) counts[key]=(counts[key]||0)+1;
      });
      setVillages(prev=>prev.map(v=>({...v,issues:counts[v.name]||0})));
    });
    return ()=>unsub();
  },[]);

  const doAssign=async(issue,volName)=>{
    setAssigning(true);
    try{
      await updateDoc(doc(db,"reports",issue.id),{assigned:true,assignedTo:volName,status:"assigned",assignedAt:serverTimestamp()});
      showToast("✓",`Assigned to ${volName}`);
    }catch(e){console.error(e);}
    finally{setAssigning(false);}
  };

  const showToast=(icon,msg)=>{setToast({show:true,icon,msg});setTimeout(()=>setToast(t=>({...t,show:false})),3500);};
  const flyToVillage=v=>{mapInstanceRef.current?.flyTo([v.lat,v.lng],13,{duration:1.2});setTimeout(()=>markersRef.current[v.id]?.openPopup(),1300);};

  const addChronicNeed=async()=>{
    if(!chronicForm.village||!chronicForm.description)return;
    setAddingChronic(true);
    try{
      await addDoc(collection(db,"chronicNeeds"),{
        village:chronicForm.village,
        category:chronicForm.category,
        description:chronicForm.description,
        status:"open",
        createdAt:serverTimestamp(),
        addedBy:"admin",
      });
      setChronicForm({village:"",category:"education",description:"",_open:false});
      showToast("📋",`Chronic need logged for ${chronicForm.village}`);
    }catch(e){console.error(e);}
    finally{setAddingChronic(false);}
  };

  const resolveChronicNeed=async(id)=>{
    try{
      await updateDoc(doc(db,"chronicNeeds",id),{status:"resolved",resolvedAt:serverTimestamp()});
      showToast("✓","Marked as resolved");
    }catch(e){console.error(e);}
  };

  const fv=villages.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.hi?.includes(search));
  const problemV=fv.filter(v=>v.issues>0), safeV=fv.filter(v=>v.issues===0);

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
        .af{opacity:0;animation:au 0.5s ease forwards;}.a1{animation-delay:.05s;}.a2{animation-delay:.12s;}.a3{animation-delay:.2s;}.a4{animation-delay:.28s;}
      `}</style>

      <div style={{minHeight:"100vh",background:"#080e0a",display:"flex",flexDirection:"column"}}>

        {/* HEADER */}
        <header style={{height:64,flexShrink:0,background:"rgba(8,14,10,0.85)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(134,239,172,0.08)",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:1000}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,rgba(134,239,172,0.15),rgba(103,232,249,0.1))",border:"1px solid rgba(134,239,172,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>⬡</div>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:"1.05rem",color:"#86efac",letterSpacing:"-0.01em",lineHeight:1}}>Sanrakshan</div>
              <div style={{fontSize:"0.62rem",color:"rgba(232,245,233,0.3)",textTransform:"uppercase",letterSpacing:"0.18em",marginTop:3}}>Admin Command · Raebareli</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {[{label:"Alerts",val:issues.length,color:"#f87171"},{label:"Pending",val:issues.filter(i=>!i.assigned).length,color:"#fbbf24"},{label:"Assigned",val:issues.filter(i=>i.assigned).length,color:"#67e8f9"}].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:"0.95rem",color:s.color}}>{s.val}</span>
                  <span style={{fontSize:"0.65rem",color:"rgba(232,245,233,0.3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.label}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#86efac",boxShadow:"0 0 8px #86efac"}}/>
              <span style={{fontSize:"0.72rem",color:"#86efac",fontWeight:500}}>Live</span>
            </div>
            <DownloadReport issues={issues} villages={villages}/>
          </div>
        </header>

        <main style={{flex:1,overflowY:"auto",padding:"28px 32px",maxWidth:1400,width:"100%",margin:"0 auto"}}>

          {/* WEATHER + EARLY WARNING */}
          <WeatherAndAlerts/>

          {/* VILLAGE STRIP */}
          <div className="af a1" style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:3,height:14,background:"#86efac",borderRadius:2,display:"inline-block"}}/>
                <span style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(232,245,233,0.35)"}}>Zone Overview · {villages.length} locations</span>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search village..." style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"6px 12px",color:"#f0fdf4",fontFamily:"'Outfit',sans-serif",fontSize:"0.78rem",outline:"none",width:180}}/>
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6}}>
              {problemV.map(v=>(
                <button key={v.id} onClick={()=>flyToVillage(v)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,cursor:"pointer",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",fontSize:"0.75rem",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",flexShrink:0}}/>{v.name} <span style={{fontSize:"0.65rem",opacity:0.7}}>({v.issues})</span>
                </button>
              ))}
              {safeV.map(v=>(
                <button key={v.id} onClick={()=>flyToVillage(v)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,cursor:"pointer",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(232,245,233,0.45)",fontSize:"0.75rem",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>{v.name}
                </button>
              ))}
            </div>
          </div>

          {/* MAP */}
          <div className="af a2" style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
              <span style={{width:3,height:14,background:"#67e8f9",borderRadius:2,display:"inline-block",marginRight:8}}/>
              <span style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(232,245,233,0.35)"}}>Operational Map</span>
            </div>
            <div style={{height:420,borderRadius:18,overflow:"hidden",border:"1px solid rgba(134,239,172,0.08)",boxShadow:"0 4px 40px rgba(0,0,0,0.4)"}}>
              <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
            </div>
          </div>

          {/* CHARTS */}
          <div className="af a3"><ChartsSection issues={issues}/></div>

          {/* ISSUES — tabbed: Emergency + Chronic */}
          <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,overflow:"hidden",marginBottom:20}}>
            {/* Tab header */}
            <div style={{padding:"14px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:3}}>
                {[["emergency","🚨 Emergency",issues.filter(i=>!i.assigned&&i.status!=="resolved").length,"#f87171"],["chronic","📋 Chronic Needs",chronicNeeds.filter(n=>n.status==="open").length,"#c084fc"]].map(([tab,label,count,color])=>(
                  <button key={tab} onClick={()=>setIssueTab(tab)} style={{padding:"6px 16px",borderRadius:7,border:"none",fontFamily:"'Outfit',sans-serif",fontSize:"0.75rem",fontWeight:600,cursor:"pointer",transition:"all 0.2s",background:issueTab===tab?`${color}15`:"transparent",color:issueTab===tab?color:"rgba(232,245,233,0.35)",display:"flex",alignItems:"center",gap:6}}>
                    {label}
                    <span style={{fontSize:"0.65rem",padding:"1px 7px",borderRadius:100,background:issueTab===tab?`${color}20`:"rgba(255,255,255,0.05)",color:issueTab===tab?color:"rgba(232,245,233,0.3)"}}>{count}</span>
                  </button>
                ))}
              </div>
              {issueTab==="chronic"&&(
                <button onClick={()=>setChronicForm(f=>({...f,_open:!f._open}))} style={{background:"rgba(192,132,252,0.1)",border:"1px solid rgba(192,132,252,0.25)",color:"#c084fc",fontSize:"0.72rem",fontWeight:600,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                  + Add Need
                </button>
              )}
            </div>

            {/* EMERGENCY TAB */}
            {issueTab==="emergency"&&(
              issues.length===0?(
                <div style={{padding:"48px 24px",textAlign:"center"}}>
                  <div style={{fontSize:"1.8rem",marginBottom:10,opacity:0.3}}>🚨</div>
                  <div style={{fontSize:"0.82rem",color:"rgba(232,245,233,0.22)",lineHeight:1.6}}>No active incidents.<br/>Field workers will appear here in real time.</div>
                </div>
              ):(
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                  {issues.map(issue=>{
                    const isAssigned=issue.assigned||issue.status==="resolved";
                    const ss=issue.score!=null?scoreBadge(issue.score):null;
                    return (
                      <div key={issue.id} onClick={()=>!isAssigned&&setModal({open:true,issue})} style={{padding:"16px 20px",borderRadius:14,position:"relative",overflow:"hidden",cursor:isAssigned?"default":"pointer",border:"1px solid rgba(255,255,255,0.06)",background:isAssigned?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",opacity:isAssigned?0.5:1,transition:"all 0.2s"}}>
                        <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:sevDot[issue.severity]||"#86efac",borderRadius:"3px 0 0 3px"}}/>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"0.88rem",fontWeight:600,color:"#f0fdf4",marginBottom:5}}>{issue.title||issue.description?.slice(0,50)}</div>
                            <div style={{display:"flex",alignItems:"center",gap:10,fontSize:"0.72rem",color:"rgba(232,245,233,0.35)",flexWrap:"wrap"}}>
                              <span>📍 {issue.village||issue.location}</span>
                              <span style={{opacity:0.4}}>·</span><span>{issue.category}</span>
                              <span style={{opacity:0.4}}>·</span><span>{issue.date}</span>
                              {issue.fieldWorkerName&&<><span style={{opacity:0.4}}>·</span><span>👤 {issue.fieldWorkerName}</span></>}
                              {isAssigned&&issue.assignedTo&&<><span style={{opacity:0.4}}>·</span><span style={{color:"#86efac"}}>✓ {issue.assignedTo}</span></>}
                            </div>
                            {!isAssigned&&(
                              <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                                <select id={`vs-${issue.id}`} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"5px 10px",color:"#e8f5e9",fontFamily:"'Outfit',sans-serif",fontSize:"0.72rem",outline:"none"}}>
                                  <option value="">— Assign volunteer —</option>
                                  {volunteers.map(vol=><option key={vol.id} value={vol.name}>{vol.name}{vol.avail?"":" (busy)"}</option>)}
                                </select>
                                <button onClick={()=>{const s=document.getElementById(`vs-${issue.id}`);if(s?.value)doAssign(issue,s.value);}} style={{background:"rgba(134,239,172,0.1)",border:"1px solid rgba(134,239,172,0.25)",color:"#86efac",fontSize:"0.72rem",fontWeight:600,padding:"5px 14px",borderRadius:7,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Assign</button>
                              </div>
                            )}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                            <span style={{fontSize:"0.65rem",fontWeight:700,padding:"3px 10px",borderRadius:100,background:sb(issue.severity),border:`1px solid ${sbd(issue.severity)}`,color:sc(issue.severity),textTransform:"uppercase",letterSpacing:"0.08em"}}>{issue.severity||"—"}</span>
                            {ss&&<span style={{fontSize:"0.65rem",fontWeight:700,padding:"3px 10px",borderRadius:100,background:ss.bg,border:`1px solid ${ss.bd}`,color:ss.c}}>⚡ {issue.score}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* CHRONIC NEEDS TAB */}
            {issueTab==="chronic"&&(
              <div>
                {/* Add form */}
                {chronicForm._open&&(
                  <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(192,132,252,0.03)"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <div style={{fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(232,245,233,0.3)",marginBottom:5}}>Village</div>
                        <input value={chronicForm.village} onChange={e=>setChronicForm(f=>({...f,village:e.target.value}))} placeholder="Village name" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 12px",color:"#f0fdf4",fontFamily:"'Outfit',sans-serif",fontSize:"0.82rem",outline:"none"}}/>
                      </div>
                      <div>
                        <div style={{fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(232,245,233,0.3)",marginBottom:5}}>Category</div>
                        <select value={chronicForm.category} onChange={e=>setChronicForm(f=>({...f,category:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 12px",color:"#f0fdf4",fontFamily:"'Outfit',sans-serif",fontSize:"0.82rem",outline:"none"}}>
                          {["education","healthcare","livelihood","infrastructure","water","women_empowerment","other"].map(c=><option key={c} value={c} style={{background:"#0d1f12"}}>{c.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:"0.62rem",textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(232,245,233,0.3)",marginBottom:5}}>Description</div>
                      <textarea value={chronicForm.description} onChange={e=>setChronicForm(f=>({...f,description:e.target.value}))} placeholder="Describe the chronic need..." rows={2} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 12px",color:"#f0fdf4",fontFamily:"'Outfit',sans-serif",fontSize:"0.82rem",outline:"none",resize:"none"}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setChronicForm(f=>({...f,_open:false}))} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",background:"none",color:"rgba(232,245,233,0.35)",fontFamily:"'Outfit',sans-serif",fontSize:"0.78rem",cursor:"pointer"}}>Cancel</button>
                      <button onClick={addChronicNeed} disabled={addingChronic||!chronicForm.village||!chronicForm.description} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"rgba(192,132,252,0.15)",color:"#c084fc",fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                        {addingChronic?"Saving...":"Log Chronic Need"}
                      </button>
                    </div>
                  </div>
                )}

                {chronicNeeds.length===0?(
                  <div style={{padding:"48px 24px",textAlign:"center"}}>
                    <div style={{fontSize:"1.8rem",marginBottom:10,opacity:0.3}}>📋</div>
                    <div style={{fontSize:"0.82rem",color:"rgba(232,245,233,0.22)",lineHeight:1.6}}>No chronic needs logged yet.<br/>These are long-term community needs — education, health, livelihood.</div>
                  </div>
                ):(
                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                    {chronicNeeds.map(need=>(
                      <div key={need.id} style={{padding:"14px 18px",borderRadius:12,border:"1px solid rgba(192,132,252,0.12)",background:need.status==="resolved"?"rgba(255,255,255,0.01)":"rgba(192,132,252,0.03)",opacity:need.status==="resolved"?0.5:1,transition:"all 0.2s"}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                              <span style={{fontSize:"0.65rem",padding:"2px 9px",borderRadius:100,background:"rgba(192,132,252,0.12)",border:"1px solid rgba(192,132,252,0.2)",color:"#c084fc",textTransform:"uppercase",letterSpacing:"0.08em"}}>{need.category?.replace("_"," ")}</span>
                              <span style={{fontSize:"0.65rem",color:"rgba(232,245,233,0.3)"}}>📍 {need.village}</span>
                              <span style={{fontSize:"0.65rem",color:"rgba(232,245,233,0.2)"}}>· {need.date}</span>
                            </div>
                            <div style={{fontSize:"0.85rem",color:"#f0fdf4",lineHeight:1.5}}>{need.description}</div>
                          </div>
                          {need.status==="open"?(
                            <button onClick={()=>resolveChronicNeed(need.id)} style={{flexShrink:0,background:"rgba(134,239,172,0.08)",border:"1px solid rgba(134,239,172,0.2)",color:"#86efac",fontSize:"0.68rem",fontWeight:600,padding:"5px 12px",borderRadius:7,cursor:"pointer",fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap"}}>
                              ✓ Resolve
                            </button>
                          ):(
                            <span style={{fontSize:"0.65rem",padding:"3px 10px",borderRadius:100,background:"rgba(134,239,172,0.08)",color:"#86efac",flexShrink:0}}>Resolved</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VOLUNTEERS */}
          <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,overflow:"hidden",marginBottom:80}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:3,height:14,background:"#86efac",borderRadius:2}}/><span style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(232,245,233,0.35)"}}>Field Responders</span></div>
              <span style={{fontSize:"0.65rem",padding:"3px 10px",borderRadius:100,background:"rgba(134,239,172,0.08)",border:"1px solid rgba(134,239,172,0.15)",color:"#86efac"}}>{volunteers.filter(v=>v.avail).length} available</span>
            </div>
            {volunteers.length===0?(
              <div style={{padding:"40px 24px",textAlign:"center"}}><div style={{fontSize:"0.82rem",color:"rgba(232,245,233,0.22)"}}>No volunteers registered yet.</div></div>
            ):(
              <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
                {volunteers.map(vol=>(
                  <div key={vol.id} onClick={()=>setSelVol(selVol?.id===vol.id?null:vol)} style={{padding:"14px 16px",borderRadius:12,cursor:"pointer",border:selVol?.id===vol.id?"1px solid rgba(134,239,172,0.35)":"1px solid rgba(255,255,255,0.06)",background:selVol?.id===vol.id?"rgba(134,239,172,0.06)":"rgba(255,255,255,0.02)",transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:vol.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.78rem",fontWeight:700,color:"#080e0a"}}>{vol.init}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.82rem",fontWeight:600,color:"#f0fdf4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{vol.name}</div>
                        <div style={{fontSize:"0.68rem",color:"rgba(232,245,233,0.35)"}}>{vol.avail?"Available":"Busy"}</div>
                      </div>
                      <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:vol.avail?"#22c55e":"#f59e0b",boxShadow:vol.avail?"0 0 6px #22c55e":"none"}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ISSUE DETAIL MODAL */}
      {modal.open&&modal.issue&&(
        <div onClick={()=>setModal({open:false,issue:null})} style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0d1f12",border:"1px solid rgba(134,239,172,0.15)",borderRadius:20,padding:"28px 32px",width:"100%",maxWidth:520,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:"1.1rem",fontWeight:700,color:"#f0fdf4",marginBottom:4}}>{modal.issue.title||"Issue Details"}</div>
                <div style={{fontSize:"0.72rem",color:"rgba(232,245,233,0.35)"}}>{modal.issue.village||modal.issue.location} · {modal.issue.date}</div>
              </div>
              <button onClick={()=>setModal({open:false,issue:null})} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(232,245,233,0.5)",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            {[["Category",modal.issue.category],["Severity",modal.issue.severity],["Affected",modal.issue.affected?`~${modal.issue.affected} people`:"—"],["Reported by",modal.issue.fieldWorkerName||"—"],["Status",modal.issue.status||"pending"],["Assigned to",modal.issue.assignedTo||"Unassigned"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:"0.72rem",color:"rgba(232,245,233,0.35)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                <span style={{fontSize:"0.82rem",color:"#f0fdf4",fontWeight:500}}>{v||"—"}</span>
              </div>
            ))}
            {modal.issue.description&&<div style={{marginTop:16,padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10}}><div style={{fontSize:"0.68rem",color:"rgba(232,245,233,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Description</div><div style={{fontSize:"0.82rem",color:"rgba(232,245,233,0.7)",lineHeight:1.6}}>{modal.issue.description}</div></div>}
            {modal.issue.reason&&<div style={{marginTop:12,padding:14,background:"rgba(134,239,172,0.04)",borderRadius:10,border:"1px solid rgba(134,239,172,0.1)"}}><div style={{fontSize:"0.68rem",color:"rgba(134,239,172,0.5)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>AI Priority Reason</div><div style={{fontSize:"0.78rem",color:"rgba(232,245,233,0.6)",lineHeight:1.6}}>{modal.issue.reason}</div></div>}
            <button onClick={()=>setModal({open:false,issue:null})} style={{marginTop:20,width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(232,245,233,0.5)",fontSize:"0.78rem",padding:"10px",borderRadius:10,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Close</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show&&(
        <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:3000,background:"#0d1f12",border:"1px solid rgba(134,239,172,0.2)",borderRadius:12,padding:"12px 22px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
          <span style={{fontSize:"1.1rem"}}>{toast.icon}</span>
          <span style={{fontSize:"0.82rem",color:"#f0fdf4",fontWeight:500}}>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
