"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export type AIProvider = "gemini" | "groq";

interface ModelSelectorProps {
  provider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
  requestHistory: number[]; // timestamps of requests in milliseconds
}

const PROVIDER_CONFIGS = {
  gemini: {
    id: "gemini" as AIProvider,
    name: "Google Gemini 2.5 Flash",
    shortName: "Gemini 2.5",
    rpmLimit: 15,
    tag: "Vision + Text (Super Presisi)",
    iconColor: "#4285F4",
  },
  groq: {
    id: "groq" as AIProvider,
    name: "Groq Llama 3.3 70B",
    shortName: "Llama 3.3",
    rpmLimit: 30,
    tag: "Ultra Fast Inference",
    iconColor: "#FFCE99",
  },
};

export default function ModelSelector({
  provider,
  onSelectProvider,
  requestHistory,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted client-side before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update current time every second to calculate live 60-second sliding window
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Calculate requests sent in the last 60 seconds
  const windowStart = now - 60000;
  const requestsInLastMinute = requestHistory.filter((ts) => ts > windowStart).length;

  const activeConfig = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.gemini;
  const remainingRPM = Math.max(0, activeConfig.rpmLimit - requestsInLastMinute);
  const isLowLimit = remainingRPM <= 3;

  const handleSelect = (key: AIProvider) => {
    onSelectProvider(key);
    setOpen(false);
  };

  return (
    <div className="model-selector-container">
      <button
        className={`model-selector-btn ${isLowLimit ? "warning" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        title="Ganti AI Model & Cek Rate Limit"
      >
        <span className="model-status-dot" style={{ background: isLowLimit ? "#FFA000" : "#4CAF50" }} />
        <span className="model-selector-name">{activeConfig.shortName}</span>
        <span className="model-selector-divider">•</span>
        <span className={`model-selector-limit ${isLowLimit ? "limit-warning" : ""}`}>
          {remainingRPM}/{activeConfig.rpmLimit} RPM
        </span>
      </button>

      {open && mounted && createPortal(
        <>
          {/* Backdrop — klik untuk tutup */}
          <div
            className="model-selector-backdrop"
            onMouseDown={() => setOpen(false)}
          />
          {/* Modal dropdown */}
          <div className="model-selector-dropdown">
            <div className="model-dropdown-header">
              <span>PILIH PROVIDER AI</span>
              <span className="model-dropdown-subtitle">Limit diperbarui realtime</span>
            </div>

            {(Object.keys(PROVIDER_CONFIGS) as AIProvider[]).map((key) => {
              const cfg = PROVIDER_CONFIGS[key];
              const isSelected = key === provider;
              const provReqs = requestHistory.filter((ts) => ts > windowStart).length;
              const provRemaining = Math.max(0, cfg.rpmLimit - provReqs);

              return (
                <button
                  key={key}
                  className={`model-dropdown-item ${isSelected ? "selected" : ""}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleSelect(key);
                  }}
                >
                  <div className="model-item-left">
                    <div className="model-item-title-row">
                      <span className="model-item-title">{cfg.name}</span>
                    </div>
                    <span className="model-item-tag">{cfg.tag}</span>
                  </div>
                  <div className="model-item-right">
                    <span className="model-item-rpm-badge">
                      {provRemaining}/{cfg.rpmLimit} RPM
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
