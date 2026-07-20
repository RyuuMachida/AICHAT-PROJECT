"use client";

import React, { useRef, useEffect } from "react";
import { IconSend, IconLoader, IconSparkle, IconCode, IconPencil, IconLightbulb, IconTarget, IconClip, IconMic, IconClose } from "./Icons";
import { Attachment } from "./ChatInput";

interface WelcomeScreenProps {
  username: string;
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  attachments: Attachment[];
  onAddAttachment: (att: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

const chips = [
  { icon: <IconCode size={13} color="currentColor" />, label: "Code" },
  { icon: <IconSparkle size={13} color="currentColor" />, label: "Create" },
  { icon: <IconPencil size={13} color="currentColor" />, label: "Write" },
  { icon: <IconLightbulb size={13} color="currentColor" />, label: "Learn" },
  { icon: <IconTarget size={13} color="currentColor" />, label: "Explore" },
];

const chipPrompts: Record<string, string> = {
  Code: "Buatkan kode Python sederhana untuk ",
  Create: "Buat sebuah konsep kreatif untuk ",
  Write: "Tulis sebuah artikel atau esai tentang ",
  Learn: "Jelaskan konsep ini dengan mudah: ",
  Explore: "Apa yang menarik tentang topik ini: ",
};

export default function WelcomeScreen({
  username,
  value,
  onChange,
  onSend,
  isLoading,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  isRecording,
  onStartRecording,
  onStopRecording,
}: WelcomeScreenProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const hasContent = value.trim() || attachments.length > 0;
      if (hasContent && !isLoading && !isRecording) onSend();
    }
  };

  const handleChip = (label: string) => {
    onChange(chipPrompts[label] || label);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith("image/")) {
        reader.onload = (event) => {
          if (event.target?.result) {
            onAddAttachment({
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              type: "image",
              data: event.target.result as string,
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          if (event.target?.result) {
            onAddAttachment({
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              type: "file",
              data: event.target.result as string,
            });
          }
        };
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMicClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const hasContent = value.trim() || attachments.length > 0;

  return (
    <div className="welcome-screen">
      {/* Greeting */}
      <div className="welcome-greeting">
        <span className="welcome-greeting-icon">
          <IconSparkle size={36} color="var(--accent)" />
        </span>
        <h1 className="welcome-title">
          {getGreeting()}, {username}
        </h1>
      </div>

      {/* Floating input card */}
      <div className="welcome-input-card">
        {/* Previews inside the input card wrapper */}
        {attachments.length > 0 && (
          <div className="input-attachment-previews" style={{ marginBottom: 12 }}>
            {attachments.map((att) => (
              <div key={att.id} className="attachment-chip">
                {att.type === "image" ? (
                  <img src={att.data} alt={att.name} className="attachment-img-preview" />
                ) : (
                  <div className="attachment-file-preview-icon">Code</div>
                )}
                <span className="attachment-chip-name">{att.name}</span>
                <button
                  type="button"
                  className="attachment-chip-remove"
                  onClick={() => onRemoveAttachment(att.id)}
                  aria-label="Hapus lampiran"
                >
                  <IconClose size={12} color="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isRecording ? (
          <div className="recording-wave-container" style={{ margin: "24px 0" }}>
            <div className="recording-pulse-dots">
              <div className="pulse-dot" />
              <div className="pulse-dot" />
              <div className="pulse-dot" />
              <div className="pulse-dot" />
            </div>
            <span className="recording-label">Sedang merekam suara Anda...</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="welcome-textarea"
            placeholder="How can I help you today?"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            autoFocus
          />
        )}

        <div className="welcome-input-footer">
          <div className="welcome-input-left">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept="image/*,.txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.csv"
              onChange={handleFileChange}
              disabled={isLoading || isRecording}
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Lampirkan File / Gambar"
              disabled={isLoading || isRecording}
            >
              <IconClip size={16} color="currentColor" />
            </button>
            <div className="model-badge">
              <IconSparkle size={12} color="var(--accent)" />
              Llama 3.3 70B
            </div>
          </div>

          <div className="welcome-input-right">
            <button
              type="button"
              className={`input-icon-btn mic-btn ${isRecording ? "recording" : ""}`}
              onClick={handleMicClick}
              title={isRecording ? "Hentikan rekaman" : "Masukan Suara"}
              disabled={isLoading && !isRecording}
              style={{ marginRight: 6 }}
            >
              <IconMic size={16} color={isRecording ? "#000" : "currentColor"} />
            </button>

            {!isRecording && (
              <button
                className="send-btn-welcome"
                onClick={onSend}
                disabled={!hasContent || isLoading}
                aria-label="Send"
              >
                {isLoading ? (
                  <IconLoader size={16} className="spin" />
                ) : (
                  <IconSend size={16} color="#000" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick action chips */}
      <div className="welcome-chips">
        {chips.map((chip) => (
          <button
            key={chip.label}
            className="chip-btn"
            onClick={() => handleChip(chip.label)}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
