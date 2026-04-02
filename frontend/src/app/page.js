"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import SparklesCore from "@/components/ui/sparkles";

const dashboards = [
  {
    role: "Field Worker",
    icon: "◎",
    color: "#86efac",
    bg: "rgba(134,239,172,0.07)",
    border: "rgba(134,239,172,0.25)",
    desc: "Record voice reports in Hindi or English. AI extracts all details automatically — no forms needed.",
    tags: ["Voice Report", "Photo Upload", "Track Status"],
    path: "/field-worker",
  },
  {
    role: "Admin",
    icon: "⬡",
    color: "#67e8f9",
    bg: "rgba(103,232,249,0.07)",
    border: "rgba(103,232,249,0.25)",
    desc: "Monitor live map, view AI-ranked incidents, assign volunteers, and download PDF reports.",
    tags: ["Live Map", "AI Priority", "PDF Reports"],
    path: "/admin",
  },
  {
    role: "Volunteer",
    icon: "△",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.07)",
    border: "rgba(251,191,36,0.25)",
    desc: "See assigned tasks, get route directions to the village, and mark missions complete in real time.",
    tags: ["My Tasks", "Route Map", "Mark Done"],
    path: "/volunteer",
  },
];

const features = [
  { icon: "", title: "Voice Reports in Hindi", desc: "Field workers speak in Hindi or Bhojpuri. Gemini 2.0 Flash transcribes and extracts village, category, severity, and affected count — no literacy required.", color: "#86efac" },
  { icon: "", title: "Live Crisis Map", desc: "56 villages in Raebareli on a real-time map. Markers turn red the moment a report is submitted. Heatmap view shows crisis density across the district.", color: "#67e8f9" },
  { icon: "", title: "AI Priority Scoring", desc: "Gemini ranks every active incident 1–100 by urgency. Admin sees the most critical issues first — not just the newest ones.", color: "#f87171" },
  { icon: "", title: "Route Navigation", desc: "Volunteers get a live route map from their GPS location to the affected village. Distance and ETA shown. One tap to open Google Maps.", color: "#fbbf24" },
  { icon: "", title: "Analytics Dashboard", desc: "Real-time charts showing incidents by category, 7-day trend, and status breakdown. All driven by live Firestore data.", color: "#c084fc" },
  { icon: "", title: "PDF Incident Reports", desc: "Admin can download a full PDF summary — all incidents, villages, affected counts, assigned volunteers — in one click.", color: "#fb923c" },
];

const steps = [
  { num: "01", title: "Field Worker Reports", desc: "Holds mic, speaks in Hindi. Gemini extracts structured data. Report saved to Firestore in seconds.", color: "#86efac" },
  { num: "02", title: "Admin Analyzes & Assigns", desc: "Map turns red. AI scores the incident. Admin assigns the nearest available volunteer from the dashboard.", color: "#67e8f9" },
  { num: "03", title: "Volunteer Responds", desc: "Task appears on volunteer's phone with route map. They navigate, complete the mission, mark it done.", color: "#fbbf24" },
];

const techStack = [
  { name: "Gemini 2.0 Flash", desc: "Voice processing + priority scoring", icon: "" },
  { name: "Firebase Firestore", desc: "Real-time database", icon: "" },
  { name: "Firebase Auth", desc: "Google Sign-in", icon: "" },
  { name: "Next.js 14", desc: "Frontend framework", icon: "" },
  { name: "FastAPI", desc: "AI backend server", icon: "" },
  { name: "OpenStreetMap", desc: "Free maps + routing", icon: "" },
];

export default function HomePage() {
  const router = useRouter();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const dots = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134,239,172,${d.opacity})`; ctx.fill();
      });
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(134,239,172,${0.08*(1-dist/120)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: var(--font-outfit); overflow-x: hidden; }
        .page { min-height: 100vh; position: relative; display: flex; flex-direction: column; align-items: center; }
        .canvas { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .content { position: relative; z-index: 2; width: 100%; max-width: 1100px; padding: 0 24px; }

        /* NAV */
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 28px 0 0; opacity: 0; animation: fadeUp 0.6s ease 0.1s forwards; }
        .logo { font-family: var(--font-fraunces); font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em; color: #86efac; }
        .logo span { color: #e8f5e9; opacity: 0.4; }
        .badge { font-size: 0.7rem; font-weight: 500; padding: 5px 12px; border: 1px solid rgba(134,239,172,0.3); border-radius: 100px; color: #86efac; letter-spacing: 0.08em; text-transform: uppercase; }

        /* HERO */
        .hero { padding: 80px 0 50px; text-align: center; }
        .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: #86efac; opacity: 0; margin-bottom: 20px; animation: fadeUp 0.6s ease 0.2s forwards; }
        .h1-sub { font-family: var(--font-fraunces); font-weight: 600; font-size: clamp(1.2rem, 2.5vw, 2rem); line-height: 1.3; letter-spacing: -0.02em; color: rgba(240,253,244,0.5); opacity: 0; animation: fadeUp 0.7s ease 0.3s forwards; margin-bottom: 8px; }
        .brand { font-family: var(--font-fraunces); font-weight: 800; font-size: clamp(3rem, 10vw, 10rem); line-height: 1; letter-spacing: -0.04em; background: linear-gradient(135deg, #86efac 0%, #67e8f9 60%, #86efac 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; opacity: 0; animation: fadeUp 0.8s ease 0.4s forwards; margin-bottom: 28px; }
        .quote { font-family: var(--font-fraunces); font-style: italic; font-size: clamp(1rem, 2vw, 1.4rem); color: rgba(240,253,244,0.6); opacity: 0; animation: fadeUp 0.7s ease 0.5s forwards; margin-bottom: 16px; line-height: 1.5; }
        .subtitle { margin: 0 auto; max-width: 520px; font-size: 0.95rem; line-height: 1.7; color: rgba(232,245,233,0.4); font-weight: 300; opacity: 0; animation: fadeUp 0.7s ease 0.55s forwards; }

        /* STATS */
        .stats { display: flex; justify-content: center; gap: 32px; margin-top: 44px; opacity: 0; animation: fadeUp 0.7s ease 0.6s forwards; }
        .stat-item { text-align: center; }
        .stat-num { font-family: var(--font-fraunces); font-size: 1.5rem; font-weight: 700; color: #86efac; }
        .stat-label { font-size: 0.7rem; color: rgba(232,245,233,0.35); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
        .stat-div { width: 1px; background: rgba(134,239,172,0.15); align-self: stretch; }

        /* SECTION SHARED */
        .section { width: 100%; max-width: 1100px; padding: 0 24px; position: relative; z-index: 2; }
        .section-label { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(232,245,233,0.25); margin-bottom: 28px; opacity: 0; animation: fadeUp 0.6s ease 0.7s forwards; }
        .section-title { font-family: var(--font-fraunces); font-weight: 700; font-size: clamp(1.6rem, 3vw, 2.4rem); letter-spacing: -0.02em; color: #f0fdf4; margin-bottom: 12px; }
        .section-sub { font-size: 0.9rem; color: rgba(232,245,233,0.4); line-height: 1.7; max-width: 500px; margin-bottom: 48px; }

        /* ROLE CARDS */
        .role-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-bottom: 80px; opacity: 0; animation: fadeUp 0.7s ease 0.8s forwards; }
        @media (max-width: 768px) { .role-cards { grid-template-columns: 1fr; } }
        .role-card { border-radius: 16px; padding: 32px 26px; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.25s ease; }
        .role-card:hover { transform: translateY(-5px); }
        .role-icon { font-size: 1.5rem; margin-bottom: 18px; display: block; line-height: 1; }
        .role-name { font-family: var(--font-fraunces); font-weight: 700; font-size: 1.15rem; color: #f0fdf4; margin-bottom: 10px; }
        .role-desc { font-size: 0.855rem; line-height: 1.65; color: rgba(232,245,233,0.4); font-weight: 300; margin-bottom: 22px; }
        .role-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 26px; }
        .role-tag { font-size: 0.66rem; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500; }
        .role-btn { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; background: none; border: none; cursor: pointer; padding: 0; font-family: var(--font-outfit); transition: gap 0.2s ease; }
        .role-card:hover .role-btn { gap: 14px; }

        /* FEATURES */
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 80px; }
        @media (max-width: 900px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .features-grid { grid-template-columns: 1fr; } }
        .feature-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px 24px; transition: border-color 0.2s, transform 0.2s; }
        .feature-card:hover { border-color: rgba(134,239,172,0.15); transform: translateY(-3px); }
        .feature-icon { font-size: 1.8rem; margin-bottom: 14px; display: block; }
        .feature-title { font-family: var(--font-fraunces); font-weight: 600; font-size: 1rem; color: #f0fdf4; margin-bottom: 8px; }
        .feature-desc { font-size: 0.82rem; line-height: 1.65; color: rgba(232,245,233,0.38); font-weight: 300; }

        /* HOW IT WORKS */
        .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 80px; position: relative; }
        @media (max-width: 768px) { .steps { grid-template-columns: 1fr; } }
        .step { position: relative; padding: 32px 28px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; }
        .step-num { font-family: var(--font-fraunces); font-size: 3rem; font-weight: 800; line-height: 1; margin-bottom: 16px; opacity: 0.15; }
        .step-title { font-family: var(--font-fraunces); font-weight: 600; font-size: 1.05rem; color: #f0fdf4; margin-bottom: 10px; }
        .step-desc { font-size: 0.82rem; line-height: 1.65; color: rgba(232,245,233,0.38); font-weight: 300; }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; margin-bottom: 20px; }

        /* TECH STACK */
        .tech-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 80px; }
        @media (max-width: 768px) { .tech-grid { grid-template-columns: repeat(2, 1fr); } }
        .tech-card { display: flex; align-items: center; gap: 14px; padding: 16px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
        .tech-icon { font-size: 1.3rem; flex-shrink: 0; }
        .tech-name { font-size: 0.88rem; font-weight: 600; color: #f0fdf4; margin-bottom: 2px; }
        .tech-desc { font-size: 0.72rem; color: rgba(232,245,233,0.35); }

        /* DIVIDER */
        .h-divider { width: 100%; height: 1px; background: rgba(134,239,172,0.07); margin: 0 0 64px; }

        /* FOOTER */
        .footer { position: relative; z-index: 2; text-align: center; padding: 0 0 40px; font-size: 0.7rem; color: rgba(232,245,233,0.18); letter-spacing: 0.08em; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <canvas ref={canvasRef} className="canvas" />

      <div className="page">
        <div className="content">

          {/* NAV */}
          <nav className="nav">
            <div className="logo">Sanrakshan<span>.</span></div>
            <div className="badge">Google Solution Challenge</div>
          </nav>

          {/* HERO */}
          <section className="hero">
            <p className="eyebrow">Smart Resource Allocation · Raebareli, UP</p>
            <h1 className="h1-sub">Empowering Communities through</h1>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div className="brand">Sanrakshan</div>
              <span style={{ position: "absolute", left: 0, bottom: -4, width: "100%", height: 2, background: "linear-gradient(90deg, transparent, rgba(134,239,172,0.4), transparent)" }} />
            </div>
            <div style={{ width: 400, height: 60, margin: "-12px auto 0", position: "relative" }}>
              <SparklesCore background="transparent" minSize={0.6} maxSize={1.4} particleDensity={300} className="w-full h-full" particleColor="#86efac" />
            </div>
            <p className="quote">"A flood-affected villager doesn't fill forms.<br/>They speak. Sanrakshan listens."</p>
            <p className="subtitle">Connecting community needs with the right volunteers — powered by Gemini AI, grounded in local data from 56 villages.</p>

            <div className="stats">
              <div className="stat-item"><div className="stat-num">56</div><div className="stat-label">Villages</div></div>
              <div className="stat-div" />
              <div className="stat-item"><div className="stat-num">3</div><div className="stat-label">Dashboards</div></div>
              <div className="stat-div" />
              <div className="stat-item"><div className="stat-num">AI</div><div className="stat-label">Powered</div></div>
              <div className="stat-div" />
              <div className="stat-item"><div className="stat-num">RT</div><div className="stat-label">Real-time</div></div>
            </div>
          </section>

          {/* ROLE CARDS */}
          <p className="section-label">— Select your role to continue</p>
          <div className="role-cards">
            {dashboards.map(d => (
              <div key={d.role} className="role-card"
                onClick={() => router.push(`/auth?redirect=${d.path}&role=${d.role.toLowerCase().replace(" ", "-")}`)}
                style={{ border: `1px solid ${d.border}`, background: d.bg }}
              >
                <span className="role-icon" style={{ color: d.color }}>{d.icon}</span>
                <div className="role-name">{d.role}</div>
                <div className="role-desc">{d.desc}</div>
                <div className="role-tags">
                  {d.tags.map(t => <span key={t} className="role-tag" style={{ border: `1px solid ${d.border}`, color: d.color }}>{t}</span>)}
                </div>
                <button className="role-btn" style={{ color: d.color }}>Enter Dashboard <span>→</span></button>
              </div>
            ))}
          </div>

        </div>

        {/* FEATURES SECTION */}
        <div className="h-divider" />
        <section className="section">
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(232,245,233,0.25)", marginBottom: 16 }}>What Sanrakshan does</p>
          <h2 className="section-title">Built for real emergencies</h2>
          <p className="section-sub">Every feature is designed for the ground reality of rural disaster response — low connectivity, low literacy, high urgency.</p>
          <div className="features-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <div className="feature-title" style={{ color: f.color }}>{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <div className="h-divider" />
        <section className="section">
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(232,245,233,0.25)", marginBottom: 16 }}>The flow</p>
          <h2 className="section-title">How it works</h2>
          <p className="section-sub">From a voice message in a flooded village to a volunteer on the ground — in minutes.</p>
          <div className="steps">
            {steps.map(s => (
              <div key={s.num} className="step">
                <div className="step-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <div className="step-num" style={{ color: s.color }}>{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TECH STACK */}
        <div className="h-divider" />
        <section className="section">
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(232,245,233,0.25)", marginBottom: 16 }}>Built with</p>
          <h2 className="section-title">Google-first tech stack</h2>
          <p className="section-sub">Entirely built on Google and open-source technologies — no paid APIs except Gemini's free tier.</p>
          <div className="tech-grid">
            {techStack.map(t => (
              <div key={t.name} className="tech-card">
                <span className="tech-icon">{t.icon}</span>
                <div>
                  <div className="tech-name">{t.name}</div>
                  <div className="tech-desc">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <div className="h-divider" />
        <footer className="footer">
          Built for Google Solution Challenge · Sanrakshan · Raebareli, Uttar Pradesh
        </footer>
      </div>
    </>
  );
}
