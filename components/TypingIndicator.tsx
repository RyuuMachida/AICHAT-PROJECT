"use client";

import React from "react";
import { IconBot } from "./Icons";

export default function TypingIndicator() {
  return (
    <div className="skeleton-response-container">
      <div className="message-avatar">
        <IconBot size={16} color="var(--accent)" />
      </div>
      <div className="skeleton-response-body">
        <div className="skeleton-line long" />
        <div className="skeleton-line full" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-status-row">
          <div className="skeleton-pulse-dot" />
          <span className="skeleton-status-text">ChatBot AI sedang berpikir...</span>
        </div>
      </div>
    </div>
  );
}
