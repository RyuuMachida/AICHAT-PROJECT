"use client";

import React, { useState } from "react";
import { IconSparkle, IconBolt, IconBot, IconKey } from "./Icons";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider, sendSignInLinkToEmail } from "firebase/auth";

interface OnboardingSlidesProps {
  onComplete: (name: string, email: string) => void;
}

export default function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [slide, setSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [improveModels, setImproveModels] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Complete onboarding immediately with Google user info
      onComplete(user.displayName || "User", user.email || "tamu@gmail.com");
    } catch (error: any) {
      console.error("Google sign in error:", error);
      const code = error?.code || "";
      if (code === "auth/popup-closed-by-user") {
        setErrorMsg("Popup ditutup sebelum login selesai.");
      } else if (code === "auth/unauthorized-domain") {
        setErrorMsg("Domain belum diizinkan. Tambahkan localhost di Firebase Console > Authentication > Settings > Authorized domains.");
      } else if (code === "auth/operation-not-allowed") {
        setErrorMsg("Google sign-in belum diaktifkan. Aktifkan di Firebase Console > Authentication > Sign-in method > Google.");
      } else if (code === "auth/popup-blocked") {
        setErrorMsg("Popup diblokir oleh browser. Izinkan popup untuk situs ini.");
      } else {
        setErrorMsg(`Gagal masuk dengan Google. (${code || error?.message || "Unknown"})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setErrorMsg("");
    setLoading(true);
    try {
      const actionCodeSettings = {
        // Redirect back to our homepage to complete verification
        url: window.location.origin + "/",
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      
      // Save the email locally so we don't have to ask for it again upon redirect
      window.localStorage.setItem("emailForSignIn", email.trim());
      
      setEmailSent(true);
    } catch (error: any) {
      console.error("Email link send error:", error);
      const code = error?.code || "";
      if (code === "auth/operation-not-allowed") {
        setErrorMsg("Email link sign-in belum diaktifkan. Aktifkan di Firebase Console > Authentication > Sign-in method > Email/Password > Email link.");
      } else if (code === "auth/unauthorized-continue-uri") {
        setErrorMsg("Domain belum diizinkan. Tambahkan localhost di Firebase Console > Authentication > Settings > Authorized domains.");
      } else if (code === "auth/invalid-email") {
        setErrorMsg("Format email tidak valid.");
      } else {
        setErrorMsg(`Gagal mengirim email verifikasi. (${code || error?.message || "Unknown error"})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setSlide(3); // Proceed to "Before your first chat"
    }
  };

  const handleInfoSubmit = () => {
    onComplete(name.trim() || "User", email.trim() || "tamu@gmail.com");
  };

  return (
    <div className="ob-page">
      <div className="ob-body">
        {/* Slide 0: Selamat Datang di ChatBot AI */}
        {slide === 0 && (
          <div className="ob-slide" key="welcome" style={{ maxWidth: "520px" }}>
            <h1 className="ob-title font-serif" style={{ fontSize: "32px", marginBottom: "6px" }}>
              Selamat Datang di ChatBot AI
            </h1>
            <p className="ob-desc" style={{ marginBottom: "18px" }}>
              Partner berpikir cerdas untuk segala kebutuhan koding, kepenulisan, dan kreasi Anda.
            </p>

            <div className="ob-info-box" style={{ marginBottom: "12px" }}>
              {/* Fungsi 1 */}
              <div className="ob-info-row">
                <div className="ob-info-icon-wrapper" style={{ color: "var(--accent)" }}>
                  <IconBot size={18} />
                </div>
                <div className="ob-info-content">
                  <strong>Pengertian ChatBot AI</strong>
                  Asisten cerdas berbasis teknologi AI canggih untuk menyederhanakan tugas-tugas harian Anda melalui percakapan alami.
                </div>
              </div>

              {/* Fungsi 2 */}
              <div className="ob-info-row">
                <div className="ob-info-icon-wrapper" style={{ color: "var(--accent)" }}>
                  <IconSparkle size={18} />
                </div>
                <div className="ob-info-content">
                  <strong>Fungsi Utama</strong>
                  Membantu Anda menulis kode program, menyusun draf artikel, memecahkan materi belajar, dan menuangkan gagasan kreatif secara instan.
                </div>
              </div>

              {/* Keunggulan */}
              <div className="ob-info-row">
                <div className="ob-info-icon-wrapper" style={{ color: "var(--accent)" }}>
                  <IconBolt size={18} />
                </div>
                <div className="ob-info-content">
                  <strong>Keunggulan Desain</strong>
                  Respons secepat kilat (LPU engine), bebas iklan komersial, dan seluruh riwayat chat tersimpan aman secara lokal di browser Anda.
                </div>
              </div>
            </div>

            <button
              onClick={() => setSlide(1)}
              className="ob-btn-primary"
              style={{ marginTop: "12px" }}
            >
              Mulai Sekarang
            </button>
          </div>
        )}

        {/* Slide 1: Auth Page (Google popup or passwordless email) */}
        {slide === 1 && (
          <div className="ob-slide" key="auth">
            <h1 className="ob-title font-serif">Question what's next</h1>
            <p className="ob-desc">Your thinking partner for big ambitions</p>

            {errorMsg && (
              <div style={{ color: "#ff6b6b", fontSize: "13px", marginTop: "10px", textAlign: "center" }}>
                {errorMsg}
              </div>
            )}

            {emailSent ? (
              <div className="ob-auth-box" style={{ textAlign: "center", padding: "32px 24px" }}>
                <div className="ob-info-icon-wrapper" style={{ margin: "0 auto 16px", background: "rgba(255,206,153,0.1)", color: "var(--accent)" }}>
                  <IconKey size={24} />
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>Email Verifikasi Dikirim!</h2>
                <p style={{ fontSize: "13.5px", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "20px" }}>
                  Kami telah mengirimkan tautan masuk ke <strong>{email}</strong>. Silakan periksa kotak masuk (atau folder spam) dan klik tautan tersebut untuk masuk.
                </p>
                <button className="ob-btn-skip" onClick={() => setEmailSent(false)}>
                  Gunakan email lain
                </button>
              </div>
            ) : (
              <div className="ob-auth-box">
                <button className="ob-google-btn" onClick={handleGoogleLogin} disabled={loading}>
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {loading ? "Menghubungkan..." : "Continue with Google"}
                </button>

                <div className="ob-divider">
                  <span>OR</span>
                </div>

                <form onSubmit={handleEmailSubmit} style={{ width: "100%" }}>
                  <input
                    type="email"
                    className="ob-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="ob-btn-primary"
                    style={{ marginTop: 12 }}
                    disabled={!email.trim() || loading}
                  >
                    {loading ? "Mengirim Tautan..." : "Continue with email"}
                  </button>
                </form>

                <p className="ob-policy-text">
                  By continuing, you acknowledge Chatbot <span className="underline cursor-pointer">Privacy Policy</span>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Slide 2: What's your name? (Hanya muncul jika register via email link redirect) */}
        {slide === 2 && (
          <div className="ob-slide" key="name">
            <h1 className="ob-title font-serif">What's your name?</h1>
            <p className="ob-desc">So Chatbot knows what to call you.</p>

            <form onSubmit={handleNameSubmit} style={{ width: "100%", marginTop: 12 }}>
              <input
                type="text"
                className="ob-input text-center"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <button
                type="submit"
                className="ob-btn-primary"
                style={{ marginTop: 12 }}
                disabled={!name.trim()}
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Slide 3: Before your first chat */}
        {slide === 3 && (
          <div className="ob-slide" key="before-chat" style={{ maxWidth: "480px" }}>
            <h1 className="ob-title font-serif">Before your first chat</h1>
            <p className="ob-desc">A few things to know, plus one setting to review</p>

            <div className="ob-info-box" style={{ marginTop: 16 }}>
              {/* Item 1 */}
              <div className="ob-info-row">
                <div className="ob-info-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                </div>
                <div className="ob-info-content">
                  <strong>Ad-free chats:</strong> We won't show you ads or let advertisers influence what Claude says.
                </div>
              </div>

              {/* Item 2 */}
              <div className="ob-info-row">
                <div className="ob-info-icon-wrapper">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ob-info-content">
                  <strong>Built to help, not harm:</strong> Automated safeguards protect your chats from violent, abusive, or deceptive content.
                </div>
              </div>

              {/* Item 3 */}
              <div className="ob-info-row justify-between">
                <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                  <div className="ob-info-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ob-info-content">
                    <strong>Help improve our AI models:</strong> Allow the use of your chats and coding sessions to train and improve AI models.
                  </div>
                </div>
                <div className="ob-toggle-wrapper">
                  <label className="ob-switch">
                    <input
                      type="checkbox"
                      checked={improveModels}
                      onChange={(e) => setImproveModels(e.target.checked)}
                    />
                    <span className="ob-slider-round"></span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleInfoSubmit}
              className="ob-btn-primary"
              style={{ marginTop: 24 }}
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {/* Step dots */}
      <div className="ob-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`ob-dot ${i === slide ? "ob-dot-active" : i < slide ? "ob-dot-done" : ""}`} />
        ))}
      </div>
    </div>
  );
}
