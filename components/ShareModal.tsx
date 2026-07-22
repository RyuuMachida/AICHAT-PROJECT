"use client";

import React, { useState } from "react";
import { IconClose, IconCheck, IconShare } from "./Icons";
import { Conversation } from "./Sidebar";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface ShareModalProps {
  convo: Conversation;
  onClose: () => void;
}

export default function ShareModal({ convo, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleCreateAndCopyLink = async () => {
    setIsCreatingLink(true);
    try {
      // Create a public share ID
      const shareId = convo.id;
      const shareDocRef = doc(db, "public_shares", shareId);

      // Clean base64 or undefined data before saving public share
      const cleanMessages = convo.messages.map((m) => {
        let content = m.content;
        if (typeof content === "string" && content.length > 300000 && content.startsWith("data:image/")) {
          content = content.slice(0, 100) + "...[truncated]";
        }
        return {
          role: m.role,
          content: content,
          timestamp: m.timestamp,
        };
      });

      await setDoc(shareDocRef, {
        id: shareId,
        title: convo.title,
        messages: cleanMessages,
        createdAt: convo.createdAt,
        sharedAt: new Date().toISOString(),
      });

      const fullUrl = `${window.location.origin}/share/${shareId}`;
      setShareUrl(fullUrl);

      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Error creating public share link:", err);
      // Fallback: Copy summary text if public doc fails
      const fallbackText = `[ChatBot AI - ${convo.title}]\n\n` +
        convo.messages.map(m => `${m.role === "user" ? "User" : "AI"}: ${typeof m.content === "string" ? m.content : "[Lampiran]"}`).join("\n\n");
      await navigator.clipboard.writeText(fallbackText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Preview first few messages
  const previewMessages = convo.messages.slice(0, 3);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title-group">
            <div className="share-modal-icon">
              <IconShare size={18} />
            </div>
            <h2 className="share-modal-title">Share link to Chat</h2>
          </div>
          <button className="share-modal-close" onClick={onClose} title="Tutup">
            <IconClose size={16} />
          </button>
        </div>

        <p className="share-modal-desc">
          Siapapun yang memiliki tautan ini dapat melihat ringkasan percakapan dan mengajukan pertanyaan lanjutan sendiri.
        </p>

        {/* Chat Preview Card */}
        <div className="share-preview-box">
          <div className="share-preview-title font-serif">{convo.title}</div>
          <div className="share-preview-list">
            {previewMessages.map((msg, i) => (
              <div key={i} className="share-preview-item">
                <span className={`share-preview-badge ${msg.role}`}>
                  {msg.role === "user" ? "User" : "AI"}
                </span>
                <span className="share-preview-text">
                  {typeof msg.content === "string" ? msg.content.slice(0, 140) + (msg.content.length > 140 ? "..." : "") : "[Gambar/File Kode]"}
                </span>
              </div>
            ))}
            {convo.messages.length > 3 && (
              <div className="share-preview-more">
                +{convo.messages.length - 3} pesan lainnya
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="share-modal-footer">
          {shareUrl && (
            <input
              type="text"
              className="share-url-input"
              value={shareUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          )}
          <button
            className={`share-btn-primary ${copied ? "copied" : ""}`}
            onClick={handleCreateAndCopyLink}
            disabled={isCreatingLink}
          >
            {copied ? (
              <>
                <IconCheck size={16} />
                <span>Tautan Disalin!</span>
              </>
            ) : (
              <>
                <IconShare size={16} />
                <span>{isCreatingLink ? "Membuat Tautan..." : shareUrl ? "Salin Tautan Kembali" : "Buat & Salin Tautan Public"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
