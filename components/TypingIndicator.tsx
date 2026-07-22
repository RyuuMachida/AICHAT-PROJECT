"use client";

import React from "react";

interface TypingIndicatorProps {
  provider?: "gemini" | "groq";
}

export default function TypingIndicator({ provider = "gemini" }: TypingIndicatorProps) {
  return (
    <div className="skeleton-response-container">
      <div className="message-avatar">
        {provider === "groq" ? (
          <img src="/llama.png" alt="Llama" className="ai-model-avatar-img" />
        ) : (
          <img src="/gemini.png" alt="Gemini" className="ai-model-avatar-img" />
        )}
      </div>
      <div className="skeleton-response-body">
        <div className="skeleton-line long" />
        <div className="skeleton-line full" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}
