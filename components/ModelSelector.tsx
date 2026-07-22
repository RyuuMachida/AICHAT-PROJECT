"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconSparkle, IconBolt, IconCheck } from "./Icons";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update current time every second to calculate live 60-second sliding window
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate requests sent in the last 60 seconds
  const windowStart = now - 60000;
  const requestsInLastMinute = requestHistory.filter((ts) => ts > windowStart).length;

  const activeConfig = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.gemini;
  const remainingRPM = Math.max(0, activeConfig.rpmLimit - requestsInLastMinute);
  const isLowLimit = remainingRPM <= 3;

  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <button
        className={`model-selector-btn ${isLowLimit ? "warning" : ""}`}
        onClick={() => setOpen(!open)}
        title="Ganti AI Model & Cek Rate Limit"
      >
        <span className="model-status-dot" style={{ background: isLowLimit ? "#FFA000" : "#4CAF50" }} />
        <span className="model-selector-name">{activeConfig.shortName}</span>
        <span className="model-selector-divider">•</span>
        <span className={`model-selector-limit ${isLowLimit ? "limit-warning" : ""}`}>
          {remainingRPM}/{activeConfig.rpmLimit} RPM
        </span>
      </button>

      {open && (
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
                onClick={() => {
                  onSelectProvider(key);
                  setOpen(false);
                }}
              >
                <div className="model-item-left">
                  <div className="model-item-title-row">
                    <span className="model-item-title">{cfg.name}</span>
                    {isSelected && <IconCheck size={14} color="var(--accent)" />}
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
      )}
    </div>
  );
}
