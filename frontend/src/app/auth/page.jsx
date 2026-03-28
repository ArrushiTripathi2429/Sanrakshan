"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ROLE_META = {
  "field-worker": {
    label: "Field Worker",
    icon: "◎",
    color: "#86efac",
    border: "rgba(134,239,172,0.25)",
    bg: "rgba(134,239,172,0.06)",
    hint: "Report community issues from the ground",
  },
  admin: {
    label: "Admin",
    icon: "⬡",
    color: "#67e8f9",
    border: "rgba(103,232,249,0.25)",
    bg: "rgba(103,232,249,0.06)",
    hint: "Manage reports and assign volunteers",
  },
  volunteer: {
    label: "Volunteer",
    icon: "△",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.25)",
    bg: "rgba(251,191,36,0.06)",
    hint: "View and complete assigned tasks",
  },
};

const roleRedirects = {
  "field-worker": "/fieldworker",
  "admin": "/admin",
  "volunteer": "/volunteer",
};

// STEP: "login" | "name" | "done"
export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const roleParam = params.get("role") || "field-worker";
  const role = ROLE_META[roleParam] ? roleParam : "field-worker";
  const meta = ROLE_META[role];

  const [step, setStep] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      // Try signing in first
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const existingRole = userDoc.data().role;
        router.push(roleRedirects[existingRole] || "/");
      } else {
        // Existing auth user but no Firestore doc → ask name
        setStep("name");
      }
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
        // New user → create account
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          setStep("name");
        } catch (err) {
          setError(err.message || "Failed to create account.");
        }
      } else if (e.code === "auth/wrong-password") {
        setError("Incorrect password. Try again.");
      } else {
        setError(e.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    setError("");
    if (name.trim().length < 2) { setError("Please enter your full name."); return; }
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: auth.currentUser?.email,
        role: role,
        createdAt: new Date(),
      });
      setStep("done");
      setTimeout(() => router.push(roleRedirects[role] || "/"), 1200);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: 'DM Sans', sans-serif; min-height: 100vh; }

        .auth-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .auth-left {
          background: rgba(255,255,255,0.015);
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 60px 48px;
          position: relative; overflow: hidden;
        }

        .auth-left-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 50%, var(--role-bg) 0%, transparent 65%);
          pointer-events: none;
        }

        .auth-left-content { position: relative; z-index: 1; text-align: center; }

        .auth-logo {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1rem; color: #86efac; margin-bottom: 56px;
          text-align: left; width: 100%;
        }
        .auth-logo span { opacity: 0.35; color: #e8f5e9; }

        .auth-role-icon { font-size: 3rem; margin-bottom: 20px; display: block; color: var(--role-color); }
        .auth-role-entering { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(232,245,233,0.3); margin-bottom: 10px; }
        .auth-role-name { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 2.4rem; letter-spacing: -0.03em; color: var(--role-color); margin-bottom: 12px; line-height: 1; }
        .auth-role-hint { font-size: 0.85rem; color: rgba(232,245,233,0.38); font-weight: 300; line-height: 1.6; max-width: 260px; margin: 0 auto; }

        .auth-brand { margin-top: 56px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.02em; background: linear-gradient(135deg, #86efac, #67e8f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-brand-sub { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(232,245,233,0.2); margin-top: 4px; }

        .auth-right { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px 48px; }

        .auth-box { width: 100%; max-width: 380px; opacity: 0; animation: authUp 0.5s ease forwards; }

        .auth-step-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.18em; color: rgba(232,245,233,0.25); margin-bottom: 10px; }
        .auth-heading { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.6rem; letter-spacing: -0.02em; color: #f0fdf4; margin-bottom: 6px; }
        .auth-subheading { font-size: 0.85rem; color: rgba(232,245,233,0.38); font-weight: 300; margin-bottom: 32px; line-height: 1.6; }
        .auth-subheading strong { color: rgba(232,245,233,0.7); font-weight: 500; }

        .auth-field { margin-bottom: 14px; }
        .auth-field-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(232,245,233,0.3); margin-bottom: 6px; display: block; }

        .auth-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          padding: 13px 16px; color: #f0fdf4;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
          outline: none; transition: border-color 0.2s;
        }
        .auth-input:focus { border-color: var(--role-border); }
        .auth-input::placeholder { color: rgba(232,245,233,0.18); }

        .auth-pass-wrap { position: relative; }
        .auth-pass-wrap .auth-input { padding-right: 44px; }
        .auth-pass-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(232,245,233,0.3); font-size: 0.8rem;
          font-family: 'DM Sans', sans-serif; transition: color 0.2s;
        }
        .auth-pass-toggle:hover { color: rgba(232,245,233,0.7); }

        .auth-btn {
          width: 100%; padding: 14px; border: none; border-radius: 12px;
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.88rem; letter-spacing: 0.04em;
          cursor: pointer; transition: opacity 0.2s, transform 0.2s;
          background: var(--role-color); color: #080e0a;
          margin-top: 8px; margin-bottom: 16px;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        .auth-error { font-size: 0.78rem; color: #f87171; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }

        .auth-note { font-size: 0.75rem; color: rgba(232,245,233,0.22); text-align: center; line-height: 1.5; }

        .auth-success { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 20px 0; }
        .auth-success-icon { font-size: 3rem; }
        .auth-success-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.2rem; color: var(--role-color); }
        .auth-success-sub { font-size: 0.82rem; color: rgba(232,245,233,0.38); }

        .auth-progress { display: flex; gap: 6px; margin-bottom: 32px; }
        .auth-prog-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.1); transition: all 0.3s; }
        .auth-prog-dot.active { background: var(--role-color); width: 20px; border-radius: 3px; }
        .auth-prog-dot.done { background: var(--role-color); opacity: 0.4; }

        @media (max-width: 768px) {
          .auth-wrap { grid-template-columns: 1fr; }
          .auth-left { display: none; }
          .auth-right { padding: 40px 24px; }
        }

        @keyframes authUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="auth-wrap" style={{ "--role-color": meta.color, "--role-border": meta.border, "--role-bg": meta.bg }}>

        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1 }}>
            <div className="auth-logo">SRA<span>/</span>sys</div>
            <div className="auth-left-content">
              <span className="auth-role-icon">{meta.icon}</span>
              <div className="auth-role-entering">Entering as</div>
              <div className="auth-role-name">{meta.label}</div>
              <div className="auth-role-hint">{meta.hint}</div>
              <div className="auth-brand">Sanrakshan</div>
              <div className="auth-brand-sub">Smart Resource Allocation</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="auth-box">

            {/* PROGRESS */}
            <div className="auth-progress">
              {["login", "name"].map((s, i) => {
                const stepIndex = ["login", "name", "done"].indexOf(step);
                return (
                  <div key={s} className={`auth-prog-dot ${stepIndex === i ? "active" : stepIndex > i ? "done" : ""}`} />
                );
              })}
            </div>

            {/* STEP: LOGIN */}
            {step === "login" && (
              <>
                <div className="auth-step-label">Step 1 of 2</div>
                <div className="auth-heading">Sign in</div>
                <div className="auth-subheading">
                  Enter your email and password. <strong>New here?</strong> We'll create your account automatically.
                </div>

                <div className="auth-field">
                  <label className="auth-field-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-field-label">Password</label>
                  <div className="auth-pass-wrap">
                    <input
                      className="auth-input"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button className="auth-pass-toggle" onClick={() => setShowPass(!showPass)}>
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="auth-btn" onClick={handleLogin} disabled={loading || !email || password.length < 6}>
                  {loading ? "Please wait..." : "Continue →"}
                </button>

                <div className="auth-note">
                  No account needed — just enter your email &amp; a password to get started.
                </div>
              </>
            )}

            {/* STEP: NAME */}
            {step === "name" && (
              <>
                <div className="auth-step-label">Step 2 of 2</div>
                <div className="auth-heading">What's your name?</div>
                <div className="auth-subheading">
                  Tell us your name so admin can identify you on the dashboard.
                </div>

                <div className="auth-field">
                  <label className="auth-field-label">Full Name</label>
                  <input
                    className="auth-input"
                    placeholder="Arushi Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="auth-btn" onClick={handleSaveName} disabled={loading || name.trim().length < 2}>
                  {loading ? "Saving..." : "Enter Dashboard →"}
                </button>
              </>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="auth-success">
                <div className="auth-success-icon"></div>
                <div className="auth-success-text">Welcome, {name}!</div>
                <div className="auth-success-sub">Redirecting to your dashboard...</div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
