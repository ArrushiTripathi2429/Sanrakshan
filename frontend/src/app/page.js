"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

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

export default function HomePage() {
  const router = useRouter();
  const canvasRef = useRef(null);

  useEffect(() => {
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

  return (
    <>
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: #080e0a;
          color: #e8f5e9;
          font-family: var(--font-outfit);
          overflow-x: hidden;
        }

        .sra-page {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sra-canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .sra-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1100px;
          padding: 0 24px;
        }

        .sra-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px 0 0;
          opacity: 0;
          animation: sriFadeUp 0.6s ease 0.1s forwards;
        }

        .sra-logo {
          font-family: var(--font-fraunces); 
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: -0.02em;
          color: #86efac;
        }

        .sra-logo span { color: #e8f5e9; opacity: 0.4; }

        .sra-badge {
          font-size: 0.7rem;
          font-weight: 500;
          padding: 5px 12px;
          border: 1px solid rgba(134,239,172,0.3);
          border-radius: 100px;
          color: #86efac;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sra-h1,
        .sra-brand,
        .sra-meta-num,
        .sra-card-role {
          font-family: var(--font-fraunces); 
        }

        .sra-card-btn {
          font-family: var(--font-outfit); 
        }

        @keyframes sriFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

      
      `}</style>

      <canvas ref={canvasRef} className="sra-canvas" />

      <div className="sra-page">
        <div className="sra-content">

          <nav className="sra-nav">
            <div className="sra-logo">SRA<span>/</span>sys</div>
            <div className="sra-badge">Google Solution Challenge</div>
          </nav>

          <section className="sra-hero">
            <p className="sra-eyebrow">Smart Resource Allocation System · Raebareli</p>
            <h1 className="sra-h1">Empowering Communities through</h1>
            <div className="sra-brand">Sanrakshan</div>
             <div className="sra-h1">
                "A flood-affected villager doesn't fill forms.<br />
                They speak. Sanrakshan listens."
              </div>
            <p className="sra-subtitle">
              Connecting community needs with the right volunteers — powered by AI, grounded in local data.
            </p>
            <div className="sra-meta">
              <div className="sra-meta-item">
                <div className="sra-meta-num">3</div>
                <div className="sra-meta-label">Dashboards</div>
              </div>
              <div className="sra-divider" />
              <div className="sra-meta-item">
                <div className="sra-meta-num">AI</div>
                <div className="sra-meta-label">Powered</div>
              </div>
              <div className="sra-divider" />
              <div className="sra-meta-item">
                <div className="sra-meta-num">RT</div>
                <div className="sra-meta-label">Real-time</div>
              </div>
            </div>
          </section>

          <p className="sra-section-label">— Select your role to continue</p>

          <div className="sra-cards">
            {dashboards.map((d) => (
              <div
                key={d.role}
                className="sra-card"
                onClick={() => router.push(`/auth?redirect=${d.path}&role=${d.role.toLowerCase().replace(" ", "-")}`)}
                style={{ border: `1px solid ${d.border}`, background: d.bg }}
              >
                <span className="sra-card-icon" style={{ color: d.color }}>{d.icon}</span>
                <div className="sra-card-role">{d.role}</div>
                <div className="sra-card-desc">{d.desc}</div>
                <div className="sra-tags">
                  {d.tags.map((t) => (
                    <span
                      key={t}
                      className="sra-tag"
                      style={{ border: `1px solid ${d.border}`, color: d.color }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <button className="sra-card-btn" style={{ color: d.color }}>
                  Enter Dashboard <span>→</span>
                </button>
              </div>
            ))}
          </div>

        </div>

        <footer className="sra-footer">
          Built for Google Solution Challenge · Sanrakshan · Raebareli
        </footer>
      </div>
    </>
  );
}

