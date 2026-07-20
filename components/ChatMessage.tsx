"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconBot, IconCopy, IconCheck } from "./Icons";

interface FileAttachment {
  id: string;
  name: string;
  type: "image" | "file";
  data: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | any[];
  timestamp?: string;
  attachments?: FileAttachment[];
}

// SVG icons for file cards (inline, no emoji)
function FileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronIcon({ open, size = 12 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CollapsibleFileCard({ attachment }: { attachment: FileAttachment }) {
  const [open, setOpen] = useState(false);

  // Detect language from file extension for syntax highlighting hint
  const ext = attachment.name.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", html: "html", css: "css", json: "json", md: "markdown",
    csv: "csv", txt: "text",
  };
  const lineCount = attachment.data.split("\n").length;

  return (
    <div className="file-card">
      <button className="file-card-header" onClick={() => setOpen(!open)}>
        <div className="file-card-icon">
          <FileIcon size={14} />
        </div>
        <div className="file-card-info">
          <span className="file-card-name">{attachment.name}</span>
          <span className="file-card-meta">{langMap[ext] || ext} · {lineCount} baris</span>
        </div>
        <div className="file-card-chevron">
          <ChevronIcon open={open} />
        </div>
      </button>
      {open && (
        <div className="file-card-body">
          <pre className="file-card-code"><code>{attachment.data}</code></pre>
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ role, content, timestamp, attachments }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);

  // Extract text and image urls from possible multimodal message array
  let textContent = "";
  const imageUrls: string[] = [];

  if (typeof content === "string") {
    textContent = content;
  } else if (Array.isArray(content)) {
    content.forEach((item) => {
      if (item.type === "text") {
        textContent = item.text;
      } else if (item.type === "image_url" && item.image_url?.url) {
        imageUrls.push(item.image_url.url);
      }
    });
  }

  // Separate image attachments and file attachments
  const imageAttachments = attachments?.filter(a => a.type === "image") || [];
  const fileAttachments = attachments?.filter(a => a.type === "file") || [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = textContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`message ${role}`}>
      <div className="message-avatar">
        {role === "assistant" ? (
          <IconBot size={16} color="var(--accent)" />
        ) : (
          <span style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: "#000" }}>U</span>
        )}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {/* Render User Attached Images in bubble */}
          {imageUrls.length > 0 && (
            <div className="message-bubble-images">
              {imageUrls.map((url, i) => (
                <img key={i} src={url} alt="User attachment" className="message-bubble-img" />
              ))}
            </div>
          )}

          {/* Render image attachments from metadata (for images not in content array) */}
          {imageAttachments.length > 0 && imageUrls.length === 0 && (
            <div className="message-bubble-images">
              {imageAttachments.map((att) => (
                <img key={att.id} src={att.data} alt={att.name} className="message-bubble-img" />
              ))}
            </div>
          )}

          {/* File attachments as collapsible cards */}
          {fileAttachments.length > 0 && (
            <div className="message-file-cards">
              {fileAttachments.map((att) => (
                <CollapsibleFileCard key={att.id} attachment={att} />
              ))}
            </div>
          )}

          <div className="message-text-content">
            {role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {textContent}
              </ReactMarkdown>
            ) : (
              textContent && <p style={{ whiteSpace: "pre-wrap" }}>{textContent}</p>
            )}
          </div>
          
          <div className="message-meta-inline">
            {role === "assistant" && textContent && (
              <button className="copy-btn-inline" onClick={handleCopy} title="Salin pesan">
                {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
              </button>
            )}
            {timestamp && <span className="message-time-inline">{timestamp}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
