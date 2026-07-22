"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput, { Attachment } from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import WelcomeScreen from "@/components/WelcomeScreen";
import Sidebar, { Conversation, MessageAttachment } from "@/components/Sidebar";
import OnboardingSlides from "@/components/OnboardingSlides";
import SettingsView from "@/components/SettingsView";
import ModelSelector, { AIProvider } from "@/components/ModelSelector";
import { IconSparkle } from "@/components/Icons";

// Firebase imports
import { db, auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  updateProfile,
  User
} from "firebase/auth";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDoc
} from "firebase/firestore";

interface Message {
  role: "user" | "assistant";
  content: string | any[]; // string or array for multimodal support
  timestamp: string;
  attachments?: MessageAttachment[]; // file/image attachments stored separately for display
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getTimeString() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Sanitize data for Firestore: remove undefined and truncate ultra-large base64 image strings to stay under Firestore 1MB limit
function prepareForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === "string") {
    if (obj.length > 300000 && obj.startsWith("data:image/")) {
      // Keep lightweight metadata representation for Firestore storage
      return obj.slice(0, 100) + "...[truncated]";
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(prepareForFirestore);
  if (typeof obj === "object") {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) clean[key] = prepareForFirestore(obj[key]);
    }
    return clean;
  }
  return obj;
}

const STORAGE_KEY = "chatbot-ai-conversations";
const THEME_KEY = "chatbot-ai-theme";
const SIDEBAR_KEY = "chatbot-ai-sidebar-collapsed";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [setupError, setSetupError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [view, setView] = useState<"chat" | "settings">("chat");
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [requestHistory, setRequestHistory] = useState<number[]>([]);

  const handleSelectProvider = useCallback((prov: AIProvider) => {
    setProvider(prov);
    localStorage.setItem("chatbot-ai-provider", prov);
  }, []);

  // Multimodal state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. Firebase Authentication Listener & Redirect Checker
  useEffect(() => {
    // Default theme setting
    const savedTheme = localStorage.getItem(THEME_KEY);
    const dark = savedTheme !== "light";
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

    const savedCollapsed = localStorage.getItem(SIDEBAR_KEY);
    if (savedCollapsed === "true") setSidebarCollapsed(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setUsername(user.displayName || "User");
        setEmail(user.email || "");

        // Load custom settings from firestore if exists
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().username) {
          setUsername(userDoc.data().username);
        }

        // Sync conversations list from Cloud Firestore
        try {
          const colRef = collection(db, "users", user.uid, "conversations");
          const querySnapshot = await getDocs(colRef);
          const convosList: Conversation[] = [];
          querySnapshot.forEach((doc) => {
            convosList.push({ id: doc.id, ...doc.data() } as Conversation);
          });
          convosList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setConversations(convosList);
        } catch (err) {
          console.error("Error loading conversations from Firestore:", err);
        }
        
        setShowOnboarding(false);
      } else {
        setCurrentUser(null);
        setConversations([]);
        setActiveConvoId(null);
        setMessages([]);
        setUsername("User");
        setEmail("");
        setShowOnboarding(true);
      }
    });

    // Check for Firebase Auth passwordless email link
    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let savedEmail = window.localStorage.getItem("emailForSignIn");
        if (!savedEmail) {
          savedEmail = window.prompt("Harap masukkan email verifikasi Anda kembali:");
        }
        if (savedEmail) {
          try {
            await signInWithEmailLink(auth, savedEmail, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
          } catch (e) {
            console.error("Email link login error:", e);
            alert("Tautan verifikasi kedaluwarsa atau tidak valid.");
          }
        }
      }
    };
    handleEmailLinkSignIn();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (view === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, view]);

  // 2. Action Handlers (Firebase DB sync replacements)
  const handleNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setView("chat");
    setActiveConvoId(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setIsLoading(false);
    setSetupError(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    const convo = conversations.find((c) => c.id === id);
    if (convo) {
      setView("chat");
      setActiveConvoId(id);
      setMessages(convo.messages);
      setSetupError(false);
      setAttachments([]);
    }
    setSidebarOpen(false);
  }, [conversations]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "conversations", id));
      } catch (err) {
        console.error("Error deleting from Firestore:", err);
      }
    }

    if (activeConvoId === id) {
      setActiveConvoId(null);
      setMessages([]);
    }
  }, [conversations, activeConvoId, currentUser]);

  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    const updated = conversations.map((c) => (c.id === id ? { ...c, title: newTitle } : c));
    setConversations(updated);

    const targetConvo = updated.find((c) => c.id === id);
    if (currentUser && targetConvo) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "conversations", id), prepareForFirestore(targetConvo));
      } catch (err) {
        console.error("Error renaming in Firestore:", err);
      }
    }
  }, [conversations, currentUser]);

  const handlePinConversation = useCallback(async (id: string) => {
    const updated = conversations.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c));
    setConversations(updated);

    const targetConvo = updated.find((c) => c.id === id);
    if (currentUser && targetConvo) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "conversations", id), prepareForFirestore(targetConvo));
      } catch (err) {
        console.error("Error pinning in Firestore:", err);
      }
    }
  }, [conversations, currentUser]);

  const handleToggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const handleUsernameChange = async (name: string) => {
    const newName = name || "User";
    setUsername(newName);

    if (currentUser) {
      try {
        await updateProfile(currentUser, { displayName: newName });
        await setDoc(doc(db, "users", currentUser.uid), { username: newName, email }, { merge: true });
      } catch (err) {
        console.error("Error saving username to Firebase:", err);
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Keluar dari akun Anda?")) {
      try {
        await signOut(auth);
        setView("chat");
      } catch (err) {
        console.error("Sign out error:", err);
      }
    }
  };

  const handleChangeAccount = () => {
    const newName = prompt("Masukkan nama tampilan baru:", username);
    if (newName !== null) handleUsernameChange(newName);
  };

  const handleCompleteOnboarding = async (newName: string, newEmail: string) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: newName });
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { username: newName, email: newEmail },
          { merge: true }
        );
        setUsername(newName);
        setEmail(newEmail);
      } catch (err) {
        console.error("Error saving onboarding details to Firebase:", err);
      }
    }
    setShowOnboarding(false);
  };

  // Recording Handlers
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Gagal melakukan transkripsi.");

          const data = await response.json();
          if (data.text) {
            setInput((prev) => (prev ? prev + " " + data.text : data.text));
          }
        } catch (e) {
          console.error("Transcription error:", e);
          alert("Gagal menerjemahkan rekaman suara Anda.");
        } finally {
          setIsLoading(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio recording permission error:", err);
      alert("Tidak dapat mengakses mikrofon Anda.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Attachment Actions
  const handleAddAttachment = (att: Attachment) => {
    setAttachments((prev) => [...prev, att]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    const hasAttachments = attachments.length > 0;
    if (!trimmed && !hasAttachments) return;
    if (isLoading) return;

    const images = attachments.filter((a) => a.type === "image");
    const codeFiles = attachments.filter((a) => a.type === "file");

    // For display: store clean text + attachments metadata separately
    let displayContent: string | any[] = trimmed;
    if (images.length > 0) {
      const contentArray: any[] = [];
      contentArray.push({ type: "text", text: trimmed });
      images.forEach((img) => {
        contentArray.push({ type: "image_url", image_url: { url: img.data } });
      });
      displayContent = contentArray;
    }

    const messageAttachments: MessageAttachment[] = attachments.map(a => ({
      id: a.id, name: a.name, type: a.type, data: a.data
    }));

    const userMessage: Message = {
      role: "user",
      content: displayContent,
      timestamp: getTimeString(),
      ...(messageAttachments.length > 0 ? { attachments: messageAttachments } : {}),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setSetupError(false);

    let convoId = activeConvoId;
    let updatedConvos = [...conversations];
    const firstText = trimmed || (hasAttachments ? `[Mengirim ${attachments.length} file]` : "Percakapan baru");
    const activeConvoTitle = firstText.slice(0, 50) + (firstText.length > 50 ? "..." : "");

    let newOrUpdatedConvo: Conversation;

    if (!convoId) {
      convoId = generateId();
      setActiveConvoId(convoId);
      newOrUpdatedConvo = {
        id: convoId,
        title: activeConvoTitle,
        messages: updatedMessages,
        createdAt: new Date().toISOString()
      };
      updatedConvos = [newOrUpdatedConvo, ...updatedConvos];
    } else {
      const existingConvo = conversations.find(c => c.id === convoId);
      newOrUpdatedConvo = {
        id: convoId,
        title: existingConvo ? existingConvo.title : activeConvoTitle,
        messages: updatedMessages,
        createdAt: existingConvo ? existingConvo.createdAt : new Date().toISOString()
      };
      updatedConvos = updatedConvos.map((c) => c.id === convoId ? newOrUpdatedConvo : c);
    }
    setConversations(updatedConvos);

    // Sync to Cloud Firestore if logged in
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "conversations", convoId), prepareForFirestore(newOrUpdatedConvo));
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // For API: build full content with file data inlined so AI can read it
    const apiMessages = updatedMessages.map((m) => {
      if (m.attachments && m.attachments.length > 0) {
        const files = m.attachments.filter(a => a.type === "file");
        const imgs = m.attachments.filter(a => a.type === "image");
        const baseText = typeof m.content === "string" ? m.content : (Array.isArray(m.content) ? (m.content.find((c: any) => c.type === "text")?.text || "") : "");

        if (imgs.length > 0) {
          const arr: any[] = [];
          let promptText = baseText;
          if (files.length > 0) {
            promptText += "\n\n[Lampiran File Kode]:\n" + files.map(f => `File: ${f.name}\n\`\`\`\n${f.data}\n\`\`\``).join("\n\n");
          }
          arr.push({ type: "text", text: promptText });
          imgs.forEach(img => arr.push({ type: "image_url", image_url: { url: img.data } }));
          return { role: m.role, content: arr };
        } else if (files.length > 0) {
          return { role: m.role, content: baseText + "\n\n[Lampiran File Kode]:\n" + files.map(f => `File: ${f.name}\n\`\`\`\n${f.data}\n\`\`\``).join("\n\n") };
        }
      }
      return { role: m.role, content: m.content };
    });

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Record request timestamp for rate limit tracking
      setRequestHistory((prev) => [...prev, Date.now()]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: apiMessages, provider }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.setup) { setSetupError(true); setIsLoading(false); return; }
        throw new Error(errorData.error || "Request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
          }
        }
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantContent,
        timestamp: getTimeString()
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      const finalConvo = { ...newOrUpdatedConvo, messages: finalMessages };
      setConversations(updatedConvos.map((c) => c.id === convoId ? finalConvo : c));

      if (currentUser) {
        await setDoc(doc(db, "users", currentUser.uid, "conversations", convoId), prepareForFirestore(finalConvo));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessages([...updatedMessages, {
        role: "assistant",
        content: "Terjadi kesalahan. Pastikan API key sudah benar di file .env.local.\n\nError: " + (error instanceof Error ? error.message : "Unknown"),
        timestamp: getTimeString(),
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, activeConvoId, conversations, attachments, currentUser]);

  const inConversation = messages.length > 0 || setupError;

  return (
    <div className="app-layout">
      {showOnboarding && <OnboardingSlides onComplete={handleCompleteOnboarding} />}

      <Sidebar
        conversations={conversations}
        activeId={activeConvoId}
        isOpen={sidebarOpen}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onPinConversation={handlePinConversation}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => { setView("settings"); setSidebarOpen(false); }}
        username={username}
        email={email}
        userPhoto={currentUser?.photoURL || null}
        onLogout={handleLogout}
        onChangeAccount={handleChangeAccount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="main-content">
        {view === "settings" ? (
          <SettingsView
            username={username}
            onUsernameChange={handleUsernameChange}
            email={email}
            onEmailChange={(val) => {
              setEmail(val);
              if (currentUser) {
                setDoc(doc(db, "users", currentUser.uid), { email: val }, { merge: true });
              }
            }}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            onOpenOnboarding={() => setShowOnboarding(true)}
            onBackToChat={() => setView("chat")}
          />
        ) : !inConversation ? (
          /* Claude-style welcome with centered input */
          <WelcomeScreen
            username={username}
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            attachments={attachments}
            onAddAttachment={handleAddAttachment}
            onRemoveAttachment={handleRemoveAttachment}
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            provider={provider}
            onSelectProvider={handleSelectProvider}
            requestHistory={requestHistory}
          />
        ) : (
          /* Active chat */
          <>
            <div className="chat-top-bar">
              <ModelSelector
                provider={provider}
                onSelectProvider={handleSelectProvider}
                requestHistory={requestHistory}
              />
            </div>

            <div className="chat-container">
              <div className="chat-inner">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    attachments={msg.attachments}
                    userPhoto={currentUser?.photoURL || null}
                    username={username}
                  />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
                <div ref={chatEndRef} />
              </div>
            </div>

            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              disabled={setupError}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </>
        )}
      </div>
    </div>
  );
}
