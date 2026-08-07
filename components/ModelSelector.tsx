"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MODEL_CONFIGS, ModelId, AIProvider } from "@/lib/models";

// AIProvider = ModelId (alias dipertahankan supaya import lama tetap jalan)
export type { AIProvider };

interface ModelSelectorProps {
  provider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
  requestHistory: Record<ModelId, number[]>; // per-model request timestamps
}

const MODEL_ORDER: ModelId[] = [
  "groq-llama-3.3",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

export default function ModelSelector({
  provider,
  onSelectProvider,
  requestHistory,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const windowStart = now - 60000;
  const requestsInLastMinute = (requestHistory[provider] || []).filter((ts) => ts > windowStart).length;

  const activeConfig = MODEL_CONFIGS[provider] || MODEL_CONFIGS["gemini-2.5-flash"];
  const remainingRPM = Math.max(0, activeConfig.rpmLimit - requestsInLastMinute);
  const isLowLimit = remainingRPM <= 3;

  const handleSelect = (key: ModelId) => {
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
        <span className="model-selector-name">{activeConfig.shortLabel}</span>
        <span className="model-selector-divider">•</span>
        <span className={`model-selector-limit ${isLowLimit ? "limit-warning" : ""}`}>
          {remainingRPM}/{activeConfig.rpmLimit} RPM
        </span>
      </button>

      {open && mounted && createPortal(
        <>
          <div
            className="model-selector-backdrop"
            onMouseDown={() => setOpen(false)}
          />
          <div className="model-selector-dropdown">
            <div className="model-dropdown-header">
              <span>PILIH MODEL AI</span>
              <span className="model-dropdown-subtitle">Limit diperbarui realtime</span>
            </div>

            {MODEL_ORDER.map((key) => {
              const cfg = MODEL_CONFIGS[key];
              const isSelected = key === provider;
              const provReqs = (requestHistory[key] || []).filter((ts) => ts > windowStart).length;
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
                      <span className="model-item-title">{cfg.label}</span>
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