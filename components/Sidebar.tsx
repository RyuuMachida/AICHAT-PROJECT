"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IconClose,
  IconPlus,
  IconGear,
  IconMore,
  IconLogOut,
  IconSparkle,
  IconPin,
  IconPencil,
  IconTrash,
} from "./Icons";

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
  pinned?: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onPinConversation: (id: string) => void;
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

function ConvoItem({
  convo,
  isActive,
  collapsed,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: {
  convo: Conversation;
  isActive: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onPin: () => void;
}) {
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

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const newTitle = prompt("Masukkan nama percakapan baru:", convo.title);
    if (newTitle && newTitle.trim()) {
      onRename(newTitle.trim());
    }
  };

  return (
    <div className="convo-item-container" ref={menuRef}>
      <button
        className={`conversation-item ${isActive ? "active" : ""} ${convo.pinned ? "is-pinned" : ""}`}
        onClick={onSelect}
        title={convo.title}
      >
        <span className="conversation-item-text">{convo.title}</span>
        {!collapsed && (
          <span
            className="conversation-item-more"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Opsi percakapan"
          >
            <IconMore size={15} />
          </span>
        )}
      </button>

      {showMenu && !collapsed && (
        <div className="convo-dropdown-menu">
          <button className="convo-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onPin(); }}>
            <IconPin size={15} />
            <span>{convo.pinned ? "Unpin" : "Pin"}</span>
          </button>
          <button className="convo-dropdown-item" onClick={handleRenameClick}>
            <IconPencil size={15} />
            <span>Rename</span>
          </button>
          <button className="convo-dropdown-item danger" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}>
            <IconTrash size={15} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  conversations,
  activeId,
  isOpen,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
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

  const pinnedConvos = conversations.filter((c) => c.pinned);
  const recentConvos = conversations.filter((c) => !c.pinned);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onClose} />

      <aside className={`sidebar ${isOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        {/* Top toolbar: toggle button + brand */}
        <div className="sidebar-toolbar">
          <button className="sidebar-toggle-btn" onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconMenu size={18} />
          </button>
          <span className="sidebar-brand font-serif">ChatBot AI</span>
        </div>

        {/* Primary nav: New chat button */}
        <nav className="sidebar-nav">
          <button className="nav-item primary" onClick={onNewChat}>
            <span className="nav-item-icon"><IconPlus size={17} color="currentColor" /></span>
            <span className="nav-item-label">New chat</span>
          </button>
        </nav>

        {/* Conversation list */}
        <div className="sidebar-conversations">
          {/* Pinned conversations section */}
          {pinnedConvos.length > 0 && (
            <>
              {!collapsed && <div className="sidebar-section-title">PINNED</div>}
              {pinnedConvos.map((c) => (
                <ConvoItem
                  key={c.id}
                  convo={c}
                  isActive={c.id === activeId}
                  collapsed={collapsed}
                  onSelect={() => onSelectConversation(c.id)}
                  onDelete={() => onDeleteConversation(c.id)}
                  onRename={(newTitle) => onRenameConversation(c.id, newTitle)}
                  onPin={() => onPinConversation(c.id)}
                />
              ))}
            </>
          )}

          {/* Recent conversations section */}
          {recentConvos.length > 0 && (
            <>
              {!collapsed && <div className="sidebar-section-title">RECENTS</div>}
              {recentConvos.map((c) => (
                <ConvoItem
                  key={c.id}
                  convo={c}
                  isActive={c.id === activeId}
                  collapsed={collapsed}
                  onSelect={() => onSelectConversation(c.id)}
                  onDelete={() => onDeleteConversation(c.id)}
                  onRename={(newTitle) => onRenameConversation(c.id, newTitle)}
                  onPin={() => onPinConversation(c.id)}
                />
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
