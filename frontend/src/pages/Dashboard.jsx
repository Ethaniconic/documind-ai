import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  MessageSquare, 
  Plus, 
  Search, 
  FileText, 
  Upload, 
  LogOut, 
  Send, 
  Bot, 
  User, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  RefreshCw, 
  FolderOpen,
  Pin,
  Pencil,
  Trash2,
  Check,
  X,
  Network
} from "lucide-react";
import { 
  getUserDocuments, 
  uploadDocument, 
  deleteDocument,
  createChat, 
  getUserChats, 
  getChatHistory, 
  chatDocuments,
  processDocument,
  generateEmbeddings,
  renameChat,
  deleteChat
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import KnowledgeGraphModal from "../components/KnowledgeGraph/KnowledgeGraphModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  // Resizable Panels State with LocalStorage Persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("documind_sidebar_width");
    return saved ? Number(saved) : 270;
  });

  const [splitPercent, setSplitPercent] = useState(() => {
    const saved = localStorage.getItem("documind_split_percent");
    return saved ? Number(saved) : 48;
  });

  const isResizingSidebar = useRef(false);
  const isResizingSplit = useRef(false);
  const mainAreaRef = useRef(null);

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Chats & Messages State
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Chat Management State (Pin & Rename)
  const [pinnedChatIds, setPinnedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("documind_pinned_chats") || "[]");
    } catch {
      return [];
    }
  });
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // Knowledge Graph Modal State
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [graphDocId, setGraphDocId] = useState(null);
  const [graphDocTitle, setGraphDocTitle] = useState("");

  const handleOpenGraph = (doc) => {
    const docId = doc?.id || doc?.filename || "default";
    setGraphDocId(docId);
    setGraphDocTitle(doc?.filename || "Document Knowledge Graph");
    setIsGraphOpen(true);
  };

  const messagesEndRef = useRef(null);

  // 1. Initial Load from currentUser
  useEffect(() => {
    if (currentUser) {
      loadInitialData(currentUser.id || currentUser.email || "demo-user");
    }
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialData = async (userId) => {
    try {
      console.log("Loading initial data for user:", userId);
      // Load user documents
      const docs = await getUserDocuments(userId);
      console.log("Docs received from API:", docs);
      setDocuments(docs || []);

      // Load user chat threads
      const userChats = await getUserChats(userId);
      console.log("Chats received from API:", userChats);
      setChats(userChats || []);

      // Auto-select latest chat or prepare a fresh state
      if (userChats && userChats.length > 0) {
        selectChat(userChats[0].id);
      } else {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  // 2. Select / Load Chat History
  const selectChat = async (chatId) => {
    setActiveChatId(chatId);
    try {
      const history = await getChatHistory(chatId);
      setMessages(history || []);
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setMessages([]);
    }
  };

  // 3. Create New Chat
  const handleNewChat = async () => {
    const userId = currentUser?.id || currentUser?.email || "demo-user";
    try {
      const newChat = await createChat(userId);
      if (newChat && newChat.id) {
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  // 4. Send Message (User -> FastAPI Chat -> LLM -> Save User & AI to PostgreSQL)
  const handleSendMessage = async (customPrompt) => {
    const queryText = customPrompt || inputQuery;
    if (!queryText.trim() || chatLoading) return;

    const userId = currentUser?.id || currentUser?.email || null;
    let chatId = activeChatId;

    // If no active chat, create one first
    if (!chatId) {
      try {
        const newChat = await createChat(userId || "demo-user");
        if (newChat && newChat.id) {
          chatId = newChat.id;
          setActiveChatId(chatId);
          setChats((prev) => [newChat, ...prev]);
        }
      } catch (err) {
        console.error("Could not initialize chat session", err);
      }
    }

    // Optimistic UI update for user message
    const userMsg = { role: "user", content: queryText, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setChatLoading(true);

    try {
      // Call backend /chat with chat_id and userId for strict tenant isolation
      const res = await chatDocuments(queryText, selectedDocId, chatId, userId);
      const aiMsg = { 
        role: "assistant", 
        content: res.answer, 
        created_at: new Date().toISOString(),
        sources: res.sources 
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: "Sorry, I encountered an issue generating a response. Please try again.",
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // 5. File Upload (Storage + PostgreSQL metadata + RAG Pipeline)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      setUploadError("Please upload a .pdf file.");
      return;
    }

    setUploading(true);
    setUploadError("");

    const userId = currentUser?.id || currentUser?.email || "demo-user";

    try {
      // Upload to Supabase Storage and insert metadata into documents table
      const doc = await uploadDocument(file, userId);
      setDocuments((prev) => [doc, ...prev]);

      // Automatically trigger text processing & embedding for RAG
      if (doc?.id) {
        try {
          await processDocument(doc.id);
          await generateEmbeddings(doc.id);
        } catch (procErr) {
          console.warn("Auto-index note:", procErr);
        }
      }
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // 6. Delete Document
  const handleDeleteDocument = async (doc) => {
    const docId = doc?.id || doc?.filename;
    const docName = doc?.filename || "this document";
    if (!window.confirm(`Are you sure you want to delete "${docName}"? This will remove all associated index data and knowledge graphs.`)) {
      return;
    }
    try {
      const userId = currentUser?.id || currentUser?.email || null;
      await deleteDocument(docId, userId);
      setDocuments((prev) => prev.filter((d) => (d.id || d.filename) !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert(err.response?.data?.detail || "Failed to delete document. Please try again.");
    }
  };

  // Resizing handlers
  const startResizingSidebar = (e) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      if (!isResizingSidebar.current) return;
      const newWidth = Math.min(Math.max(moveEvent.clientX, 190), 450);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingSidebar.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setSidebarWidth((latest) => {
        localStorage.setItem("documind_sidebar_width", latest);
        return latest;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const startResizingSplit = (e) => {
    e.preventDefault();
    isResizingSplit.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      if (!isResizingSplit.current || !mainAreaRef.current) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      const newPercent = Math.min(Math.max((offsetX / rect.width) * 100, 20), 80);
      setSplitPercent(Math.round(newPercent));
    };

    const onMouseUp = () => {
      isResizingSplit.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setSplitPercent((latest) => {
        localStorage.setItem("documind_split_percent", latest);
        return latest;
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Chat Actions: Pin, Rename, Delete
  const togglePinChat = (chatId) => {
    setPinnedChatIds((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [chatId, ...prev];
      localStorage.setItem("documind_pinned_chats", JSON.stringify(next));
      return next;
    });
  };

  const startRenameChat = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title || `Chat #${String(chat.id).slice(0, 6)}`);
  };

  const handleSaveRename = async (chatId) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingChatId(null);
      return;
    }
    try {
      await renameChat(chatId, trimmed);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c))
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
    } finally {
      setEditingChatId(null);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Are you sure you want to delete this chat thread?")) return;
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setPinnedChatIds((prev) => {
        const next = prev.filter((id) => id !== chatId);
        localStorage.setItem("documind_pinned_chats", JSON.stringify(next));
        return next;
      });
      if (activeChatId === chatId) {
        const remaining = chats.filter((c) => c.id !== chatId);
        if (remaining.length > 0) {
          selectChat(remaining[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userName = currentUser?.email ? currentUser.email.split("@")[0] : "User";
  const filteredChats = chats.filter((c) => 
    searchQuery 
      ? (String(c.id).toLowerCase().includes(searchQuery.toLowerCase()) || 
         (c.title || `Chat ${c.id}`).toLowerCase().includes(searchQuery.toLowerCase())) 
      : true
  );

  const sortedChats = [...filteredChats].sort((a, b) => {
    const aPinned = pinnedChatIds.includes(a.id);
    const bPinned = pinnedChatIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });


  return (
    <div className="flex h-screen w-screen bg-[#080d1a] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ─── LEFT SIDEBAR (Chats & Navigation) ─── */}
      <aside 
        style={{ width: `${sidebarWidth}px` }} 
        className="bg-[#0b101c] border-r border-slate-800/80 flex flex-col h-full shrink-0 select-none overflow-hidden"
      >
        
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold text-slate-200 capitalize truncate">{userName}</div>
              <div className="text-xs text-slate-500 truncate">{currentUser?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title="Log out"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Chats */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-[#101626] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Previous Chats List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-2 mb-2 flex items-center justify-between">
            <span>Previous Chats</span>
            <span className="text-[10px] text-slate-500 font-mono">({sortedChats.length})</span>
          </div>

          {sortedChats.length === 0 ? (
            <div className="px-2 py-4 text-xs text-slate-400 text-center">
              No previous chats found.
            </div>
          ) : (
            sortedChats.map((c) => {
              const isActive = activeChatId === c.id;
              const isPinned = pinnedChatIds.includes(c.id);
              const isEditing = editingChatId === c.id;
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent";

              if (isEditing) {
                return (
                  <div key={c.id} className="p-1.5 rounded-xl bg-[#12192c] border border-purple-500/60 flex items-center gap-1.5 shadow-sm">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(c.id);
                        if (e.key === "Escape") setEditingChatId(null);
                      }}
                      autoFocus
                      placeholder="Chat title..."
                      className="flex-1 bg-[#090d18] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() => handleSaveRename(c.id)}
                      title="Save"
                      className="p-1 rounded-md text-emerald-400 hover:bg-emerald-950/60 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingChatId(null)}
                      title="Cancel"
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  onClick={() => selectChat(c.id)}
                  className={`group relative w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                    isActive 
                      ? "bg-purple-600/20 border border-purple-500/50 text-purple-100 shadow-sm" 
                      : "text-slate-300 hover:bg-[#12192c] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {isPinned ? (
                      <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/40 rotate-45" />
                    ) : (
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                    )}
                    <span className="truncate font-medium">{c.title || `Chat Thread #${String(c.id).slice(0, 6)}`}</span>
                  </div>

                  {/* Actions visible on hover or if active */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChat(c.id);
                      }}
                      title={isPinned ? "Unpin chat" : "Pin chat to top"}
                      className={`p-1 rounded-md hover:bg-slate-800 transition cursor-pointer ${
                        isPinned ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
                      }`}
                    >
                      <Pin className={`w-3 h-3 ${isPinned ? "fill-amber-400 rotate-45" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenameChat(c);
                      }}
                      title="Rename chat"
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-purple-300 transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(c.id);
                      }}
                      title="Delete chat"
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Date (hidden on group hover to make room for buttons) */}
                  <span className="text-[10px] text-slate-500 shrink-0 group-hover:hidden">{dateStr}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Supabase Active
          </span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* ─── SIDEBAR RESIZE HANDLE ─── */}
      <div 
        onMouseDown={startResizingSidebar}
        title="Drag to resize sidebar width"
        className="w-1.5 hover:w-2 bg-slate-800/40 hover:bg-purple-600 active:bg-purple-500 cursor-col-resize transition-all shrink-0 relative flex items-center justify-center group z-30 select-none"
      >
        <div className="w-0.5 h-8 bg-slate-700 rounded-full group-hover:bg-purple-200 transition" />
      </div>


      {/* ─── MAIN CONTENT: KNOWLEDGE BASE + AI CHAT ASSISTANT ─── */}
      <main ref={mainAreaRef} className="flex-1 flex overflow-hidden">
        
        {/* CENTER PANEL: Upload Knowledge & Uploaded PDFs */}
        <section 
          style={{ width: `${splitPercent}%` }} 
          className="border-r border-slate-800/80 flex flex-col h-full bg-[#080d1a] overflow-y-auto p-6 shrink-0 min-w-[280px]"
        >
          
          {/* User Greeting (matching reference image 3) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Hello, {userName}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Midday check-in! What can I assist you with today?
            </p>
          </div>

          {/* Upload Knowledge Dropzone (matching reference image 2) */}
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Upload Knowledge
            </div>
            
            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 bg-[#0d1322] hover:bg-[#10182c] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={uploading}
              />
              <div className="w-11 h-11 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition">
                {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </div>
              <div className="text-xs font-medium text-slate-200 mb-1">
                {uploading ? "Uploading & Storing to Supabase..." : "Click to upload or drag and drop"}
              </div>
              <div className="text-[11px] text-slate-500">
                PDF format (max 20MB) • Saved to Supabase Bucket & PostgreSQL
              </div>
            </label>

            {uploadError && (
              <div className="mt-2 text-xs text-red-400 px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/50">
                {uploadError}
              </div>
            )}
          </div>

          {/* Uploaded PDFs / Knowledge Base Table (matching reference image 2) */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Knowledge Base (Uploaded PDFs)
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {documents.length} {documents.length === 1 ? "document" : "documents"}
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="flex-1 border border-slate-800/60 rounded-xl bg-[#0b101c]/50 flex flex-col items-center justify-center p-8 text-center">
                <FileText className="w-8 h-8 text-slate-600 mb-2" />
                <div className="text-xs text-slate-400 font-medium">No documents uploaded yet</div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                  Upload a PDF document above to start indexing and chatting with your files.
                </div>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {documents.map((doc, idx) => {
                  const isSelected = selectedDocId === (doc.id || doc.filename);
                  return (
                    <div
                      key={doc.id || idx}
                      onClick={() => setSelectedDocId(isSelected ? null : (doc.id || doc.filename))}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? "bg-purple-950/30 border-purple-500/50" 
                          : "bg-[#0d1322] border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-purple-900/30 border border-purple-600/30 flex items-center justify-center text-purple-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-1.5">
                            <span>{doc.filename}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {doc.pages ? `${doc.pages} pages` : "Document"} • {doc.storage_path || "Indexed"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGraph(doc);
                          }}
                          title="Open Interactive Knowledge Graph & Tree"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-700/60 flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                        >
                          <Network className="w-3.5 h-3.5 text-purple-400" />
                          <span>Graph</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc);
                          }}
                          title={`Delete ${doc.filename}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Indexed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── SPLIT DRAG RESIZE HANDLE ─── */}
        <div 
          onMouseDown={startResizingSplit}
          title="Drag to adjust panel split"
          className="w-1.5 hover:w-2 bg-slate-800/40 hover:bg-purple-600 active:bg-purple-500 cursor-col-resize transition-all shrink-0 relative flex items-center justify-center group z-30 select-none border-x border-slate-800/60"
        >
          <div className="w-0.5 h-8 bg-slate-700 rounded-full group-hover:bg-purple-200 transition" />
        </div>

        {/* RIGHT PANEL: AI Assistant Chat */}
        <section 
          style={{ width: `${100 - splitPercent}%` }} 
          className="flex flex-col h-full bg-[#080d1a] relative flex-1 min-w-[320px]"
        >
          
          {/* Chat Header */}
          <div className="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0a0f1e]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
                  <span>AI Assistant</span>
                  <span className="flex items-center gap-1.5 text-xs text-purple-400 font-normal">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    RAG Active
                  </span>
                </div>
                {selectedDocId && (
                  <div className="text-xs text-purple-300 truncate max-w-[240px]">
                    Focus: {selectedDocId}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedDocId && (
                <button
                  onClick={() => {
                    const doc = documents.find((d) => (d.id || d.filename) === selectedDocId) || { id: selectedDocId, filename: selectedDocId };
                    handleOpenGraph(doc);
                  }}
                  title="Open Knowledge Graph for active document"
                  className="text-xs text-purple-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-700/50 transition cursor-pointer shadow-sm"
                >
                  <Network className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Knowledge Graph</span>
                </button>
              )}

              <button
                onClick={handleNewChat}
                className="text-xs md:text-sm text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>New Session</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#111728] border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-900/20">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-white mb-1.5">
                  Ready to answer questions
                </h3>
                <p className="text-xs md:text-sm text-slate-400 mb-6 leading-relaxed">
                  Ask anything about your uploaded documents or start with an example below:
                </p>

                {/* Prompt suggestion cards (matching reference image 3) */}
                <div className="w-full space-y-2.5 text-left">
                  {[
                    "Summarize the key takeaways from the document",
                    "What are the main requirements and specifications?",
                    "Generate an executive summary of this material"
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full p-3.5 rounded-xl bg-[#0e1424] hover:bg-[#141d33] border border-slate-800 hover:border-purple-500/50 text-xs md:text-sm text-slate-300 transition flex items-center justify-between group cursor-pointer shadow-sm"
                    >
                      <span className="truncate">{prompt}</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.role === "user";
                
                // Parse clean text and extract any embedded sources
                let displayContent = msg.content || "";
                let extractedSources = Array.isArray(msg.sources) ? msg.sources : [];
                if (typeof displayContent === "string" && displayContent.includes("<!-- SOURCES:")) {
                  const parts = displayContent.split("<!-- SOURCES:");
                  displayContent = parts[0].trim();
                  if (extractedSources.length === 0) {
                    try {
                      const jsonStr = parts[1].split("-->")[0].trim();
                      extractedSources = JSON.parse(jsonStr);
                    } catch (e) {
                      console.warn("Failed to parse sources JSON:", e);
                    }
                  }
                }

                return (
                  <div 
                    key={i} 
                    className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-5 h-5 text-purple-400" />
                      </div>
                    )}

                    <div className={`rounded-2xl leading-relaxed transition-all ${
                      isUser
                        ? "max-w-[80%] bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-md text-sm md:text-base px-5 py-4 whitespace-pre-wrap font-sans"
                        : "max-w-[88%] bg-[#0e1424] border border-slate-800 text-slate-100 rounded-tl-xs shadow-sm px-6 py-5"
                    }`}>
                      {isUser ? (
                        <div>{displayContent}</div>
                      ) : (
                        <div className="prose prose-invert max-w-none text-slate-100 text-sm md:text-base leading-relaxed font-sans prose-p:my-3 prose-headings:font-semibold prose-headings:text-purple-200 prose-headings:tracking-tight prose-h1:text-xl md:prose-h1:text-2xl prose-h2:text-lg md:prose-h2:text-xl prose-h3:text-base md:prose-h3:text-lg prose-a:text-purple-400 hover:prose-a:underline prose-strong:text-white prose-strong:font-semibold prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-li:text-slate-200">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || "");
                                const isBlock = match || String(children).includes("\n");
                                return isBlock ? (
                                  <div className="my-4 rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden shadow-inner">
                                    <div className="bg-[#0b101c] border-b border-slate-800/80 px-4 py-2 text-xs font-mono text-purple-300 flex items-center justify-between">
                                      <span className="font-semibold uppercase tracking-wider">
                                        {match ? match[1] : "CODE"}
                                      </span>
                                    </div>
                                    <SyntaxHighlighter
                                      children={String(children).replace(/\n$/, "")}
                                      style={vscDarkPlus}
                                      language={match ? match[1] : "text"}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        padding: "1rem",
                                        background: "#070b14",
                                        fontSize: "13px",
                                        lineHeight: "1.6"
                                      }}
                                      {...props}
                                    />
                                  </div>
                                ) : (
                                  <code
                                    className="bg-purple-950/60 border border-purple-800/40 text-purple-200 px-2 py-0.5 rounded text-xs md:text-sm font-mono"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              table({ children }) {
                                return (
                                  <div className="my-4 overflow-x-auto border border-slate-800 rounded-xl bg-[#090d18] shadow-sm">
                                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                                      {children}
                                    </table>
                                  </div>
                                );
                              },
                              th({ children }) {
                                return (
                                  <th className="bg-[#10172c] border-b border-slate-800 p-3 font-semibold text-purple-300 uppercase tracking-wider text-xs">
                                    {children}
                                  </th>
                                );
                              },
                              td({ children }) {
                                return (
                                  <td className="border-b border-slate-800/60 p-3 text-slate-200 bg-[#0d1424]">
                                    {children}
                                  </td>
                                );
                              },
                              blockquote({ children }) {
                                return (
                                  <blockquote className="border-l-4 border-purple-500 bg-purple-950/20 pl-4 py-2 my-3 text-slate-200 italic text-sm md:text-base rounded-r">
                                    {children}
                                  </blockquote>
                                );
                              },
                              strong({ children }) {
                                const text = String(children);
                                if (/^\[?Page\s*\d+\]?$/i.test(text.trim())) {
                                  return (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-900/50 border border-purple-600/50 text-purple-200 mx-0.5 align-baseline shadow-sm">
                                      {children}
                                    </span>
                                  );
                                }
                                return <strong className="font-semibold text-white">{children}</strong>;
                              }
                            }}
                          >
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Source Citations Badges (Grounding) */}
                      {extractedSources && extractedSources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2.5">
                          <div className="text-xs text-slate-300 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Grounded Retrieval Sources ({extractedSources.length}):</span>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {extractedSources.map((src, sIdx) => {
                              const matchedDoc = documents.find(
                                (d) => String(d.id) === String(src.document_id) || d.filename === src.document_id
                              );
                              const docName = matchedDoc?.filename || src.document_id || "Document";
                              const matchPct = Math.round(
                                Math.min(Math.max((src.score || 0), 0), 1) * 100
                              );

                              return (
                                <div
                                  key={sIdx}
                                  className="bg-[#080d1a] border border-slate-700/80 hover:border-purple-500/60 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 shadow-sm flex items-center gap-2.5 transition group cursor-default"
                                  title={`Document: ${docName} | Page: ${src.page_number} | Relevance: ${matchPct}%`}
                                >
                                  <div className="w-6 h-6 rounded-lg bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400 shrink-0 group-hover:text-purple-300">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-medium text-slate-200 truncate max-w-[170px]" title={docName}>
                                    {docName}
                                  </span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-purple-300 font-semibold">
                                    Page {src.page_number}
                                  </span>
                                  <span className="bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md text-xs text-emerald-400 font-bold font-mono">
                                    {matchPct}% match
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {chatLoading && (
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-600/40 text-purple-300 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl rounded-tl-xs px-5 py-3.5 text-sm text-slate-300 flex items-center gap-2.5 shadow-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Consulting documents and drafting response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar (matching reference images) */}
          <div className="p-4 border-t border-slate-800/80 bg-[#0a0f1e]">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-[#101628] border border-slate-800 focus-within:border-purple-500 rounded-2xl transition shadow-inner"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={chatLoading}
                className="w-full bg-transparent px-5 py-4 text-sm md:text-base text-slate-100 placeholder-slate-400 outline-none"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || chatLoading}
                className="mr-3 p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-40 transition cursor-pointer shrink-0 shadow-md shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-2 text-xs text-slate-500 text-center">
              AI responses are grounded by RAG semantic search. Chat history is saved automatically to PostgreSQL.
            </div>
          </div>
        </section>


      </main>

      {/* ─── INTERACTIVE KNOWLEDGE GRAPH & TREE MODAL ─── */}
      {isGraphOpen && (
        <KnowledgeGraphModal
          isOpen={isGraphOpen}
          onClose={() => setIsGraphOpen(false)}
          documentId={graphDocId}
          documentTitle={graphDocTitle}
          userId={currentUser?.id || currentUser?.email || null}
          onAskAi={(prompt, docId) => {
            setIsGraphOpen(false);
            if (docId) setSelectedDocId(docId);
            setInputQuery(prompt);
            handleSendMessage(prompt);
          }}
        />
      )}
    </div>
  );
}
