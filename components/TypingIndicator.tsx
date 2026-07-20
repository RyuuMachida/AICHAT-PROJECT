"use client";

import React from "react";
import { IconBot } from "./Icons";

export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message-avatar" style={{ background: "rgba(255,206,153,0.1)", border: "1px solid rgba(255,206,153,0.15)" }}>
        <IconBot size={16} color="var(--accent)" />
      </div>
      <div className="typing-dots">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
