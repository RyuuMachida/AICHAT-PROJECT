"use client";

import React from "react";
import { IconSun, IconMoon, IconKey, IconUser, IconSparkle } from "./Icons";

interface SettingsViewProps {
  username: string;
  onUsernameChange: (name: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenOnboarding: () => void;
  onBackToChat: () => void;
}

export default function SettingsView({
  username,
  onUsernameChange,
  email,
  onEmailChange,
  isDark,
  onToggleTheme,
  onOpenOnboarding,
  onBackToChat,
}: SettingsViewProps) {
  return (
    <div className="settings-container">
      <div className="settings-wrapper">
        <header className="settings-header">
          <h1 className="settings-view-title">Pengaturan</h1>
          <button className="settings-back-btn" onClick={onBackToChat}>
            <div className="settings-back-btn-slider">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" height="20px" width="20px">
                <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="#000000" />
                <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="#000000" />
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
            <div className="settings-group">
              <label className="settings-label">Nama Tampilan</label>
              <input
                type="text"
                className="settings-input"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder="Masukkan nama tampilan..."
              />
            </div>
            <div className="settings-group">
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

          {/* Section 3: Tampilan & Fitur */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              Tampilan & Fitur
            </h2>
            <div className="settings-options-grid">
              <button className="settings-option-card" onClick={onToggleTheme}>
                <div className="settings-option-icon">
                  {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
                </div>
                <div className="settings-option-info">
                  <div className="settings-option-title">Ubah Tema</div>
                  <div className="settings-option-desc">
                    Saat ini menggunakan mode {isDark ? "Gelap" : "Terang"}
                  </div>
                </div>
              </button>

              <button className="settings-option-card" onClick={onOpenOnboarding}>
                <div className="settings-option-icon">
                  <IconSparkle size={20} />
                </div>
                <div className="settings-option-info">
                  <div className="settings-option-title">Panduan Fitur</div>
                  <div className="settings-option-desc">
                    Tampilkan ulang petunjuk onboarding awal
                  </div>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
