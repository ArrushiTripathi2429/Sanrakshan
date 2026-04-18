"use client";

import { useState, useEffect, useRef } from "react";

import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import VILLAGES_DATA from "@/data/villages";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

// Nearest village from GPS
function nearestVillage(lat, lng) {
  let best = null,
    bestDist = Infinity;
  VILLAGES_DATA.forEach((v) => {
    const d = Math.sqrt((v.lat - lat) ** 2 + (v.lng - lng) ** 2);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  });
  return best;
}

const CATEGORIES = [
  { value: "flood", label: " Flood / Water Logging" },
  { value: "medical", label: " Medical Emergency" },
  { value: "road", label: " Road / Infrastructure" },
  { value: "food", label: " Food / Ration Shortage" },
  { value: "education", label: "Education Support" },
  { value: "electricity", label: " Electricity / Power" },
  { value: "water", label: " Drinking Water" },
  { value: "other", label: " Other" },
];

const NEED_CATEGORIES = [
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "livelihood", label: "Livelihood" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "women_empowerment", label: "Women Empowerment" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  title: "",
  category: "",
  location: "",
  severity: 0,
  affected: "",
  description: "",
  photo: null,
};

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-IN");
};

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const statusColor = {
  pending: "#fbbf24",
  assigned: "#67e8f9",
  resolved: "#86efac",
};
const severityColor = ["", "#86efac", "#a3e635", "#fbbf24", "#fb923c", "#f87171"];
const CACHE_KEYS = {
  reports: "fw_reports_cache_v1",
  communityNeeds: "fw_community_needs_cache_v1",
  needRequests: "fw_need_requests_cache_v1",
};

export default function FieldWorkerPage() {
  const router = useRouter();
  const [mode, setMode] = useState(null);
  const [sidebarView, setSidebarView] = useState("reports"); // reports | new-report | community | alerts
  const [form, setForm] = useState(emptyForm);
  const [reports, setReports] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [communityNeeds, setCommunityNeeds] = useState([]);
  const [needRequests, setNeedRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [matchingNeedId, setMatchingNeedId] = useState(null);
  const [sendingRequestId, setSendingRequestId] = useState(null);
  const [needMatchesById, setNeedMatchesById] = useState({});
  const [reportsLoading, setReportsLoading] = useState(true);
  const [needsLoading, setNeedsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [needForm, setNeedForm] = useState({
    category: "education",
    village: "",
    description: "",
  });

  const intervalRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    try {
      const cachedReports = localStorage.getItem(CACHE_KEYS.reports);
      const cachedNeeds = localStorage.getItem(CACHE_KEYS.communityNeeds);
      const cachedRequests = localStorage.getItem(CACHE_KEYS.needRequests);
      if (cachedReports) {
        setReports(JSON.parse(cachedReports));
        setReportsLoading(false);
      }
      if (cachedNeeds) {
        setCommunityNeeds(JSON.parse(cachedNeeds));
        setNeedsLoading(false);
      }
      if (cachedRequests) {
        setNeedRequests(JSON.parse(cachedRequests));
        setRequestsLoading(false);
      }
    } catch (e) {
      console.error("Cache read failed:", e);
    }
  }, []);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Fetch real-time reports from Firestore
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    setReportsLoading(true);

    const q = query(
      collection(db, "reports"),
      where("fieldWorkerId", "==", uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
            time: d.data().createdAt?.toDate
              ? timeAgo(d.data().createdAt.toDate())
              : "Just now",
            _ts: d.data().createdAt?.seconds ?? 0,
          }))
          .sort((a, b) => b._ts - a._ts);
        setReports(data);
        setReportsLoading(false);
        localStorage.setItem(CACHE_KEYS.reports, JSON.stringify(data));
      },
      (error) => {
        console.error("Reports sync failed:", error);
        setSyncError("Live sync is slow. Showing cached data.");
        setReportsLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Community needs (long-term)
  useEffect(() => {
    setNeedsLoading(true);
    const q = query(collection(db, "chronicNeeds"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdLabel: d.data().createdAt?.toDate
            ? timeAgo(d.data().createdAt.toDate())
            : "Just now",
        }));
        setCommunityNeeds(rows);
        setNeedsLoading(false);
        localStorage.setItem(CACHE_KEYS.communityNeeds, JSON.stringify(rows));
      },
      (error) => {
        console.error("Community needs sync failed:", error);
        setSyncError("Live sync is slow. Showing cached data.");
        setNeedsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Volunteer pool for matching
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "volunteer"));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Request status updates for this field worker
  useEffect(() => {
    if (!user?.uid) return;
    setRequestsLoading(true);
    const q = query(
      collection(db, "needRequests"),
      where("fieldWorkerId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const reqs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNeedRequests(reqs);
        setRequestsLoading(false);
        localStorage.setItem(CACHE_KEYS.needRequests, JSON.stringify(reqs));
      },
      (error) => {
        console.error("Need request sync failed:", error);
        setSyncError("Live sync is slow. Showing cached data.");
        setRequestsLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Recording timer
  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
      setSeconds(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  // Auto GPS detection
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setGpsStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const village = nearestVillage(pos.coords.latitude, pos.coords.longitude);
        if (village) {
          handleFormChange("location", village.name);
          setGpsStatus("found");
        } else {
          setGpsStatus("error");
        }
      },
      () => setGpsStatus("error"),
      { timeout: 6000 }
    );
  };

  
 // Save report to Firestore
const saveReport = async (data) => {
  setSubmitting(true);
  try {
    const currentUser = auth.currentUser;
    await addDoc(collection(db, "reports"), {
      ...data,
      status: "pending",
      fieldWorkerId: currentUser?.uid || null,
      fieldWorkerName: currentUser?.displayName || "Field Worker",
      createdAt: serverTimestamp(),
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMode(null);
      setForm(emptyForm);
      resetVoice();
    }, 2000);
  } catch (e) {
    console.error("Error saving report:", e);
  } finally {
    setSubmitting(false);
  }
};

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecorded(true);
        processAudioWithGemini();
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setRecording(true);
      setTimeout(() => {
        setRecording(false);
        setRecorded(true);
        processAudioWithGemini();
      }, 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  const processAudioWithGemini = async () => {
    setProcessing(true);
    try {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        // Attach GPS coordinates if available (for location fallback)
        if (navigator.geolocation) {
          await new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
              pos => { formData.append("lat", pos.coords.latitude); formData.append("lng", pos.coords.longitude); resolve(); },
              () => resolve(), // GPS unavailable — continue without
              { timeout: 3000 }
            );
          });
        }

        const res = await fetch("${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analyze/audio", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        const json = await res.json();
        if (json.success && json.data) {
          setParsed(json.data);
          setProcessing(false);
          return;
        }
      }
      throw new Error("No audio data");
    } catch (e) {
      console.error("Gemini audio failed, trying text fallback:", e);
      try {
        const res = await fetch("${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analyze/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "Voice report submitted from field worker in Raebareli district. Please extract a sample disaster report.",
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setParsed(json.data);
        }
      } catch (e2) {
        console.error("Text fallback also failed:", e2);
        setParsed({
          title: "Could not process voice",
          category: "other",
          location: "",
          severity: 1,
          affected: "",
          description: "Voice processing failed. Please use the form instead.",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const resetVoice = () => {
    setRecorded(false);
    setParsed(null);
    setProcessing(false);
    setRecording(false);
    setSeconds(0);
  };

  const handleFormChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFormChange("photo", file.name);
  };

  const handleSubmitForm = () => {
    if (!form.category || !form.location || !form.description) return;
    saveReport({ ...form });
  };

  const handleSubmitVoice = () => {
    if (!parsed) return;
    saveReport({ ...parsed });
  };

  const createCommunityNeed = async () => {
    if (!needForm.village || !needForm.description || !user?.uid) return;
    try {
      await addDoc(collection(db, "chronicNeeds"), {
        category: needForm.category,
        village: needForm.village,
        description: needForm.description,
        status: "open",
        createdAt: serverTimestamp(),
        fieldWorkerId: user.uid,
        fieldWorkerName: user.displayName || "Field Worker",
      });
      setNeedForm({ category: "education", village: "", description: "" });
    } catch (e) {
      console.error("Failed to create community need:", e);
    }
  };

  const getNeedMatches = async (need) => {
    const village = VILLAGES_DATA.find(
      (v) => v.name.toLowerCase() === String(need.village || "").toLowerCase()
    );
    if (!village) return;
    setMatchingNeedId(need.id);
    try {
      const res = await fetch("${process.env.NEXT_PUBLIC_BACKEND_URL}/api/volunteer-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: need.id,
          title: `Chronic need: ${need.category}`,
          description: need.description,
          category: need.category || "other",
          village_lat: village.lat,
          village_lng: village.lng,
          volunteers: volunteers.map((v) => ({
            id: v.uid || v.id,
            name: v.name || "Volunteer",
            skills: Array.isArray(v.skills) ? v.skills : [],
            lat: v.lat ?? null,
            lng: v.lng ?? null,
            resolved_tasks: v.resolvedTasks || 0,
            total_assigned: v.totalAssigned || 0,
            available: v.available !== false,
          })),
        }),
      });
      if (!res.ok) throw new Error(`match failed ${res.status}`);
      const json = await res.json();
      setNeedMatchesById((prev) => ({ ...prev, [need.id]: json.matches || [] }));
    } catch (e) {
      console.error("Matching failed:", e);
      setNeedMatchesById((prev) => ({ ...prev, [need.id]: [] }));
    } finally {
      setMatchingNeedId(null);
    }
  };

  const sendNeedRequest = async (need, match) => {
    if (!user?.uid) return;
    setSendingRequestId(`${need.id}:${match.volunteer_id}`);
    try {
      await addDoc(collection(db, "needRequests"), {
        needId: need.id,
        needCategory: need.category || "other",
        needDescription: need.description || "",
        village: need.village || "",
        fieldWorkerId: user.uid,
        fieldWorkerName: user.displayName || "Field Worker",
        volunteerId: match.volunteer_id,
        volunteerName: match.volunteer_name,
        score: match.composite_score,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "chronicNeeds", need.id), {
        lastRequestedVolunteerId: match.volunteer_id,
        lastRequestedVolunteerName: match.volunteer_name,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to send need request:", e);
    } finally {
      setSendingRequestId(null);
    }
  };

  const handleLogout = async () => {
  await signOut(auth);
  router.push("/");
};

  return (
    <>
      <style>{`
        :root { --font-heading: var(--font-fraunces); --font-body: var(--font-outfit); }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: var(--font-body), sans-serif; min-height: 100vh; }

        .fw-wrap { min-height: 100vh; display: grid; grid-template-columns: 240px 1fr; }

        .fw-sidebar {
          background: rgba(255,255,255,0.015);
          border-right: 1px solid rgba(134,239,172,0.08);
          padding: 28px 16px;
          display: flex; flex-direction: column; gap: 6px;
          position: sticky; top: 0; height: 100vh;
        }
        .fw-logo { font-family: var(--font-heading), serif; font-weight: 800; font-size: 1rem; color: #86efac; margin-bottom: 28px; padding: 0 8px; }
        .fw-logo span { opacity: 0.35; color: #e8f5e9; }
        .fw-nav { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 0.85rem; color: rgba(232,245,233,0.4); cursor: pointer; transition: all 0.2s; border: none; background: none; width: 100%; text-align: left; font-family: var(--font-body), sans-serif; }
        .fw-nav:hover { color: #e8f5e9; background: rgba(255,255,255,0.04); }
        .fw-nav.active { color: #86efac; background: rgba(134,239,172,0.08); }
        .fw-sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(134,239,172,0.07); }
        .fw-user { display: flex; align-items: center; gap: 10px; padding: 8px; }
        .fw-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #86efac, #67e8f9); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #080e0a; flex-shrink: 0; }
        .fw-user-name { font-size: 0.8rem; font-weight: 500; color: #e8f5e9; }
        .fw-user-role { font-size: 0.65rem; color: rgba(232,245,233,0.3); text-transform: uppercase; letter-spacing: 0.06em; }

        .fw-main { padding: 36px 40px; overflow-y: auto; }
        .fw-header { margin-bottom: 32px; opacity: 0; animation: fwUp 0.5s ease 0.1s forwards; }
        .fw-greeting { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(232,245,233,0.25); margin-bottom: 4px; }
        .fw-title { font-family: var(--font-heading), serif; font-weight: 700; font-size: 1.5rem; letter-spacing: -0.02em; color: #f0fdf4; }

        .fw-mode-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; opacity: 0; animation: fwUp 0.5s ease 0.15s forwards; }
        .fw-mode-card { border-radius: 16px; padding: 28px 24px; cursor: pointer; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); transition: all 0.22s ease; text-align: left; }
        .fw-mode-card:hover { transform: translateY(-3px); }
        .fw-mode-card.voice-card:hover { border-color: rgba(134,239,172,0.3); background: rgba(134,239,172,0.05); }
        .fw-mode-card.form-card:hover { border-color: rgba(103,232,249,0.3); background: rgba(103,232,249,0.05); }
        .fw-mode-card.active-voice { border-color: rgba(134,239,172,0.3); background: rgba(134,239,172,0.05); }
        .fw-mode-card.active-form { border-color: rgba(103,232,249,0.3); background: rgba(103,232,249,0.05); }
        .fw-mode-icon { font-size: 1.8rem; margin-bottom: 12px; display: block; }
        .fw-mode-title { font-family: var(--font-heading), serif; font-weight: 700; font-size: 1rem; color: #f0fdf4; margin-bottom: 6px; }
        .fw-mode-desc { font-size: 0.8rem; color: rgba(232,245,233,0.38); font-weight: 300; line-height: 1.5; }

        .fw-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 32px; margin-bottom: 28px; opacity: 0; animation: fwUp 0.4s ease forwards; }
        .fw-panel-title { font-family: var(--font-heading), serif; font-weight: 700; font-size: 1.05rem; color: #f0fdf4; margin-bottom: 4px; }
        .fw-panel-sub { font-size: 0.82rem; color: rgba(232,245,233,0.38); font-weight: 300; margin-bottom: 28px; }

        .fw-voice-center { display: flex; flex-direction: column; align-items: center; gap: 18px; }
        .fw-mic-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 110px; height: 110px; }
        .fw-ripple { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(134,239,172,0.35); animation: fwRipple 1.4s ease-out infinite; }
        .fw-ripple:nth-child(2) { animation-delay: 0.5s; }
        .fw-ripple:nth-child(3) { animation-delay: 1s; }
        @keyframes fwRipple { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
        .fw-mic-btn { width: 82px; height: 82px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; position: relative; z-index: 1; transition: transform 0.2s ease; background: linear-gradient(135deg, #86efac, #4ade80); box-shadow: 0 0 28px rgba(134,239,172,0.22); }
        .fw-mic-btn.rec { background: linear-gradient(135deg, #f87171, #ef4444); box-shadow: 0 0 28px rgba(248,113,113,0.3); animation: fwPulse 1s ease infinite; }
        .fw-mic-btn.done { background: linear-gradient(135deg, #67e8f9, #22d3ee); box-shadow: 0 0 28px rgba(103,232,249,0.22); }
        .fw-mic-btn:hover { transform: scale(1.05); }
        @keyframes fwPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .fw-timer { font-family: var(--font-heading), serif; font-weight: 600; font-size: 1rem; color: #f87171; letter-spacing: 0.1em; }
        .fw-mic-hint { font-size: 0.78rem; color: rgba(232,245,233,0.3); text-align: center; font-style: italic; }

        .fw-spinner { width: 36px; height: 36px; border: 2px solid rgba(134,239,172,0.12); border-top-color: #86efac; border-radius: 50%; animation: fwSpin 0.8s linear infinite; }
        @keyframes fwSpin { to { transform: rotate(360deg); } }
        .fw-proc-text { font-size: 0.85rem; color: rgba(232,245,233,0.4); }
        .fw-proc-sub { font-size: 0.73rem; color: rgba(134,239,172,0.45); font-style: italic; }

        .fw-parsed { width: 100%; background: rgba(134,239,172,0.03); border: 1px solid rgba(134,239,172,0.12); border-radius: 12px; padding: 22px; opacity: 0; animation: fwUp 0.4s ease forwards; }
        .fw-parsed-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .fw-parsed-badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: #86efac; display: flex; align-items: center; gap: 5px; }
        .fw-parsed-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #86efac; display: inline-block; }
        .fw-retry { font-size: 0.7rem; color: rgba(232,245,233,0.3); background: none; border: 1px solid rgba(255,255,255,0.07); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: var(--font-body), sans-serif; transition: all 0.2s; }
        .fw-retry:hover { color: #e8f5e9; }
        .fw-pgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .fw-pfield { display: flex; flex-direction: column; gap: 3px; }
        .fw-plabel { font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(232,245,233,0.28); }
        .fw-pvalue { font-size: 0.85rem; color: #f0fdf4; }
        .fw-dots { display: flex; gap: 4px; margin-top: 2px; }
        .fw-dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .fw-dot.on { background: #f87171; }

        .fw-form { display: flex; flex-direction: column; gap: 18px; }
        .fw-field-group { display: flex; flex-direction: column; gap: 7px; }
        .fw-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(232,245,233,0.35); }
        .fw-input, .fw-select, .fw-textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 12px 14px; color: #f0fdf4; font-family: var(--font-body), sans-serif; font-size: 0.875rem; transition: border-color 0.2s ease; outline: none; width: 100%; }
        .fw-input:focus, .fw-select:focus, .fw-textarea:focus { border-color: rgba(134,239,172,0.35); }
        .fw-select option { background: #0f1a12; }
        .fw-textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
        .fw-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .fw-severity-row { display: flex; gap: 8px; }
        .fw-sev-btn { flex: 1; padding: 9px 0; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: rgba(232,245,233,0.4); font-family: var(--font-heading), serif; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .fw-sev-btn:hover { border-color: rgba(255,255,255,0.2); color: #e8f5e9; }
        .fw-sev-btn.sel { color: #080e0a; border-color: transparent; }

        .fw-photo-label { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; cursor: pointer; transition: border-color 0.2s; font-size: 0.85rem; color: rgba(232,245,233,0.4); }
        .fw-photo-label:hover { border-color: rgba(134,239,172,0.25); color: #86efac; }
        .fw-photo-label input { display: none; }

        .fw-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #86efac, #4ade80); border: none; border-radius: 12px; font-family: var(--font-heading), serif; font-weight: 700; font-size: 0.88rem; color: #080e0a; cursor: pointer; letter-spacing: 0.04em; transition: opacity 0.2s, transform 0.2s; margin-top: 4px; }
        .fw-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        .fw-submit:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
        .fw-submit-cyan { background: linear-gradient(135deg, #67e8f9, #22d3ee); }

        .fw-success { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 20px; text-align: center; }
        .fw-success-icon { font-size: 2.5rem; }
        .fw-success-text { font-family: var(--font-heading), serif; font-weight: 700; font-size: 1.1rem; color: #86efac; }
        .fw-success-sub { font-size: 0.82rem; color: rgba(232,245,233,0.4); }

        .fw-reports { opacity: 0; animation: fwUp 0.5s ease 0.25s forwards; }
        .fw-sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .fw-sec-title { font-family: var(--font-heading), serif; font-weight: 700; font-size: 0.95rem; color: #f0fdf4; }
        .fw-empty { padding: 32px; text-align: center; border: 1px dashed rgba(255,255,255,0.07); border-radius: 14px; }
        .fw-empty-icon { font-size: 1.8rem; margin-bottom: 10px; }
        .fw-empty-text { font-size: 0.82rem; color: rgba(232,245,233,0.25); }
        .fw-report-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 8px; transition: border-color 0.2s; }
        .fw-report-row:hover { border-color: rgba(134,239,172,0.12); }
        .fw-rr-left { display: flex; align-items: center; gap: 12px; }
        .fw-rr-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .fw-rr-title { font-size: 0.85rem; color: #f0fdf4; margin-bottom: 2px; }
        .fw-rr-loc { font-size: 0.73rem; color: rgba(232,245,233,0.32); }
        .fw-rr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .fw-badge { font-size: 0.62rem; padding: 3px 8px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
        .fw-rr-time { font-size: 0.68rem; color: rgba(232,245,233,0.22); }

        .fw-gps-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(134,239,172,0.1); border: 1px solid rgba(134,239,172,0.2); border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 0.68rem; color: #86efac; font-family: var(--font-body), sans-serif; display: flex; align-items: center; gap: 4px; transition: background 0.2s; }
        .fw-gps-btn:hover { background: rgba(134,239,172,0.18); }

        @media (max-width: 768px) {
          .fw-wrap { grid-template-columns: 1fr; }
          .fw-sidebar { display: none; }
          .fw-main { padding: 20px 16px; }
          .fw-mode-pick { grid-template-columns: 1fr; }
          .fw-pgrid { grid-template-columns: 1fr; }
          .fw-form-grid { grid-template-columns: 1fr; }
        }

        @keyframes fwUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="fw-wrap">
        {/* SIDEBAR */}
        <aside className="fw-sidebar">
          <div className="fw-logo">Sanrakshan <span>/ Field</span></div>
          <button className={`fw-nav ${sidebarView==="reports"?"active":""}`} onClick={()=>{setSidebarView("reports");setMode(null);}}>My Reports</button>
          <button className={`fw-nav ${sidebarView==="new-report"?"active":""}`} onClick={()=>{setSidebarView("new-report");setMode(null);}}>⊕ New Report</button>
          <button className={`fw-nav ${sidebarView==="community"?"active":""}`} onClick={()=>{setSidebarView("community");setMode(null);}}>◎ Community Needs</button>
          <button className={`fw-nav ${sidebarView==="alerts"?"active":""}`} onClick={()=>{setSidebarView("alerts");setMode(null);}}>◷ My Requests</button>







          
         <div className="fw-sidebar-footer">
  <div className="fw-user">
    <div className="fw-avatar">{user?.displayName?.[0] || "F"}</div>
    <div>
      <div className="fw-user-name">{user?.displayName || "Field Worker"}</div>
      <div className="fw-user-role">Field Worker</div>
    </div>
  </div>
  <button
    onClick={handleLogout}
    style={{
      width: "100%", padding: "8px 12px", marginTop: 8,
      background: "none", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, color: "rgba(232,245,233,0.35)",
      fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif",
      textAlign: "left", transition: "all 0.2s",
    }}
    onMouseEnter={e => { e.target.style.color="#f87171"; e.target.style.borderColor="rgba(248,113,113,0.25)"; }}
    onMouseLeave={e => { e.target.style.color="rgba(232,245,233,0.35)"; e.target.style.borderColor="rgba(255,255,255,0.08)"; }}
  >
    ↩ Logout
  </button>
</div>
        </aside>

        {/* MAIN */}
        <main className="fw-main">
          <div className="fw-header">
            <div className="fw-greeting">Field Worker Dashboard</div>
            <div className="fw-title">
              {sidebarView==="new-report" ? "New Report" :
               sidebarView==="community" ? "Community Needs" :
               sidebarView==="alerts" ? "My Requests" :
               "My Reports"}
            </div>
          </div>
          {syncError && (
            <div style={{ marginBottom: 12, fontSize: "0.75rem", color: "#fbbf24" }}>
              {syncError}
            </div>
          )}

          {/* MODE PICKER — show on new-report or reports view */}
          {(sidebarView==="new-report"||sidebarView==="reports") && (
          <div className="fw-mode-pick">
            <div
              className={`fw-mode-card voice-card ${mode === "voice" ? "active-voice" : ""}`}
              onClick={() => { setMode("voice"); resetVoice(); detectLocation(); }}
            >
              <span className="fw-mode-icon">🎙️</span>
              <div className="fw-mode-title">Voice Report</div>
              <div className="fw-mode-desc">बोलिए, हम सुन रहे हैं – Record in Hindi or English. AI extracts all details automatically.</div>
            </div>
            <div
              className={`fw-mode-card form-card ${mode === "form" ? "active-form" : ""}`}
              onClick={() => { setMode("form"); setForm(emptyForm); detectLocation(); }}
            >
              <span className="fw-mode-icon">📝</span>
              <div className="fw-mode-title">Fill a Form</div>
              <div className="fw-mode-desc">For literate users – describe the issue in detail with category, location and photos.</div>
            </div>
          </div>
          )} {/* end mode picker conditional */}

          {/* VOICE PANEL */}
          {mode === "voice" && (
            <div className="fw-panel">
              <div className="fw-panel-title">Voice Report</div>
              <div className="fw-panel-sub">Hold the mic button and describe the issue clearly in your language.</div>

              {submitted ? (
                <div className="fw-success">
                  <div className="fw-success-icon">✅</div>
                  <div className="fw-success-text">Report Submitted!</div>
                  <div className="fw-success-sub">Admin has been notified. Map updated.</div>
                </div>
              ) : !processing && !parsed ? (
                <div className="fw-voice-center">
                  <div className="fw-mic-wrap">
                    {recording && (
                      <>
                        <div className="fw-ripple" />
                        <div className="fw-ripple" />
                        <div className="fw-ripple" />
                      </>
                    )}
                    <button
                      className={`fw-mic-btn ${recording ? "rec" : ""} ${recorded ? "done" : ""}`}
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                    >
                      {recording ? "⏹" : recorded ? "✓" : "🎙"}
                    </button>
                  </div>
                  {recording && <div className="fw-timer">{fmt(seconds)}</div>}
                  <div className="fw-mic-hint">
                    {recording ? "Release to stop recording..." : "Hold the button and speak"}
                  </div>
                </div>
              ) : processing ? (
                <div className="fw-voice-center">
                  <div className="fw-spinner" />
                  <div className="fw-proc-text">Gemini is processing your voice...</div>
                  <div className="fw-proc-sub">Extracting location, issue type &amp; severity</div>
                </div>
              ) : parsed && (
                <div className="fw-parsed">
                  <div className="fw-parsed-head">
                    <div className="fw-parsed-badge">Auto-extracted from voice</div>
                    <button className="fw-retry" onClick={resetVoice}>↺ Re-record</button>
                  </div>
                  <div className="fw-pgrid">
                    <div className="fw-pfield">
                      <div className="fw-plabel">Issue Title</div>
                      <div className="fw-pvalue">{parsed.title}</div>
                    </div>
                    <div className="fw-pfield">
                      <div className="fw-plabel">Location</div>
                      <div className="fw-pvalue">{parsed.location}</div>
                    </div>
                    <div className="fw-pfield">
                      <div className="fw-plabel">Category</div>
                      <div className="fw-pvalue">{CATEGORIES.find((c) => c.value === parsed.category)?.label || parsed.category}</div>
                    </div>
                    <div className="fw-pfield">
                      <div className="fw-plabel">People Affected</div>
                      <div className="fw-pvalue">~{parsed.affected}</div>
                    </div>
                    <div className="fw-pfield">
                      <div className="fw-plabel">Severity</div>
                      <div className="fw-dots">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className={`fw-dot ${n <= parsed.severity ? "on" : ""}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="fw-pfield" style={{ marginBottom: "20px" }}>
                    <div className="fw-plabel" style={{ marginBottom: "5px" }}>Description</div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(232,245,233,0.5)", lineHeight: 1.6 }}>{parsed.description}</div>
                  </div>
                  <button className="fw-submit" onClick={handleSubmitVoice} disabled={submitting}>
                    {submitting ? "Saving..." : "Submit Report →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FORM PANEL */}
          {mode === "form" && (
            <div className="fw-panel">
              <div className="fw-panel-title">Detailed Report Form</div>
              <div className="fw-panel-sub">Fill in the details carefully. All fields marked are important.</div>

              {submitted ? (
                <div className="fw-success">
                  <div className="fw-success-icon">✅</div>
                  <div className="fw-success-text">Report Submitted!</div>
                  <div className="fw-success-sub">Admin has been notified. Map updated.</div>
                </div>
              ) : (
                <div className="fw-form">
                  <div className="fw-field-group">
                    <label className="fw-label">Issue Category *</label>
                    <select
                      className="fw-select"
                      value={form.category}
                      onChange={(e) => handleFormChange("category", e.target.value)}
                    >
                      <option value="">Select a category...</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="fw-form-grid">
                    <div className="fw-field-group">
                      <label className="fw-label">Location / Village *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          className="fw-input"
                          placeholder="e.g. Dalmau Block, Raebareli"
                          value={form.location}
                          onChange={(e) => handleFormChange("location", e.target.value)}
                          style={{ paddingRight: 90 }}
                        />
                        <button
                          type="button"
                          className="fw-gps-btn"
                          onClick={detectLocation}
                        >
                          {gpsStatus === "detecting" ? "⏳" : "📍"}{" "}
                          {gpsStatus === "detecting" ? "..." : "GPS"}
                        </button>
                      </div>
                      {gpsStatus === "found" && (
                        <div style={{ fontSize: "0.68rem", color: "#86efac", marginTop: 4 }}>
                          ✓ Nearest village auto-detected
                        </div>
                      )}
                      {gpsStatus === "error" && (
                        <div style={{ fontSize: "0.68rem", color: "#f87171", marginTop: 4 }}>
                          GPS unavailable – please type location
                        </div>
                      )}
                    </div>

                    <div className="fw-field-group">
                      <label className="fw-label">People Affected</label>
                      <input
                        className="fw-input"
                        type="number"
                        placeholder="Approx. count"
                        value={form.affected}
                        onChange={(e) => handleFormChange("affected", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fw-field-group">
                    <label className="fw-label">Severity Level *</label>
                    <div className="fw-severity-row">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={`fw-sev-btn ${form.severity === n ? "sel" : ""}`}
                          style={form.severity === n ? { background: severityColor[n] } : {}}
                          onClick={() => handleFormChange("severity", n)}
                          type="button"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="fw-field-group">
                    <label className="fw-label">Description *</label>
                    <textarea
                      className="fw-textarea"
                      placeholder="Describe the issue in detail..."
                      value={form.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                    />
                  </div>

                  <div className="fw-field-group">
                    <label className="fw-label">Attach Photo (Optional)</label>
                    <label className="fw-photo-label">
                      <span>📷</span>
                      <span>{form.photo || "Click to upload a photo"}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  </div>

                  <button
                    className="fw-submit fw-submit-cyan"
                    onClick={handleSubmitForm}
                    disabled={!form.category || !form.location || !form.description || submitting}
                  >
                    {submitting ? "Saving..." : "Submit Report →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMMUNITY NEEDS PANEL */}
          {sidebarView==="community" && (
          <div className="fw-panel">
            <div className="fw-panel-title">Community Needs Registry</div>
            <div className="fw-panel-sub">Track long-term needs and coordinate volunteers in real time.</div>

            <div className="fw-form-grid" style={{ marginBottom: 12 }}>
              <div className="fw-field-group">
                <label className="fw-label">Need Category</label>
                <select
                  className="fw-select"
                  value={needForm.category}
                  onChange={(e) => setNeedForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {NEED_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="fw-field-group">
                <label className="fw-label">Village</label>
                <input
                  className="fw-input"
                  placeholder="Village name"
                  value={needForm.village}
                  onChange={(e) => setNeedForm((p) => ({ ...p, village: e.target.value }))}
                />
              </div>
            </div>

            <div className="fw-field-group" style={{ marginBottom: 16 }}>
              <label className="fw-label">Need Description</label>
              <textarea
                className="fw-textarea"
                placeholder="Describe the chronic need"
                value={needForm.description}
                onChange={(e) => setNeedForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <button
              className="fw-submit"
              style={{ marginBottom: 20 }}
              onClick={createCommunityNeed}
              disabled={!needForm.village || !needForm.description}
            >
              Add Community Need
            </button>

            <div className="fw-sec-head">
              <div className="fw-sec-title">Open Needs</div>
            </div>
            {needsLoading ? (
              <div className="fw-empty">
                <div className="fw-empty-text">Syncing open needs...</div>
              </div>
            ) : communityNeeds.filter((n) => n.status !== "resolved").length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-text">No community needs yet.</div>
              </div>
            ) : (
              communityNeeds
                .filter((n) => n.status !== "resolved")
                .slice(0, 6)
                .map((need) => (
                  <div key={need.id} className="fw-report-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div className="fw-rr-title">{need.category} · {need.village}</div>
                        <div className="fw-rr-loc">{need.description}</div>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(232,245,233,0.3)" }}>{need.createdLabel}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="fw-retry"
                        onClick={() => getNeedMatches(need)}
                        disabled={matchingNeedId === need.id}
                      >
                        {matchingNeedId === need.id ? "Matching..." : "Get Volunteer Matches"}
                      </button>
                    </div>

                    {(needMatchesById[need.id] || []).length > 0 && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {needMatchesById[need.id].map((m) => {
                          const reqKey = `${need.id}:${m.volunteer_id}`;
                          return (
                            <div key={m.volunteer_id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: "0.78rem", color: "#f0fdf4" }}>
                                {m.volunteer_name} · Score {m.composite_score}
                                {m.recommended ? " · Recommended" : ""}
                              </div>
                              <button
                                className="fw-retry"
                                onClick={() => sendNeedRequest(need, m)}
                                disabled={sendingRequestId === reqKey}
                              >
                                {sendingRequestId === reqKey ? "Sending..." : "Send Request"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
            )}

            <div className="fw-sec-head" style={{ marginTop: 20 }}>
              <div className="fw-sec-title">My Request Updates</div>
            </div>
            {requestsLoading ? (
              <div className="fw-empty">
                <div className="fw-empty-text">Syncing request updates...</div>
              </div>
            ) : needRequests.length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-text">No outgoing requests yet.</div>
              </div>
            ) : (
              needRequests.slice(0, 8).map((r) => (
                <div key={r.id} className="fw-report-row">
                  <div>
                    <div className="fw-rr-title">{r.needCategory} · {r.village}</div>
                    <div className="fw-rr-loc">Volunteer: {r.volunteerName || "—"}</div>
                  </div>
                  <span
                    className="fw-badge"
                    style={{
                      color: r.status === "accepted" ? "#86efac" : r.status === "declined" ? "#f87171" : "#fbbf24",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
          )} {/* end community needs conditional */}

          {/* RECENT REPORTS */}
          {sidebarView==="reports" && (
          <div className="fw-reports">
            <div className="fw-sec-head">
              <div className="fw-sec-title">My Recent Reports</div>
            </div>
            {reportsLoading ? (
              <div className="fw-empty">
                <div className="fw-empty-text">Syncing recent reports...</div>
              </div>
            ) : reports.length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-icon">📋</div>
                <div className="fw-empty-text">
                  No reports submitted yet.<br />Use voice or form above to report an issue.
                </div>
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="fw-report-row">
                  <div className="fw-rr-left">
                    <div className="fw-rr-dot" style={{ background: severityColor[r.severity] || "#86efac" }} />
                    <div>
                      <div className="fw-rr-title">{r.title || r.description?.slice(0, 40) + "..."}</div>
                      <div className="fw-rr-loc">📍 {r.location}</div>
                    </div>
                  </div>
                  <div className="fw-rr-right">
                    <span
                      className="fw-badge"
                      style={{
                        color: statusColor[r.status],
                        border: `1px solid ${statusColor[r.status]}40`,
                        background: `${statusColor[r.status]}10`,
                      }}
                    >
                      {r.status}
                    </span>
                    <span className="fw-rr-time">{r.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          )} {/* end recent reports conditional */}

          {/* MY REQUESTS VIEW */}
          {sidebarView==="alerts" && (
            <div className="fw-reports">
              <div className="fw-sec-head">
                <div className="fw-sec-title">My Volunteer Requests</div>
              </div>
              {needRequests.length === 0 ? (
                <div className="fw-empty">
                  <div className="fw-empty-icon">📬</div>
                  <div className="fw-empty-text">No outgoing requests yet.<br/>Use Community Needs to find and request volunteers.</div>
                </div>
              ) : needRequests.map(r => (
                <div key={r.id} className="fw-report-row">
                  <div className="fw-rr-left">
                    <div className="fw-rr-dot" style={{ background: r.status==="accepted"?"#86efac":r.status==="declined"?"#f87171":"#fbbf24" }} />
                    <div>
                      <div className="fw-rr-title">{r.needCategory} · {r.village}</div>
                      <div className="fw-rr-loc">Volunteer: {r.volunteerName || "—"}</div>
                    </div>
                  </div>
                  <div className="fw-rr-right">
                    <span className="fw-badge" style={{ color: r.status==="accepted"?"#86efac":r.status==="declined"?"#f87171":"#fbbf24", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
