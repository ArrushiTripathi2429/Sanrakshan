"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
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

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const roleParam = params.get("role") || "field-worker";
  const role = ROLE_META[roleParam] ? roleParam : "field-worker";
  const meta = ROLE_META[role];

  const [step, setStep] = useState("login"); // "login" | "name" | "done"
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        // Existing user → role-based redirect
        const existingRole = userDoc.data().role;
        router.push(roleRedirects[existingRole] || "/");
      } else {
        // New user → pre-fill name from Google, ask to confirm
        setName(user.displayName || "");
        setStep("name");
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setError("Sign-in failed. Please try again.");
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
      const user = auth.currentUser;
      await updateProfile(user, { displayName: name.trim() });
      await setDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        email: user.email,
        photo: user.photoURL || null,
        role: role,
        available: true,
        uid: user.uid,
        createdAt: new Date(),
      });
      setUserName(name.trim());
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080e0a; color: #e8f5e9; font-family: 'Outfit', sans-serif; min-height: 100vh; }

        .auth-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* LEFT */
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
        .auth-left-inner { position: relative; z-index: 1; width: 100%; max-width: 340px; }

        .auth-logo {
          font-family: 'Fraunces', serif; font-weight: 700;
          font-size: 1rem; color: #86efac; margin-bottom: 56px;
        }
        .auth-logo span { opacity: 0.35; color: #e8f5e9; }

        .auth-left-content { text-align: center; }
        .auth-role-icon { font-size: 3rem; margin-bottom: 20px; display: block; color: var(--role-color); }
        .auth-role-entering { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.22em; color: rgba(232,245,233,0.3); margin-bottom: 10px; }
        .auth-role-name { font-family: 'Fraunces', serif; font-weight: 700; font-size: 2.4rem; letter-spacing: -0.03em; color: var(--role-color); margin-bottom: 12px; line-height: 1; }
        .auth-role-hint { font-size: 0.85rem; color: rgba(232,245,233,0.35); font-weight: 300; line-height: 1.6; max-width: 260px; margin: 0 auto; }

        .auth-brand { margin-top: 56px; font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.6rem; letter-spacing: -0.02em; background: linear-gradient(135deg, #86efac, #67e8f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-brand-sub { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(232,245,233,0.18); margin-top: 5px; }

        /* RIGHT */
        .auth-right { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px 48px; }
        .auth-box { width: 100%; max-width: 380px; opacity: 0; animation: authUp 0.5s ease forwards; }

        .auth-heading { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.8rem; letter-spacing: -0.02em; color: #f0fdf4; margin-bottom: 8px; }
        .auth-subheading { font-size: 0.85rem; color: rgba(232,245,233,0.35); font-weight: 300; margin-bottom: 36px; line-height: 1.65; }
        .auth-subheading strong { color: rgba(232,245,233,0.65); font-weight: 500; }

        /* GOOGLE BTN */
        .google-btn {
          width: 100%; padding: 14px 20px;
          background: #fff; border: none; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          font-family: 'Outfit', sans-serif; font-size: 0.92rem; font-weight: 600;
          color: #1a1a1a; cursor: pointer;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          margin-bottom: 16px;
        }
        .google-btn:hover:not(:disabled) { opacity: 0.93; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
        .google-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .google-icon { width: 20px; height: 20px; flex-shrink: 0; }

        /* NAME INPUT */
        .auth-field { margin-bottom: 16px; }
        .auth-field-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(232,245,233,0.28); margin-bottom: 7px; display: block; }
        .auth-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          padding: 13px 16px; color: #f0fdf4;
          font-family: 'Outfit', sans-serif; font-size: 0.95rem;
          outline: none; transition: border-color 0.2s;
        }
        .auth-input:focus { border-color: var(--role-border); }
        .auth-input::placeholder { color: rgba(232,245,233,0.18); }

        .auth-btn {
          width: 100%; padding: 14px; border: none; border-radius: 12px;
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 0.95rem; letter-spacing: 0.01em;
          cursor: pointer; transition: opacity 0.2s, transform 0.2s;
          background: var(--role-color); color: #080e0a;
          margin-top: 4px; margin-bottom: 0;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        .auth-error { font-size: 0.78rem; color: #f87171; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }

        .auth-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .auth-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .auth-divider-text { font-size: 0.72rem; color: rgba(232,245,233,0.2); white-space: nowrap; }

        .auth-note { font-size: 0.73rem; color: rgba(232,245,233,0.2); text-align: center; line-height: 1.55; margin-top: 14px; }

        /* PROGRESS */
        .auth-progress { display: flex; gap: 6px; margin-bottom: 32px; }
        .auth-prog-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.1); transition: all 0.3s; }
        .auth-prog-dot.active { background: var(--role-color); width: 20px; border-radius: 3px; }
        .auth-prog-dot.done { background: var(--role-color); opacity: 0.4; }

        /* SUCCESS */
        .auth-success { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 24px 0; }
        .auth-success-icon { font-size: 3.2rem; }
        .auth-success-text { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.3rem; color: var(--role-color); }
        .auth-success-sub { font-size: 0.82rem; color: rgba(232,245,233,0.35); }

        /* SPINNER */
        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #080e0a; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
          <div className="auth-left-inner">
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

            {/* PROGRESS DOTS */}
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
                <div className="auth-heading">Welcome back</div>
                <div className="auth-subheading">
                  Sign in with your Google account to access your <strong>{meta.label}</strong> dashboard.
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <svg className="google-icon" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {loading ? "Signing in..." : "Continue with Google"}
                </button>

                <div className="auth-note">
                  Your role as <strong style={{ color: meta.color }}>{meta.label}</strong> will be saved on first sign-in.
                </div>
              </>
            )}

            {/* STEP: NAME */}
            {step === "name" && (
              <>
                <div className="auth-heading">One last thing</div>
                <div className="auth-subheading">
                  Confirm your name so the admin can identify you on the dashboard.
                </div>

                <div className="auth-field">
                  <label className="auth-field-label">Your Name</label>
                  <input
                    className="auth-input"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
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
                <div className="auth-success-icon">✅</div>
                <div className="auth-success-text">Welcome, {userName || name}!</div>
                <div className="auth-success-sub">Redirecting to your dashboard...</div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
