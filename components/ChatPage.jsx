"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CATEGORIES = ["All", "SaaS & Web", "AI Systems", "UI/UX Design", "Support"];

const SUGGESTIONS = [
  { icon: "🚀", text: "I want to build a SaaS platform with Next.js & Supabase", category: "SaaS & Web" },
  { icon: "🤖", text: "How can Skyphr help integrate custom AI agents & RAG?", category: "AI Systems" },
  { icon: "🎨", text: "Can you help design a modern product UI/UX design system?", category: "UI/UX Design" },
  { icon: "🐛", text: "I need to report a technical bug in my project", category: "Support" },
  { icon: "📞", text: "How do I book a 30-minute discovery call with an architect?", category: "SaaS & Web" },
  { icon: "⚡", text: "What is included in Skyphr's maintenance and SLA plans?", category: "Support" },
];

// Exact Official Skyphr Symbol Mark (from company logo photo)
export function SkyphrSymbolMark({ className = "", size = 26 }) {
  return (
    <span
      className={`skyphr-exact-symbol-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/skyphr-icon.png"
        alt="Skyphr Icon"
        className="skyphr-icon-img light-icon"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <img
        src="/skyphr-icon-white.png"
        alt="Skyphr Icon"
        className="skyphr-icon-img dark-icon"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}

// Complete Exact Official Skyphr Logo Lockup (from company logo photo)
export function SkyphrBrandLogoLockup({ showBadge = true, size = "md" }) {
  const height = size === "lg" ? 32 : size === "sm" ? 20 : 25;

  return (
    <div className={`skyphr-logo-container size-${size}`}>
      <div className="skyphr-exact-logo-wrapper">
        <img
          src="/skyphr-logo.png"
          alt="Skyphr"
          className="skyphr-exact-logo-img light-logo"
          style={{ height: height, width: "auto", objectFit: "contain" }}
        />
        <img
          src="/skyphr-logo-white.png"
          alt="Skyphr"
          className="skyphr-exact-logo-img dark-logo"
          style={{ height: height, width: "auto", objectFit: "contain" }}
        />
      </div>

      {showBadge && (
        <span className="skyphr-logo-badge">AI Support</span>
      )}
    </div>
  );
}

function FormattedMessage({ text }) {
  if (!text) return null;

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "plaintext", content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <div className="formatted-message">
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
          return (
            <div key={pIdx} className="code-block-wrapper">
              <div className="code-header">
                <span>{part.lang}</span>
                <button
                  className="code-copy-btn"
                  onClick={() => navigator.clipboard.writeText(part.content)}
                  title="Copy code"
                >
                  Copy
                </button>
              </div>
              <pre><code>{part.content}</code></pre>
            </div>
          );
        }

        const lines = part.content.split("\n");
        return (
          <div key={pIdx} className="text-section">
            {lines.map((line, lIdx) => {
              const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
              const cleanLine = isBullet ? line.trim().slice(2) : line;

              const renderedLine = cleanLine.split(/(\*\*[^*]+\*\*)/g).map((chunk, cIdx) =>
                chunk.startsWith("**") && chunk.endsWith("**") ? (
                  <strong key={cIdx}>{chunk.slice(2, -2)}</strong>
                ) : (
                  <span key={cIdx}>{chunk}</span>
                )
              );

              if (isBullet) {
                return (
                  <div key={lIdx} className="bullet-point">
                    <span className="bullet-dot">•</span>
                    <span>{renderedLine}</span>
                  </div>
                );
              }

              if (!line.trim()) {
                return <div key={lIdx} className="empty-line" />;
              }

              return <p key={lIdx} className="message-paragraph">{renderedLine}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamText, setStreamText] = useState("");
  const [theme, setTheme] = useState("light");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  // Chat History State
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebarSearch, setShowSidebarSearch] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skyphr_chat_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history:", e);
    }
  }, []);

  const saveSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem("skyphr_chat_sessions", JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn("Failed to save chat sessions:", e);
    }
  };

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollBottom, [messages, loading, streamText, scrollBottom]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Speech Recognition API
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Text-to-Speech (TTS)
  const speakMessage = (text, index) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#]/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const newChat = () => {
    if (speakingIndex !== null && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setInput("");
    setError("");
    setStreamText("");
    setCurrentSessionId(null);
    setSpeakingIndex(null);
    setIsSidebarOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const loadSession = (session) => {
    if (speakingIndex !== null && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setInput("");
    setError("");
    setStreamText("");
    setSpeakingIndex(null);
    setIsSidebarOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    saveSessions(updated);
    if (currentSessionId === sessionId) {
      newChat();
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear all chat history?")) {
      saveSessions([]);
      newChat();
    }
  };

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userTurn = { role: "user", content };
    const next = [...messages, userTurn];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    setStreamText("");

    let activeId = currentSessionId;
    let currentTitle = "";
    if (!activeId) {
      activeId = "session_" + Date.now();
      setCurrentSessionId(activeId);
      currentTitle = content.length > 36 ? content.slice(0, 36) + "…" : content;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to reach Skyphr assistant.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let foundTicket = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamText(accumulated);
            }
            if (parsed.ticket) {
              foundTicket = parsed.ticket;
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
      }

      const finalMessages = [
        ...next,
        { role: "assistant", content: accumulated, ticket: foundTicket },
      ];
      setMessages(finalMessages);

      const existingIdx = sessions.findIndex((s) => s.id === activeId);
      let updatedSessions = [...sessions];
      if (existingIdx >= 0) {
        updatedSessions[existingIdx] = {
          ...updatedSessions[existingIdx],
          messages: finalMessages,
          updatedAt: Date.now(),
        };
      } else {
        const newSessionObj = {
          id: activeId,
          title: currentTitle || "New Conversation",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: finalMessages,
        };
        updatedSessions = [newSessionObj, ...updatedSessions];
      }
      saveSessions(updatedSessions);
    } catch (err) {
      setError(err.message || "Connection interrupted. Please try again.");
    } finally {
      setLoading(false);
      setStreamText("");
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const exportChat = () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map((m) => `[${m.role === "assistant" ? "Skyphr AI" : "You"}]\n${m.content}\n${m.ticket ? `[Ticket Created: #${m.ticket.id}]\n` : ""}`)
      .join("\n----------------------------------------\n\n");
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Skyphr-Chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showWelcome = messages.length === 0 && !loading;

  const filteredSuggestions = selectedCategory === "All"
    ? SUGGESTIONS
    : SUGGESTIONS.filter((s) => s.category === selectedCategory);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`app-layout-wrapper ${isSidebarOpen ? "sidebar-expanded" : ""}`}>
      <div className="skyphr-background" />
      <div className="skyphr-grid-overlay" />

      {/* History Sidebar Backdrop on Mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════
          CHATGPT-STYLE SKYPHR SIDEBAR
      ══════════════════════════════════════ */}
      <aside className={`history-sidebar chatgpt-sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* Sidebar Header: Brand + Header Actions */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={newChat} style={{ cursor: "pointer" }} title="Skyphr">
            <SkyphrBrandLogoLockup showBadge={false} size="sm" />
          </div>
          <div className="sidebar-header-actions">
            <button
              className={`sidebar-icon-btn ${showSidebarSearch ? "active" : ""}`}
              onClick={() => setShowSidebarSearch((prev) => !prev)}
              title="Search chats"
              aria-label="Search chats"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              className="sidebar-icon-btn"
              onClick={() => setIsSidebarOpen(false)}
              title="Close sidebar"
              aria-label="Close sidebar"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSidebarSearch && (
          <div className="sidebar-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                type="button"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Scrollable Navigation Body */}
        <div className="sidebar-scroll-body">
          {/* Top Primary Actions */}
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-nav-item primary ${messages.length === 0 && !currentSessionId ? "active" : ""}`}
              onClick={newChat}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>New chat</span>
            </button>

            <button
              className="sidebar-nav-item"
              onClick={() => {
                send("Browse Skyphr's full AI capability library and services documentation.");
                setIsSidebarOpen(false);
              }}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Library</span>
            </button>

            <button
              className="sidebar-nav-item"
              onClick={() => {
                send("Show me Skyphr's active client project portfolio and SaaS case studies.");
                setIsSidebarOpen(false);
              }}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Projects</span>
            </button>
          </div>

          {/* Recents Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Recents</div>
            <div className="sidebar-section-list">
              {sessions.length === 0 ? (
                <div className="empty-history-compact">
                  <span>No recent chats</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="empty-history-compact">
                  <span>No matching chats</span>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = currentSessionId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`session-item-chatgpt ${isActive ? "active" : ""}`}
                      onClick={() => loadSession(s)}
                    >
                      <span className="session-item-chatgpt-title">{s.title}</span>
                      <button
                        className="session-item-chatgpt-delete"
                        onClick={(e) => deleteSession(e, s.id)}
                        title="Delete chat"
                        aria-label="Delete chat"
                        type="button"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        {sessions.length > 0 && (
          <div className="sidebar-footer-chatgpt">
            <button className="clear-history-btn-chatgpt" onClick={clearAllHistory} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear history</span>
            </button>
          </div>
        )}
      </aside>

      {/* ══════════════════════════════════════
          MAIN CHAT CONTAINER
      ══════════════════════════════════════ */}
      <div className="chat-root">
        {/* Skyphr Official Navigation Header */}
        <header className="skyphr-header">
          <div className="header-left-group">
            {/* Sidebar Toggle Button */}
            <button
              className="history-toggle-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              title="Chat History"
              aria-label="Toggle chat history"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              {sessions.length > 0 && <span className="history-badge">{sessions.length}</span>}
            </button>

            {/* Clickable Brand Logo (Official Vector Mark + Wordmark) */}
            <button
              className="skyphr-brand-logo-btn"
              onClick={newChat}
              title="Skyphr - Start new chat"
              aria-label="Skyphr - Start new chat"
            >
              <SkyphrBrandLogoLockup showBadge={true} size="md" />
            </button>
          </div>

          {/* Navigation Bar */}
          <nav className="skyphr-nav">
            <button className="nav-pill active" onClick={() => send("Tell me about Skyphr and your core capabilities.")}>
              Home
            </button>
            <button className="nav-pill" onClick={() => send("What is Skyphr's background, team, and experience?")}>
              About
            </button>
            <button className="nav-pill" onClick={() => send("What digital product & AI development services does Skyphr offer?")}>
              Services ⌵
            </button>
          </nav>

          {/* Action buttons */}
          <div className="header-actions">
            <button
              className="btn-book-call"
              onClick={() => send("I want to book a 30-minute discovery call for my project.")}
              title="Schedule a 30-min call"
            >
              Book a Call
              <span className="dot-indicator" />
            </button>

            {messages.length > 0 && (
              <>
                <button
                  className="theme-toggle-btn"
                  onClick={exportChat}
                  title="Export chat transcript"
                  aria-label="Export chat"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>

                <button
                  id="new-chat-btn"
                  className="btn-new-chat"
                  onClick={newChat}
                  title="Start new conversation"
                  aria-label="New chat"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </>
            )}

            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-label="Toggle color theme"
            >
              {theme === "light" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Chat Content Stream */}
        <div className="chat-messages" id="chat-messages" role="log" aria-live="polite">
          {/* Skyphr Hero (Welcome State) */}
          {showWelcome && (
            <div className="skyphr-hero">
              <div className="trusted-badge">
                <div className="avatar-stack">
                  <div className="avatar-item">👨‍💻</div>
                  <div className="avatar-item">👩‍💼</div>
                  <div className="avatar-item avatar-plus">+</div>
                </div>
                <span>Trusted by Growing Startups</span>
              </div>

              <h1 className="hero-title">
                Build Scalable <span className="hero-serif">Digital Products</span>, SaaS Platforms & <span className="hero-serif">AI Systems</span>
              </h1>

              <p className="hero-description">
                Skyphr is a global AI development company and digital product partner helping startups, SaaS businesses, and enterprises design, build, and scale innovative software solutions.
              </p>

              <div className="hero-ctas">
                <button
                  className="btn-primary-blue"
                  onClick={() => send("I'd like to get my product built by Skyphr. What are the next steps?")}
                >
                  Get Your Product Built
                  <div className="btn-arrow-circle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </div>
                </button>

                <button
                  className="btn-book-call btn-book-call-hero"
                  onClick={() => send("Let's schedule a 30-minute discovery call.")}
                >
                  Book a Call
                  <span className="dot-indicator" />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="category-filter-bar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="suggestion-grid">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s.text}
                    className="suggestion-chip"
                    onClick={() => send(s.text)}
                  >
                    <span>{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className={`msg-avatar ${m.role}-avatar`}>
                {m.role === "assistant" ? (
                  <SkyphrSymbolMark size={20} />
                ) : (
                  "U"
                )}
              </div>
              <div className="msg-content">
                <div className="msg-label">
                  {m.role === "assistant" ? "Skyphr AI" : "You"}
                </div>
                
                <div className="msg-bubble">
                  <FormattedMessage text={m.content} />

                  {/* Message Action Bar for Assistant */}
                  {m.role === "assistant" && (
                    <div className="msg-action-bar">
                      <button
                        className="msg-action-btn"
                        onClick={() => copyToClipboard(m.content, i)}
                        title="Copy message"
                      >
                        {copiedIndex === i ? "✓ Copied" : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>

                      <button
                        className={`msg-action-btn ${speakingIndex === i ? "speaking" : ""}`}
                        onClick={() => speakMessage(m.content, i)}
                        title="Listen to response"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        {speakingIndex === i ? "Stop Audio" : "Listen"}
                      </button>
                    </div>
                  )}
                </div>

                {m.ticket && (
                  <div className="ticket-card">
                    <div className="ticket-header">
                      <span className="ticket-label">✓ Official Support Ticket</span>
                      <div className="ticket-actions">
                        <span className="ticket-id-badge">#{m.ticket.id}</span>
                        <button
                          className="ticket-copy-btn"
                          onClick={() => copyToClipboard(m.ticket.id, `ticket-${m.ticket.id}`)}
                        >
                          {copiedIndex === `ticket-${m.ticket.id}` ? "Copied!" : "Copy ID"}
                        </button>
                      </div>
                    </div>
                    <div className="ticket-note">
                      Ticket logged for <strong>{m.ticket.name}</strong> ({m.ticket.email}). Our engineering team will review and reply within <strong>4 business hours</strong>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Assistant Streaming Response */}
          {loading && streamText && (
            <div className="msg-row assistant">
              <div className="msg-avatar assistant-avatar">
                <SkyphrSymbolMark size={20} />
              </div>
              <div className="msg-content">
                <div className="msg-label">Skyphr AI</div>
                <div className="msg-bubble">
                  <FormattedMessage text={streamText} />
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && !streamText && (
            <div className="msg-row assistant">
              <div className="msg-avatar assistant-avatar">
                <SkyphrSymbolMark size={20} />
              </div>
              <div className="msg-content">
                <div className="msg-label">Skyphr AI</div>
                <div className="msg-bubble">
                  <div className="typing-dots" aria-label="Skyphr is thinking...">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="chat-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Floating Input Area */}
        <div className="chat-input-area">
          <div className="input-container">
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isListening ? "Listening... speak now" : "Ask about SaaS, AI integrations, pricing, or report an issue..."}
              rows={1}
              maxLength={2500}
              aria-label="Message to Skyphr AI"
              disabled={loading}
            />
            <div className="input-bar-footer">
              <span className="input-helper-text">Press Enter to send · Shift+Enter for new line</span>
              
              <div className="input-actions-group">
                {/* Voice Input Mic Button */}
                <button
                  type="button"
                  className={`btn-mic ${isListening ? "listening" : ""}`}
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Stop listening" : "Voice type"}
                  aria-label="Voice input"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>

                {/* Send Button */}
                <button
                  id="send-btn"
                  className="btn-send"
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <p className="input-bottom-disclaimer">
            Skyphr AI Assistant · Official client support for <a href="https://skyphr.com" target="_blank" rel="noreferrer">skyphr.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
