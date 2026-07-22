"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconBot, IconCopy, IconCheck, IconClose } from "./Icons";

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
  userPhoto?: string | null;
  username?: string;
  provider?: "gemini" | "groq";
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

function CodeFileModalCard({ attachment }: { attachment: FileAttachment }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const ext = attachment.name.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", html: "html", css: "css", json: "json", md: "markdown",
    csv: "csv", txt: "text",
  };
  const lang = langMap[ext] || ext;
  const lineCount = attachment.data.split("\n").length;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(attachment.data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = attachment.data;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="file-card">
        <button className="file-card-header" onClick={() => setShowModal(true)}>
          <div className="file-card-icon">
            <FileIcon size={14} />
          </div>
          <div className="file-card-info">
            <span className="file-card-name">{attachment.name}</span>
            <span className="file-card-meta">{lang} · {lineCount} baris</span>
          </div>
          <div className="file-card-chevron">
            <ChevronIcon open={false} />
          </div>
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="code-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mac-terminal-block modal-style">
              <div className="mac-terminal-header">
                <div className="mac-terminal-dots">
                  <span className="mac-dot red" onClick={() => setShowModal(false)} title="Tutup"></span>
                  <span className="mac-dot yellow"></span>
                  <span className="mac-dot green"></span>
                </div>
                <div className="mac-terminal-title-group">
                  <span className="mac-terminal-title font-mono">{attachment.name}</span>
                  <span className="mac-terminal-submeta">{lang.toUpperCase()} • {lineCount} BARIS</span>
                </div>
                <div className="mac-terminal-actions">
                  <button className="mac-terminal-copy" onClick={handleCopy} title="Salin Kode">
                    {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                    <span>{copied ? "Berhasil Disalin" : "Salin Kode"}</span>
                  </button>
                  <button className="code-modal-close" onClick={() => setShowModal(false)} title="Tutup modal">
                    <IconClose size={14} />
                  </button>
                </div>
              </div>
              <div className="mac-terminal-body modal-scroll">
                <pre><code className={`language-${lang}`}>{attachment.data}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MacTerminalBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mac-terminal-block">
      <div className="mac-terminal-header">
        <div className="mac-terminal-dots">
          <span className="mac-dot red"></span>
          <span className="mac-dot yellow"></span>
          <span className="mac-dot green"></span>
        </div>
        <span className="mac-terminal-title">{language || "code"}</span>
        <button className="mac-terminal-copy" onClick={handleCopy} title="Copy code">
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className="mac-terminal-body">
        <pre><code className={language ? `language-${language}` : ""}>{code}</code></pre>
      </div>
    </div>
  );
}

export default function ChatMessage({ role, content, timestamp, attachments, userPhoto, username, provider = "gemini" }: ChatMessageProps) {
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
    <div className={`message ${role} message-enter-animated`}>
      <div className={`message-avatar${role === "assistant" && provider === "groq" ? " ai-avatar-llama" : ""}`}>
        {role === "assistant" ? (
          provider === "groq" ? (
            <img src="/llama.png" alt="Llama" className="ai-model-avatar-img" />
          ) : (
            <img src="/gemini.png" alt="Gemini" className="ai-model-avatar-img" />
          )
        ) : userPhoto ? (
          <img src={userPhoto} alt={username || "User"} className="user-avatar-img" />
        ) : (
          <span style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: "#000" }}>
            {(username || "U").charAt(0).toUpperCase()}
          </span>
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

          {/* File attachments as modal code preview cards */}
          {fileAttachments.length > 0 && (
            <div className="message-file-cards">
              {fileAttachments.map((att) => (
                <CodeFileModalCard key={att.id} attachment={att} />
              ))}
            </div>
          )}

          <div className="message-text-content">
            {role === "assistant" ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match && !String(children).includes("\n");
                    if (isInline) {
                      return <code className={className} {...rest}>{children}</code>;
                    }
                    const lang = match ? match[1] : "";
                    return (
                      <MacTerminalBlock language={lang} code={String(children).replace(/\n$/, "")} />
                    );
                  }
                }}
              >
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
