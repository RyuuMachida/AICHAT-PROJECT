"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import ChatMessage from "@/components/ChatMessage";
import { IconSparkle, IconBot, IconArrowLeft } from "@/components/Icons";

interface PublicShare {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string | any[]; timestamp: string }[];
  createdAt: string;
  sharedAt?: string;
}

export default function SharedConversationPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params?.id as string;

  const [shareData, setShareData] = useState<PublicShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareId) return;

    const fetchShare = async () => {
      try {
        const docRef = doc(db, "public_shares", shareId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setShareData(docSnap.data() as PublicShare);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error loading public share:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [shareId]);

  return (
    <div className="shared-page-layout">
      {/* Top Header Bar */}
      <header className="shared-page-header">
        <button className="shared-back-btn" onClick={() => router.push("/")}>
          <IconArrowLeft size={16} />
          <span>Kembali</span>
        </button>
        <div className="shared-brand">
          <span className="sidebar-logo">AI</span>
          <span className="font-serif font-bold">ChatBot AI</span>
        </div>
        <button className="shared-start-btn" onClick={() => router.push("/")}>
          <IconSparkle size={14} color="#000" />
          <span>Mulai Chat Baru</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="shared-page-main">
        {loading ? (
          <div className="shared-status-box">
            <div className="pulse-dot" />
            <span>Memuat percakapan publik...</span>
          </div>
        ) : error || !shareData ? (
          <div className="shared-status-box error">
            <h2>Percakapan Tidak Ditemukan</h2>
            <p>Tautan percakapan ini mungkin sudah tidak berlaku atau salah.</p>
            <button className="ob-btn-primary" onClick={() => router.push("/")} style={{ marginTop: 16 }}>
              Buka ChatBot AI
            </button>
          </div>
        ) : (
          <div className="shared-convo-container">
            {/* Title Banner */}
            <div className="shared-title-banner">
              <span className="shared-tag">Shared Conversation</span>
              <h1 className="shared-title font-serif">{shareData.title}</h1>
              <p className="shared-meta">
                Dibuat {new Date(shareData.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Conversation Messages List */}
            <div className="shared-messages-list">
              {shareData.messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
            </div>

            {/* Bottom Call to Action */}
            <div className="shared-bottom-cta">
              <div className="shared-cta-card">
                <IconBot size={28} color="var(--accent)" />
                <div className="shared-cta-content">
                  <h3>Ingin melanjutkan obrolan ini atau membuat pertanyaan baru?</h3>
                  <p>Mulai sesi baru secara gratis bersama ChatBot AI.</p>
                </div>
                <button className="ob-btn-primary" onClick={() => router.push("/")}>
                  Mulai Chat Baru
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
