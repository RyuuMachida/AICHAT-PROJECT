"use client";

import React, { useState } from "react";
import { IconSun, IconMoon, IconUser, IconSparkle, IconRotate, IconClock } from "./Icons";

interface SettingsViewProps {
  username: string;
  userPhoto?: string | null;
  onSaveUsername: (newName: string) => void;
  onResetGoogleName: () => void;
  email: string;
  onEmailChange: (email: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenOnboarding: () => void;
  onBackToChat: () => void;
  renameCooldownInfo?: { days: number; hours: number } | null;
  googleDefaultName?: string | null;
}

export default function SettingsView({
  username,
  userPhoto,
  onSaveUsername,
  onResetGoogleName,
  email,
  onEmailChange,
  isDark,
  onToggleTheme,
  onOpenOnboarding,
  onBackToChat,
  renameCooldownInfo,
  googleDefaultName,
}: SettingsViewProps) {
  const [inputName, setInputName] = useState(username);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      onSaveUsername(inputName.trim());
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-wrapper">
        <header className="settings-header">
          <h1 className="settings-view-title">Pengaturan</h1>
          <button className="settings-back-btn" onClick={onBackToChat} title="Kembali ke Percakapan">
            <div className="settings-back-btn-slider">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" height="20px" width="20px">
                <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="currentColor" />
                <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="currentColor" />
              </svg>
            </div>
            <span className="settings-back-btn-label">Kembali</span>
          </button>
        </header>

        <div className="settings-sections">
          {/* Section 1: Profil */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              <IconUser size={18} /> Profil Pengguna
            </h2>

            <form onSubmit={handleFormSubmit} className="settings-group">
              <label className="settings-label">Nama Tampilan</label>
              <div className="settings-input-group">
                {/* Profile Photo / Initial Avatar directly on the left */}
                <div className="settings-profile-avatar">
                  {userPhoto ? (
                    <img src={userPhoto} alt={username} className="settings-avatar-img" />
                  ) : (
                    <div className="settings-avatar-fallback">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  className="settings-input"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Masukkan nama tampilan..."
                />
                <button
                  type="button"
                  className="settings-reset-icon-btn"
                  onClick={onResetGoogleName}
                  title={googleDefaultName ? `Reset ke Nama Google (${googleDefaultName})` : "Reset ke Nama Google"}
                >
                  <IconRotate size={16} />
                </button>
                <button
                  type="submit"
                  className="settings-action-btn primary"
                  disabled={!inputName.trim() || inputName === username}
                >
                  Ganti Nama
                </button>
              </div>

              <p className="settings-help-text">
                Maksimal mengganti atau mereset nama profil adalah <strong>1 kali setiap 7 hari</strong>.
                {renameCooldownInfo && (
                  <span className="settings-cooldown-text">
                    <IconClock size={13} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />
                    jeda : {renameCooldownInfo.days} hari {renameCooldownInfo.hours} jam
                  </span>
                )}
              </p>
            </form>

            <div className="settings-group" style={{ marginTop: 12 }}>
              <label className="settings-label">Alamat Email</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="contoh@email.com"
              />
              <p className="settings-help-text">Ditampilkan di profil sidebar.</p>
            </div>
          </section>

          {/* Section 2: Tampilan & Fitur */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              Tampilan & Fitur
            </h2>
            <div className="settings-options-center-row">
              {/* Uiverse Theme Toggle: Dark (toggle) Light */}
              <div className="theme-toggle-card">
                <span className={`theme-toggle-label ${isDark ? "active" : ""}`}>Gelap</span>
                <div className="toggle-wrapper">
                  <input
                    className="toggle-checkbox"
                    type="checkbox"
                    checked={!isDark}
                    onChange={onToggleTheme}
                  />
                  <div className="toggle-container">  
                    <div className="toggle-button">
                      <div className="toggle-button-circles-container">
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                        <div className="toggle-button-circle"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <span className={`theme-toggle-label ${!isDark ? "active" : ""}`}>Terang</span>
              </div>

              {/* Vertical Divider */}
              <div className="settings-options-divider" />

              {/* Uiverse 3D Button for Panduan Fitur */}
              <button
                className="button-name uiverse-feature-btn"
                role="button"
                onClick={onOpenOnboarding}
              >
                <IconSparkle size={18} style={{ marginRight: 8 }} />
                <span>Panduan Fitur</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
