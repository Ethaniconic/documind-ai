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
  FolderOpen
} from "lucide-react";
import { 
  getUserDocuments, 
  uploadDocument, 
  createChat, 
  getUserChats, 
  getChatHistory, 
  chatDocuments,
  processDocument,
  generateEmbeddings
} from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();

  // User Auth State
  const [currentUser, setCurrentUser] = useState(null);

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

  const messagesEndRef = useRef(null);

  // 1. Initial Load & Auth Check
  useEffect(() => {
    const rawUser = localStorage.getItem("documind_user");
    if (!rawUser) {
      navigate("/login");
      return;
    }
    try {
      const userObj = JSON.parse(rawUser);
      setCurrentUser(userObj);
      loadInitialData(userObj.id || userObj.email || "demo-user");
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialData = async (userId) => {
    try {
      // Load user documents
      const docs = await getUserDocuments(userId);
      setDocuments(docs || []);

      // Load user chat threads
      const userChats = await getUserChats(userId);
      setChats(userChats || []);

      // Auto-select latest chat or prepare a fresh state
      if (userChats && userChats.length > 0) {
        selectChat(userChats[0].id);
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

    let chatId = activeChatId;

    // If no active chat, create one first
    if (!chatId) {
      const userId = currentUser?.id || currentUser?.email || "demo-user";
      try {
        const newChat = await createChat(userId);
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
      // Call backend /chat with chat_id so it saves user and assistant messages in PostgreSQL
      const res = await chatDocuments(queryText, selectedDocId, chatId);
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

  const handleLogout = () => {
    localStorage.removeItem("documind_token");
    localStorage.removeItem("documind_user");
    navigate("/login");
  };

  const userName = currentUser?.email ? currentUser.email.split("@")[0] : "User";
  const filteredChats = chats.filter((c) => 
    searchQuery ? (c.id?.toString().includes(searchQuery) || `Chat ${c.id}`.toLowerCase().includes(searchQuery.toLowerCase())) : true
  );

  return (
    <div className="flex h-screen w-screen bg-[#080d1a] text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ─── LEFT SIDEBAR (Chats & Navigation) ─── */}
      <aside className="w-68 bg-[#0b101c] border-r border-slate-800/80 flex flex-col h-full shrink-0">
        
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
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
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase px-2 mb-2">
            Previous Chats
          </div>

          {filteredChats.length === 0 ? (
            <div className="px-2 py-4 text-xs text-slate-400 text-center">
              No previous chats found.
            </div>
          ) : (
            filteredChats.map((c) => {
              const isActive = activeChatId === c.id;
              const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent";
              return (
                <button
                  key={c.id}
                  onClick={() => selectChat(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                    isActive 
                      ? "bg-purple-600/20 border border-purple-500/40 text-purple-200" 
                      : "text-slate-400 hover:bg-[#12192c] hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-purple-400" : "text-slate-500"}`} />
                    <span className="truncate font-medium">{c.title || `Chat Thread #${String(c.id).slice(0, 6)}`}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Supabase Active
          </span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* ─── MAIN CONTENT: KNOWLEDGE BASE + AI CHAT ASSISTANT ─── */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* CENTER PANEL: Upload Knowledge & Uploaded PDFs */}
        <section className="w-1/2 border-r border-slate-800/80 flex flex-col h-full bg-[#080d1a] overflow-y-auto p-6">
          
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
                <div className="text-xs text-slate-400 font-medium">No PDFs uploaded yet</div>
                <div className="text-[11px] text-slate-400 mt-1">Upload a PDF to ground the AI chat with context</div>
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
                          <div className="text-xs font-medium text-slate-200 truncate">
                            {doc.filename}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {doc.pages ? `${doc.pages} pages` : "Document"} • {doc.storage_path ? "Supabase Storage" : "Local"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
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

        {/* RIGHT PANEL: AI Assistant Chat (matching reference image 2 & 3) */}
        <section className="w-1/2 flex flex-col h-full bg-[#080d1a] relative">
          
          {/* Chat Header */}
          <div className="h-14 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0a0f1e]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  AI Assistant
                  <span className="flex items-center gap-1 text-[10px] text-purple-400 font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    RAG Active
                  </span>
                </div>
                {selectedDocId && (
                  <div className="text-[10px] text-purple-300 truncate max-w-[200px]">
                    Focus: {selectedDocId}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNewChat}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#111728] border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-900/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Ready to answer questions
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Ask anything about your uploaded documents or start with an example below:
                </p>

                {/* Prompt suggestion cards (matching reference image 3) */}
                <div className="w-full space-y-2 text-left">
                  {[
                    "Summarize the key takeaways from the document",
                    "What are the main requirements and specifications?",
                    "Generate an executive summary of this material"
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full p-2.5 rounded-xl bg-[#0e1424] hover:bg-[#141d33] border border-slate-800 hover:border-purple-500/50 text-xs text-slate-300 transition flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate">{prompt}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div 
                    key={i} 
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-600/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-md"
                        : "bg-[#0e1424] border border-slate-800 text-slate-200 rounded-tl-xs shadow-sm"
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Source Chunks (if present) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                          <span className="text-[10px] text-purple-300 font-semibold">Sources:</span>
                          {msg.sources.map((s, idx) => (
                            <span 
                              key={idx} 
                              className="px-1.5 py-0.5 bg-purple-950/70 border border-purple-700/50 rounded text-[9px] text-purple-200 font-mono"
                            >
                              Page {s.page_number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {chatLoading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-600/40 text-purple-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#0e1424] border border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
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
                className="w-full bg-transparent px-4 py-3.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || chatLoading}
                className="mr-2.5 p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-40 transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="mt-2 text-[10px] text-slate-400 text-center">
              AI responses are grounded by RAG semantic search. Chat history is saved automatically to PostgreSQL.
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
