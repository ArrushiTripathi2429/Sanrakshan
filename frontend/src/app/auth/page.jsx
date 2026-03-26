"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
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

// STEP: "phone" | "otp" | "name" | "done"
export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const roleParam = params.get("role") || "field-worker";
  const role = ROLE_META[roleParam] ? roleParam : "field-worker";
  const meta = ROLE_META[role];

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const confirmRef = useRef(null);
  const otpRefs = useRef([]);
  const recaptchaRef = useRef(null);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Setup invisible reCAPTCHA
  const setupRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };

  const handleSendOTP = async () => {
    setError("");
    const cleaned = phone.trim().replace(/\s/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    const fullPhone = cleaned.startsWith("+") ? cleaned : `+91${cleaned}`;
    setLoading(true);
    try {
      setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaRef.current);
      confirmRef.current = confirmation;
      setStep("otp");
      setResendTimer(30);
    } catch (e) {
      setError("Failed to send OTP. Check the number and try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const result = await confirmRef.current.confirm(code);
      const uid = result.user.uid;
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        // Existing user — redirect directly
        router.push(redirect);
      } else {
        // New user — ask for name
        setStep("name");
      }
    } catch (e) {
      setError("Invalid OTP. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        phone: auth.currentUser?.phoneNumber,
        role: role.replace("-", "_"),
        createdAt: new Date(),
      });
      setStep("done");
      setTimeout(() => router.push(redirect), 1200);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");
    await handleSendOTP();
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

        /* LEFT PANEL */
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

        .auth-role-icon {
          font-size: 3rem; margin-bottom: 20px; display: block;
          color: var(--role-color);
        }

        .auth-role-entering {
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.2em;
          color: rgba(232,245,233,0.3); margin-bottom: 10px;
        }

        .auth-role-name {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 2.4rem; letter-spacing: -0.03em;
          color: var(--role-color); margin-bottom: 12px; line-height: 1;
        }

        .auth-role-hint {
          font-size: 0.85rem; color: rgba(232,245,233,0.38);
          font-weight: 300; line-height: 1.6; max-width: 260px; margin: 0 auto;
        }

        .auth-brand {
          margin-top: 56px;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1.5rem; letter-spacing: -0.02em;
          background: linear-gradient(135deg, #86efac, #67e8f9);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-brand-sub {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em;
          color: rgba(232,245,233,0.2); margin-top: 4px;
        }

        /* RIGHT PANEL */
        .auth-right {
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 60px 48px;
        }

        .auth-box {
          width: 100%; max-width: 380px;
          opacity: 0; animation: authUp 0.5s ease forwards;
        }

        .auth-step-label {
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.18em;
          color: rgba(232,245,233,0.25); margin-bottom: 10px;
        }

        .auth-heading {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 1.6rem; letter-spacing: -0.02em;
          color: #f0fdf4; margin-bottom: 6px;
        }

        .auth-subheading {
          font-size: 0.85rem; color: rgba(232,245,233,0.38);
          font-weight: 300; margin-bottom: 36px; line-height: 1.6;
        }

        .auth-subheading strong { color: rgba(232,245,233,0.7); font-weight: 500; }

        /* PHONE INPUT */
        .auth-phone-row {
          display: flex; gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px; overflow: hidden;
          transition: border-color 0.2s;
          margin-bottom: 20px;
        }
        .auth-phone-row:focus-within { border-color: var(--role-border); }

        .auth-country {
          padding: 14px 14px; font-size: 0.875rem;
          color: rgba(232,245,233,0.5); border-right: 1px solid rgba(255,255,255,0.07);
          white-space: nowrap; user-select: none; background: rgba(255,255,255,0.02);
          display: flex; align-items: center; gap: 6px;
        }

        .auth-phone-input {
          flex: 1; background: none; border: none; outline: none;
          padding: 14px 16px; color: #f0fdf4;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
          letter-spacing: 0.05em;
        }

        .auth-phone-input::placeholder { color: rgba(232,245,233,0.2); }

        /* NAME INPUT */
        .auth-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          padding: 14px 16px; color: #f0fdf4;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
          outline: none; transition: border-color 0.2s; margin-bottom: 20px;
        }
        .auth-input:focus { border-color: var(--role-border); }
        .auth-input::placeholder { color: rgba(232,245,233,0.2); }

        /* OTP INPUTS */
        .auth-otp-row {
          display: flex; gap: 10px; margin-bottom: 20px;
        }
        .auth-otp-box {
          flex: 1; aspect-ratio: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          text-align: center; font-family: 'Syne', sans-serif;
          font-size: 1.3rem; font-weight: 700; color: #f0fdf4;
          outline: none; transition: border-color 0.2s;
          caret-color: var(--role-color);
        }
        .auth-otp-box:focus { border-color: var(--role-border); }

        /* BTN */
        .auth-btn {
          width: 100%; padding: 14px; border: none; border-radius: 12px;
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.88rem; letter-spacing: 0.04em;
          cursor: pointer; transition: opacity 0.2s, transform 0.2s;
          background: var(--role-color); color: #080e0a;
          margin-bottom: 16px;
        }
        .auth-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        .auth-error {
          font-size: 0.78rem; color: #f87171;
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
          border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;
        }

        .auth-resend {
          font-size: 0.78rem; color: rgba(232,245,233,0.3);
          text-align: center;
        }
        .auth-resend button {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          transition: color 0.2s;
        }
        .auth-resend button.active { color: var(--role-color); }
        .auth-resend button:disabled { color: rgba(232,245,233,0.25); cursor: default; }

        .auth-back {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem; color: rgba(232,245,233,0.25);
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; margin-bottom: 28px;
          transition: color 0.2s; padding: 0;
        }
        .auth-back:hover { color: rgba(232,245,233,0.6); }

        /* SUCCESS */
        .auth-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; text-align: center; padding: 20px 0;
        }
        .auth-success-icon { font-size: 3rem; }
        .auth-success-text {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 1.2rem; color: var(--role-color);
        }
        .auth-success-sub { font-size: 0.82rem; color: rgba(232,245,233,0.38); }

        /* PROGRESS DOTS */
        .auth-progress {
          display: flex; gap: 6px; margin-bottom: 32px;
        }
        .auth-prog-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.1); transition: all 0.3s;
        }
        .auth-prog-dot.active {
          background: var(--role-color); width: 20px; border-radius: 3px;
        }
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

      <div
        className="auth-wrap"
        style={{
          "--role-color": meta.color,
          "--role-border": meta.border,
          "--role-bg": meta.bg,
        }}
      >
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
              {["phone", "otp", "name"].map((s, i) => {
                const stepIndex = ["phone", "otp", "name", "done"].indexOf(step);
                return (
                  <div
                    key={s}
                    className={`auth-prog-dot ${stepIndex === i ? "active" : stepIndex > i ? "done" : ""}`}
                  />
                );
              })}
            </div>

            {/* STEP: PHONE */}
            {step === "phone" && (
              <>
                <div className="auth-step-label">Step 1 of 3</div>
                <div className="auth-heading">Enter your number</div>
                <div className="auth-subheading">
                  We'll send a <strong>6-digit OTP</strong> to verify your identity.
                  No password needed.
                </div>

                <div className="auth-phone-row">
                  <div className="auth-country">🇮🇳 +91</div>
                  <input
                    className="auth-phone-input"
                    type="tel"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button
                  className="auth-btn"
                  onClick={handleSendOTP}
                  disabled={loading || phone.length < 10}
                >
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </button>
              </>
            )}

            {/* STEP: OTP */}
            {step === "otp" && (
              <>
                <button className="auth-back" onClick={() => { setStep("phone"); setError(""); }}>
                  ← Back
                </button>
                <div className="auth-step-label">Step 2 of 3</div>
                <div className="auth-heading">Enter OTP</div>
                <div className="auth-subheading">
                  Sent to <strong>+91 {phone}</strong>. Enter the 6-digit code below.
                </div>

                <div className="auth-otp-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      className="auth-otp-box"
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button
                  className="auth-btn"
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join("").length < 6}
                >
                  {loading ? "Verifying..." : "Verify OTP →"}
                </button>

                <div className="auth-resend">
                  Didn't receive it?{" "}
                  <button
                    className={resendTimer === 0 ? "active" : ""}
                    disabled={resendTimer > 0}
                    onClick={handleResend}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </>
            )}

            {/* STEP: NAME */}
            {step === "name" && (
              <>
                <div className="auth-step-label">Step 3 of 3</div>
                <div className="auth-heading">What's your name?</div>
                <div className="auth-subheading">
                  First time here. Tell us your name so admin can identify you.
                </div>

                <input
                  className="auth-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />

                {error && <div className="auth-error">{error}</div>}

                <button
                  className="auth-btn"
                  onClick={handleSaveName}
                  disabled={loading || name.trim().length < 2}
                >
                  {loading ? "Saving..." : "Enter Dashboard →"}
                </button>
              </>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="auth-success">
                <div className="auth-success-icon">✅</div>
                <div className="auth-success-text">Welcome, {name}!</div>
                <div className="auth-success-sub">Redirecting to your dashboard...</div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </>
  );
}
