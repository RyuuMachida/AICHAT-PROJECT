"use client";

import React, { useRef, useEffect } from "react";
import { IconSend, IconLoader, IconClip, IconMic, IconClose } from "./Icons";

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "file";
  data: string; // base64 data URL for images, text content for files
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
  attachments: Attachment[];
  onAddAttachment: (att: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  isRecording,
  onStartRecording,
  onStopRecording,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const hasContent = value.trim() || attachments.length > 0;
      if (hasContent && !isLoading && !disabled && !isRecording) onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();

      // Check if image
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
        // Read file as text (useful for code / docs)
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

    // Reset input value
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
    <div className="input-area">
      <div className="input-wrapper-chat">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="input-attachment-previews">
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

        {/* Text Area or Recording Wave */}
        {isRecording ? (
          <div className="recording-wave-container">
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
            className="input-textarea"
            placeholder="Reply to the conversation..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
          />
        )}

        <div className="input-toolbar">
          <div className="input-toolbar-left">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept="image/*,.txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.csv"
              onChange={handleFileChange}
              disabled={disabled || isRecording}
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Lampirkan File / Gambar"
              disabled={disabled || isRecording}
            >
              <IconClip size={16} color="currentColor" />
            </button>
          </div>

          <div className="input-toolbar-right">
            <button
              type="button"
              className={`input-icon-btn mic-btn ${isRecording ? "recording" : ""}`}
              onClick={handleMicClick}
              title={isRecording ? "Hentikan rekaman" : "Masukan Suara"}
              disabled={disabled && !isRecording}
            >
              <IconMic size={16} color={isRecording ? "#000" : "currentColor"} />
            </button>

            {!isRecording && (
              <button
                className={`send-btn ${isLoading ? "loading" : ""}`}
                onClick={onSend}
                disabled={!hasContent || isLoading || disabled}
                aria-label="Kirim"
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
      <div className="input-footer">
        {isRecording ? "Klik tombol Mic merah untuk selesai merekam" : "Tekan Enter untuk kirim · Shift+Enter untuk baris baru"}
      </div>
    </div>
  );
}
