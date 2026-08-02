"use client";

import React, { useRef, useEffect } from "react";
import { IconSend, IconLoader, IconSparkle, IconCode, IconPencil, IconLightbulb, IconTarget, IconClip, IconMic, IconClose } from "./Icons";
import { Attachment } from "./ChatInput";
import { compressImage } from "@/lib/imageUtils";

import ModelSelector, { AIProvider } from "./ModelSelector";
import PixelBlast from "./PixelBlast";

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
  provider: AIProvider;
  onSelectProvider: (prov: AIProvider) => void;
  requestHistory: number[];
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
  provider,
  onSelectProvider,
  requestHistory,
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

    Array.from(files).forEach(async (file) => {
      if (file.type.startsWith("image/")) {
        try {
          const compressedData = await compressImage(file);
          if (compressedData) {
            onAddAttachment({
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              type: "image",
              data: compressedData,
            });
          }
        } catch (err) {
          console.error("Image processing error:", err);
        }
      } else {
        const reader = new FileReader();
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
    <div className="welcome-screen" style={{ position: "relative", overflow: "hidden" }}>
      <PixelBlast
        variant="square"
        pixelSize={3}
        color="#ffffff"
        patternScale={2}
        patternDensity={1}
        enableRipples
        rippleSpeed={0.3}
        rippleThickness={0.1}
        rippleIntensityScale={1}
        speed={0.5}
        transparent
        edgeFade={0.5}
      />
      {/* Greeting */}
      <div className="welcome-greeting">
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
          <div className="recording-wave-container" style={{ margin: "16px 0" }}>
            <div className="recording-badge">
              <span className="recording-indicator-dot" />
              <span className="recording-status-text">Merekam Suara...</span>
            </div>
            <div className="recording-soundwave-bars">
              <span className="soundwave-bar bar-1" />
              <span className="soundwave-bar bar-2" />
              <span className="soundwave-bar bar-3" />
              <span className="soundwave-bar bar-4" />
              <span className="soundwave-bar bar-5" />
            </div>
            <span className="recording-hint">Klik tombol mikrofon lagi untuk selesai</span>
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
            <ModelSelector
              provider={provider}
              onSelectProvider={onSelectProvider}
              requestHistory={requestHistory}
            />
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
              <IconMic size={16} color="currentColor" />
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
