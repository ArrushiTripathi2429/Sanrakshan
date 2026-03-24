"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    // Animated dot grid background
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134, 239, 172, ${d.opacity})`;
        ctx.fill();
      });

      // Draw faint connecting lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(134, 239, 172, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const dashboards = [
    {
      role: "Field Worker",
      icon: "◎",
      color: "#86efac",
      bg: "rgba(134,239,172,0.07)",
      border: "rgba(134,239,172,0.25)",
      desc: "Submit community reports, track issue status, and document ground-level needs with photos and field data.",
      tags: ["Submit Reports", "Photo Upload", "Track Status"],
      path: "/field-worker",
    },
    {
      role: "Admin",
      icon: "⬡",
      color: "#67e8f9",
      bg: "rgba(103,232,249,0.07)",
      border: "rgba(103,232,249,0.25)",
      desc: "View live issue map, analyze priority scores, and assign the right volunteers to the most urgent needs.",
      tags: ["Live Map", "AI Priority", "Assign Tasks"],
      path: "/admin",
    },
    {
      role: "Volunteer",
      icon: "△",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.07)",
      border: "rgba(251,191,36,0.25)",
      desc: "See your assigned tasks, get directions to affected areas, and mark completed missions in real time.",
      tags: ["My Tasks", "Directions", "Mark Done"],
      path: "/volunteer",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080e0a;
          color: #e8f5e9;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        .page {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .noise {
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.4;
        }

        .content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1100px;
          padding: 0 24px;
        }

        /* NAV */
        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px 0 0;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.1s forwards;
        }

        .logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: -0.02em;
          color: #86efac;
        }

        .logo span {
          color: #e8f5e9;
          opacity: 0.5;
        }

        .badge {
          font-size: 0.7rem;
          font-weight: 500;
          padding: 5px 12px;
          border: 1px solid rgba(134,239,172,0.3);
          border-radius: 100px;
          color: #86efac;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* HERO */
        .hero {
          padding: 90px 0 60px;
          text-align: center;
        }

        .eyebrow {
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #86efac;
          opacity: 0.7;
          margin-bottom: 24px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.2s forwards;
        }

        h1 {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(2.8rem, 6vw, 5rem);
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: #f0fdf4;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.3s forwards;
        }

        h1 .accent {
          color: #86efac;
          position: relative;
          display: inline-block;
        }

        h1 .accent::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #86efac, transparent);
          border-radius: 2px;
        }

        .subtitle {
          margin: 24px auto 0;
          max-width: 560px;
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(232,245,233,0.55);
          font-weight: 300;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.4s forwards;
        }

        .hero-meta {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 48px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.5s forwards;
        }

        .meta-item {
          text-align: center;
        }

        .meta-num {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #86efac;
        }

        .meta-label {
          font-size: 0.72rem;
          color: rgba(232,245,233,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        .divider {
          width: 1px;
          background: rgba(134,239,172,0.15);
          align-self: stretch;
        }

        /* CARDS */
        .section-label {
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(232,245,233,0.3);
          margin-bottom: 32px;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.6s forwards;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding-bottom: 80px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.7s forwards;
        }

        @media (max-width: 768px) {
          .cards { grid-template-columns: 1fr; }
          h1 { font-size: 2.4rem; }
          .hero-meta { gap: 20px; }
        }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 32px 28px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--card-color), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .card:hover {
          transform: translateY(-4px);
          border-color: var(--card-border);
          background: var(--card-bg);
        }

        .card:hover::before { opacity: 1; }

        .card-icon {
          font-size: 1.6rem;
          color: var(--card-color);
          margin-bottom: 20px;
          display: block;
          line-height: 1;
        }

        .card-role {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1.2rem;
          color: #f0fdf4;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .card-desc {
          font-size: 0.875rem;
          line-height: 1.65;
          color: rgba(232,245,233,0.45);
          font-weight: 300;
          margin-bottom: 24px;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 28px;
        }

        .tag {
          font-size: 0.68rem;
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid var(--card-border);
          color: var(--card-color);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .card-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--card-color);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: gap 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }

        .card:hover .card-btn { gap: 14px; }

        .card-btn .arrow {
          font-size: 1rem;
          transition: transform 0.2s ease;
        }

        .card:hover .card-btn .arrow { transform: translateX(4px); }

        /* FOOTER LINE */
        .footer {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 0 0 32px;
          font-size: 0.72rem;
          color: rgba(232,245,233,0.2);
          letter-spacing: 0.08em;
          opacity: 0;
          animation: fadeUp 0.6s ease 0.9s forwards;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <canvas ref={canvasRef} />
      <div className="noise" />

      <div className="page">
        <div className="content">
          <nav>
            <div className="logo">SRA<span>/</span>sys</div>
            <div className="badge">🌱 Google Solution Challenge</div>
          </nav>

          <section className="hero">
            <p className="eyebrow">Raebareli · Uttar Pradesh · India</p>
            <h1>
              Smart <span className="accent">Resource</span><br />
              Allocation System
            </h1>
            <p className="subtitle">
              Connecting community needs with the right volunteers — powered by AI, grounded in local data.
            </p>

            <div className="hero-meta">
              <div className="meta-item">
                <div className="meta-num">3</div>
                <div className="meta-label">Dashboards</div>
              </div>
              <div className="divider" />
              <div className="meta-item">
                <div className="meta-num">AI</div>
                <div className="meta-label">Powered</div>
              </div>
              <div className="divider" />
              <div className="meta-item">
                <div className="meta-num">RT</div>
                <div className="meta-label">Real-time</div>
              </div>
            </div>
          </section>

          <p className="section-label">— Select your role to continue</p>

          <div className="cards">
            {dashboards.map((d) => (
              <div
                key={d.role}
                className="card"
                style={{
                  "--card-color": d.color,
                  "--card-bg": d.bg,
                  "--card-border": d.border,
                }}
                onClick={() => router.push(d.path)}
              >
                <span className="card-icon">{d.icon}</span>
                <div className="card-role">{d.role}</div>
                <div className="card-desc">{d.desc}</div>
                <div className="tags">
                  {d.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
                <button className="card-btn">
                  Enter Dashboard <span className="arrow">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <footer className="footer">
          Built for Google Solution Challenge · SRA System · Raebareli
        </footer>
      </div>
    </>
  );
}
