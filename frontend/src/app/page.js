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

        .sra-hero {
          padding: 80px 0 50px;
          text-align: center;
        }

        

        .sra-eyebrow {
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #86efac;
          opacity: 0;
          margin-bottom: 20px;
          animation: sriFadeUp 0.6s ease 0.2s forwards;
        }

        .sra-eyebrowSecondary {
  font-size: 0.90rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  font-weight: 600;
  background: linear-gradient(90deg, #86efac, #67e8f9, #86efac);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 12px rgba(134, 239, 172, 0.35);
  margin-bottom: 22px;
  display: inline-block;
  opacity: 0;
  transform: translateY(10px) scale(0.95);
  animation: eyebrowReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
}

        .sra-h1 {
          font-family: var(--font-fraunces);
          font-weight: 600;
          font-size: clamp(1.4rem, 3vw, 4rem);
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: rgba(240,253,244,0.55);
          opacity: 0;
          animation: sriFadeUp 0.7s ease 0.3s forwards;
          margin-bottom: 8px;
        }

        .sra-brand {
          font-family: var(--font-fraunces);
          font-weight: 800;
          font-size: clamp(2.6rem, 8vw, 12rem);
          line-height: 1;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #86efac 0%, #67e8f9 60%, #86efac 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0;
          animation: sriFadeUp 0.8s ease 0.4s forwards;
          margin-bottom: 28px;
        }

        .sra-subtitle {
          margin: 0 auto;
          max-width: 520px;
          font-size: 0.95rem;
          line-height: 1.7;
          color: rgba(232,245,233,0.45);
          font-weight: 300;
          opacity: 0;
          animation: sriFadeUp 0.7s ease 0.5s forwards;
        }

        .sra-meta {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 44px;
          opacity: 0;
          animation: sriFadeUp 0.7s ease 0.6s forwards;
        }

        .sra-meta-item { text-align: center; }

        .sra-meta-num {
          font-family: var(--font-fraunces);
          font-size: 1.5rem;
          font-weight: 700;
          color: #86efac;
        }

        .sra-meta-label {
          font-size: 0.7rem;
          color: rgba(232,245,233,0.35);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        .sra-divider {
          width: 1px;
          background: rgba(134,239,172,0.15);
          align-self: stretch;
        }

        .sra-section-label {
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(232,245,233,0.25);
          margin-bottom: 28px;
          opacity: 0;
          animation: sriFadeUp 0.6s ease 0.7s forwards;
        }

        .sra-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding-bottom: 80px;
          opacity: 0;
          animation: sriFadeUp 0.7s ease 0.8s forwards;
        }

        @media (max-width: 768px) {
          .sra-cards { grid-template-columns: 1fr; }
        }

        .sra-card {
          border-radius: 16px;
          padding: 32px 26px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease;
        }

        .sra-card:hover { transform: translateY(-5px); }

        .sra-card-icon {
          font-size: 1.5rem;
          margin-bottom: 18px;
          display: block;
          line-height: 1;
        }

        .sra-card-role {
          font-family: var(--font-fraunces);
          font-weight: 700;
          font-size: 1.15rem;
          color: #f0fdf4;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }

        .sra-card-desc {
          font-size: 0.855rem;
          line-height: 1.65;
          color: rgba(232,245,233,0.4);
          font-weight: 300;
          margin-bottom: 22px;
        }

        .sra-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 26px;
        }

        .sra-tag {
          font-size: 0.66rem;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .sra-card-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: var(--font-outfit);
          transition: gap 0.2s ease;
        }

        .sra-card:hover .sra-card-btn { gap: 14px; }

        .sra-footer {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 0 0 32px;
          font-size: 0.7rem;
          color: rgba(232,245,233,0.18);
          letter-spacing: 0.08em;
          opacity: 0;
          animation: sriFadeUp 0.6s ease 1s forwards;
        }

        @keyframes sriFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }


        @keyframes eyebrowReveal {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.9);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
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
            <h1 className="sra-eyebrowSecondary">Connecting local needs with the right helping hands.</h1>
            <h1 className="sra-h1">Empowering Communities through</h1>
            <div className="relative flex flex-col items-center justify-center">
  
 
             {/* Heading */}
  <div className="relative inline-block">

  {/* Heading */}
  <div className="relative z-10 sra-brand">
    Sanrakshan
  </div>

  {/* Underline */}
  <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-gradient-to-r from-gray-300 via-white to-gray-300 blur-[1px]" />

</div>

{/* Sparkles */}
<div className="w-[400px] h-[80px] relative -mt-6">
  <SparklesCore
    background="transparent"
    minSize={0.6}
    maxSize={1.4}
    particleDensity={400}
    className="w-full h-full"
    particleColor="#E5E7EB"
  />
</div>

</div>
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