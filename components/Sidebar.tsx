"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconChat, IconClose, IconPlus, IconGear, IconMore, IconLogOut, IconSparkle } from "./Icons";

export interface MessageAttachment {
  id: string;
  name: string;
  type: "image" | "file";
  data: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string | any[]; timestamp: string; attachments?: MessageAttachment[] }[];
  createdAt: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  username: string;
  email: string;
  userPhoto?: string | null;
  onLogout: () => void;
  onChangeAccount: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function Sidebar({
  conversations,
  activeId,
  isOpen,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onClose,
  onOpenSettings,
  username,
  email,
  userPhoto,
  onLogout,
  onChangeAccount,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button className="sidebar-brand-btn" onClick={onNewChat} title="New Chat">
            <span className="sidebar-logo">AI</span>
            {!collapsed && <span className="sidebar-brand-name font-serif">ChatBot AI</span>}
          </button>
          <div className="sidebar-header-actions">
            {!collapsed && (
              <button className="sidebar-icon-btn" onClick={onNewChat} title="Obrolan Baru">
                <IconPlus size={16} />
              </button>
            )}
            <button className="sidebar-icon-btn collapse-toggle" onClick={onToggleCollapse} title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}>
              <IconMenu size={16} />
            </button>
            <button className="sidebar-icon-btn mobile-close" onClick={onClose} title="Tutup">
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* New Chat Button (collapsed state) */}
        {collapsed && (
          <button className="sidebar-new-btn-collapsed" onClick={onNewChat} title="Obrolan Baru">
            <IconPlus size={18} />
          </button>
        )}

        {/* Conversation list */}
        <div className="sidebar-conversations">
          {conversations.length > 0 && (
            <>
              {!collapsed && <div className="sidebar-section-title">RECENT</div>}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  className={`convo-item ${c.id === activeId ? "active" : ""}`}
                  onClick={() => onSelectConversation(c.id)}
                  title={c.title}
                >
                  <IconChat size={15} color="currentColor" />
                  {!collapsed && <span className="convo-item-title">{c.title}</span>}
                  {!collapsed && (
                    <span
                      className="convo-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                    >
                      <IconClose size={12} color="currentColor" />
                    </span>
                  )}
                </button>
              ))}
            </>
          )}

          {conversations.length === 0 && !collapsed && (
            <div style={{ padding: "24px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              <IconSparkle size={20} color="var(--text-muted)" />
              <div style={{ marginTop: 8 }}>No conversations yet</div>
            </div>
          )}
        </div>

        {/* Profile footer */}
        <div className="sidebar-footer-profile" ref={menuRef}>
          {showMenu && (
            <div className="profile-dropdown-menu">
              <button className="dropdown-item" onClick={() => { setShowMenu(false); onChangeAccount(); }}>
                <IconGear size={14} color="currentColor" />
                <span>Ganti Nama</span>
              </button>
              <button className="dropdown-item" onClick={() => { setShowMenu(false); onOpenSettings(); }}>
                <IconGear size={14} color="currentColor" />
                <span>Pengaturan</span>
              </button>
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <button className="dropdown-item danger" onClick={() => { setShowMenu(false); onLogout(); }}>
                <IconLogOut size={14} color="currentColor" />
                <span>Keluar</span>
              </button>
            </div>
          )}

          <div className="profile-container">
            <div className="profile-avatar">
              {userPhoto ? (
                <img src={userPhoto} alt={username} className="profile-avatar-img" />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="profile-details">
              <span className="profile-name">{username}</span>
              <span className="profile-sub" title={email}>{email || "Tambah email"}</span>
            </div>
            <div className="profile-actions">
              <button className="profile-action-btn" onClick={onOpenSettings} title="Pengaturan">
                <IconGear size={15} />
              </button>
              <button className="profile-action-btn" onClick={() => setShowMenu(!showMenu)} title="Menu">
                <IconMore size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
