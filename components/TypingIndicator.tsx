"use client";

import React from "react";
import { ModelId } from "@/lib/models";

interface TypingIndicatorProps {
  provider?: ModelId;
}

export default function TypingIndicator({ provider = "gemini-2.5-flash" }: TypingIndicatorProps) {
  const isGroq = provider === "groq-llama-3.3";
  return (
    <div className="skeleton-response-container">
      <div className={`message-avatar${isGroq ? " ai-avatar-llama" : ""}`}>
        {isGroq ? (
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
