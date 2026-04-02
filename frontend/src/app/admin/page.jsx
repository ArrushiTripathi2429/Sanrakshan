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

export default function AdminPage() {
  const mapRef=useRef(null), mapInstanceRef=useRef(null), markersRef=useRef({}), pulseMarkersRef=useRef({}), leafletRef=useRef(null);
  const [villages,setVillages]=useState(()=>VILLAGES_DATA.map(v=>({...v,issues:0})));
  const [issues,setIssues]=useState([]);
  const [volunteers,setVolunteers]=useState([]);
  const [selIssue,setSelIssue]=useState(null);
  const [selVol,setSelVol]=useState(null);
  const [modal,setModal]=useState({open:false,issue:null});
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState({show:false,icon:"",msg:""});
  const [assigning,setAssigning]=useState(false);

  // volunteers
  useEffect(()=>{
    const unsub=onSnapshot(query(collection(db,"users"),where("role","==","volunteer")),snap=>{
      const vols=snap.docs.map((d,i)=>({id:d.id,...d.data(),color:VOL_COLORS[i%VOL_COLORS.length],init:initials(d.data().name),avail:d.data().available!==false}));
      setVolunteers(vols);
      window.__volunteers=vols;
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
        {attribution: key?"© Google Maps":"© OpenStreetMap", maxZoom:20, tileSize:256}
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
      const counts={};
      docs.filter(i=>!i.assigned).forEach(i=>VILLAGES_DATA.forEach(v=>{if(i.location?.toLowerCase().includes(v.name.toLowerCase())||i.village?.toLowerCase()===v.name.toLowerCase()||i.villageId===v.id)counts[v.id]=(counts[v.id]||0)+1;}));
      setVillages(prev=>{const u=prev.map(v=>({...v,issues:counts[v.id]||0}));if(leafletRef.current&&mapInstanceRef.current)u.forEach(v=>refreshMarkerDirect(leafletRef.current,mapInstanceRef.current,v));return u;});
    });
    return ()=>unsub();
  },[]);

  // window globals
  useEffect(()=>{
    window.__openReportModal=()=>{};
    window.__assignFromMap=async(villageId,volName)=>{
      if(!volName)return;
      const vName=VILLAGES_DATA.find(v=>v.id===villageId)?.name?.toLowerCase();
      const target=issues.find(i=>!i.assigned&&i.status!=="resolved"&&(i.villageId===villageId||i.village?.toLowerCase()===vName));
      if(!target){showToast("⚠️","No unassigned issue for this village");return;}
      try{await updateDoc(doc(db,"reports",target.id),{assigned:true,assignedTo:volName,status:"assigned"});showToast("🤝",`${volName} assigned`);}
      catch(e){console.error(e);showToast("❌","Assignment failed");}
    };
    return()=>{delete window.__openReportModal;delete window.__assignFromMap;};
  },[issues]);

  const getColor=v=>v.issues>0?"#ef4444":(v.type==="city"||v.type==="town")?"#3b82f6":"#22c55e";
  const getRadius=v=>v.type==="city"?11:v.type==="town"?8:6;

  const buildPopupHTML=v=>{
    const badge=v.issues>0?`<span style="background:rgba(239,68,68,0.15);color:#f87171;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">⚠ ${v.issues} Issues</span>`:`<span style="background:rgba(34,197,94,0.12);color:#4ade80;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">✓ Zone Secure</span>`;
    const assignBlock=v.issues>0?`<div style="margin-top:10px"><select id="vsel-${v.id}" style="width:100%;background:#0d1f12;border:1px solid rgba(134,239,172,0.2);color:#e8f5e9;font-size:11px;padding:6px 8px;border-radius:6px;margin-bottom:6px"><option value="">— Select volunteer —</option>${(window.__volunteers||[]).map(vol=>`<option value="${vol.name}">${vol.name}${vol.avail?"":" (busy)"}</option>`).join("")}</select><button onclick="(function(){var s=document.getElementById('vsel-${v.id}');if(s&&s.value)window.__assignFromMap(${v.id},s.value);})()" style="width:100%;background:#16a34a;border:none;color:white;font-size:11px;font-weight:700;padding:8px;border-radius:6px;cursor:pointer">Assign Volunteer</button></div>`:"";
    return `<div style="font-family:'Outfit',sans-serif;min-width:190px;padding:4px"><div style="font-weight:700;font-size:14px;color:#f8fafc;margin-bottom:2px">${v.name}</div><div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${v.hi} · ${v.type.toUpperCase()}</div><div>${badge}</div>${assignBlock}</div>`;
  };

  const addMarker=(L,map,v)=>{
    const c=getColor(v),r=getRadius(v);
    if(v.issues>0)pulseMarkersRef.current[v.id]=L.circleMarker([v.lat,v.lng],{radius:r+10,color:"#ef4444",fillColor:"#ef4444",fillOpacity:0.05,weight:1,opacity:0.3}).addTo(map);
    const m=L.circleMarker([v.lat,v.lng],{radius:r,color:c,fillColor:c,fillOpacity:v.issues>0?0.9:0.7,weight:2}).addTo(map);
    m.bindPopup(buildPopupHTML(v));
    markersRef.current[v.id]=m;
  };

  const refreshMarkerDirect=(L,map,v)=>{
    if(markersRef.current[v.id]){markersRef.current[v.id].remove();delete markersRef.current[v.id];}
    if(pulseMarkersRef.current[v.id]){pulseMarkersRef.current[v.id].remove();delete pulseMarkersRef.current[v.id];}
    addMarker(L,map,v);
  };

  const doAssign=async(issue,volName)=>{
    if(!issue||!volName)return;
    setAssigning(true);
    try{await updateDoc(doc(db,"reports",issue.id),{assigned:true,assignedTo:volName,status:"assigned"});showToast("🤝",`${volName} deployed`);setSelIssue(null);setSelVol(null);}
    catch(e){console.error(e);}
    finally{setAssigning(false);}
  };

  const showToast=(icon,msg)=>{setToast({show:true,icon,msg});setTimeout(()=>setToast(t=>({...t,show:false})),3500);};
  const flyToVillage=v=>{mapInstanceRef.current?.flyTo([v.lat,v.lng],13,{duration:1.2});setTimeout(()=>markersRef.current[v.id]?.openPopup(),1300);};

  const fv=villages.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.hi.includes(search));
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

          {/* ISSUES */}
          <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,overflow:"hidden",marginBottom:20}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:3,height:14,background:"#f87171",borderRadius:2}}/><span style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(232,245,233,0.35)"}}>Active Issues</span></div>
              <span style={{fontSize:"0.65rem",padding:"3px 10px",borderRadius:100,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171"}}>{issues.filter(i=>!i.assigned&&i.status!=="resolved").length} unresolved</span>
            </div>
            {issues.length===0?(
              <div style={{padding:"48px 24px",textAlign:"center"}}>
                <div style={{fontSize:"1.8rem",marginBottom:10,opacity:0.3}}>📋</div>
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
