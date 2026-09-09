import React, { useState, useRef, useEffect } from "react";
import { chatDocuments } from "../services/api";
import { Send, Bot, User, FileText, RefreshCcw, Terminal, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const ChatPage = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **DocuMind AI**.\n\nI can retrieve information from your ingested PDF documents, summarize complex concepts, and answer your technical questions with grounded citations.\n\nType your query below to begin.",
      sources: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const data = await chatDocuments(trimmed);
      const aiMessage = {
        role: "assistant",
        content: data.answer || "No response generated.",
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || "Failed to get a response.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Error**: ${errMsg}`,
          isError: true,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat session reset. What would you like to explore next?",
        sources: [],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-tech-grid text-slate-200 font-mono relative select-text">
      
      {/* Top Bar */}
      <div className="h-12 flex items-center justify-between px-4 md:px-6 border-b-2 border-slate-800 bg-[#0b101a]/90 backdrop-blur-xs flex-shrink-0 select-none">
        <div className="flex items-center gap-2 text-xs">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-300 uppercase tracking-wider">AI CHAT CONSOLE</span>
          <span className="text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">CONTEXT: FAISS 384D</span>
        </div>
        
        <button
          onClick={handleClear}
          className="text-xs flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-slate-500 text-slate-300 uppercase font-bold shadow-[2px_2px_0px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          title="Clear Session"
        >
          <RefreshCcw className="w-3 h-3 text-slate-400" />
          <span>RESET CHAT</span>
        </button>
      </div>

      {/* Message List Stream (Full-bleed, Centered Readable Width) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {/* Message Header Tag */}
              <div className="flex items-center gap-2 mb-1.5 px-1 select-none">
                {msg.role === "user" ? (
                  <>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">USER PROMPT</span>
                    <div className="w-5 h-5 bg-indigo-600 border border-indigo-400 text-white font-bold text-[10px] flex items-center justify-center shadow-[1px_1px_0px_0px_#4338ca]">
                      U
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-5 h-5 border text-[10px] font-bold flex items-center justify-center shadow-[1px_1px_0px_0px_#1e293b] ${
                      msg.isError 
                        ? "bg-rose-950 border-rose-500 text-rose-400" 
                        : "bg-slate-900 border-emerald-400 text-emerald-400"
                    }`}>
                      AI
                    </div>
                    <span className="text-[10px] text-slate-300 uppercase font-bold">DOCUMIND · QWEN-2.5</span>
                  </>
                )}
              </div>

              {/* Message Box */}
              <div 
                className={`p-4 md:p-5 text-sm md:text-[15px] leading-relaxed transition-all max-w-[95%] md:max-w-[85%] ${
                  msg.role === "user" 
                    ? "bg-indigo-950/80 border-2 border-indigo-500 text-white shadow-[4px_4px_0px_0px_#4338ca] font-mono whitespace-pre-wrap" 
                    : msg.isError 
                      ? "bg-rose-950/40 border-2 border-rose-500 text-rose-200 shadow-[4px_4px_0px_0px_#881337] w-full"
                      : "bg-[#0d1424] border-2 border-slate-700 text-slate-100 shadow-[4px_4px_0px_0px_#1e293b] w-full"
                }`}
              >
                {msg.role === "user" ? (
                  <div>{msg.content}</div>
                ) : (
                  <div className="prose prose-invert max-w-none text-slate-200 text-sm md:text-[15px] leading-relaxed font-sans prose-p:my-2 prose-headings:font-mono prose-headings:text-white prose-a:text-indigo-400 prose-strong:text-white prose-code:text-indigo-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="my-3 border-2 border-slate-700 bg-[#080d1a] shadow-[3px_3px_0px_0px_#1e293b] overflow-hidden">
                              <div className="bg-slate-900 border-b border-slate-800 px-3 py-1 text-[11px] font-mono text-slate-400 uppercase flex items-center justify-between">
                                <span>CODE: {match[1]}</span>
                              </div>
                              <SyntaxHighlighter
                                children={String(children).replace(/\n$/, '')}
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="!bg-[#080d1a] !p-3.5 !m-0 !rounded-none text-xs md:text-sm font-mono"
                                {...props}
                              />
                            </div>
                          ) : (
                            <code className="bg-slate-900 border border-slate-700/80 text-indigo-300 px-1.5 py-0.5 text-xs font-mono" {...props}>
                              {children}
                            </code>
                          );
                        },
                        table({children}) {
                          return (
                            <div className="my-4 overflow-x-auto border-2 border-slate-700 shadow-[3px_3px_0px_0px_#1e293b]">
                              <table className="w-full text-left border-collapse font-mono text-xs md:text-sm">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({children}) {
                          return (
                            <th className="bg-slate-900 border-2 border-slate-700 p-2.5 font-bold uppercase tracking-wider text-indigo-300">
                              {children}
                            </th>
                          );
                        },
                        td({children}) {
                          return (
                            <td className="border border-slate-800 p-2.5 text-slate-200 bg-[#0d1424]">
                              {children}
                            </td>
                          );
                        },
                        blockquote({children}) {
                          return (
                            <blockquote className="border-l-4 border-indigo-500 bg-indigo-950/30 pl-3.5 py-2 my-2.5 text-slate-300 font-mono text-xs md:text-sm italic">
                              {children}
                            </blockquote>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Source Citations Badges */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 w-full max-w-[95%] md:max-w-[85%] space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400"></span>
                    GROUNDED RETRIEVAL SOURCES ({msg.sources.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-[#080d1a] border-2 border-slate-700 px-2.5 py-1 text-xs text-slate-300 shadow-[2px_2px_0px_0px_#1e293b] flex items-center gap-2 hover:border-indigo-400 transition-colors"
                        title={`Score: ${(src.score * 100).toFixed(1)}% | Chunk: ${src.chunk_id || 'N/A'}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold truncate max-w-[150px]">{src.document_id}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400 font-semibold">PG {src.page_number}</span>
                        <span className="bg-slate-900 border border-slate-700 px-1 text-[10px] text-emerald-400 font-bold">
                          {(src.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="flex items-center gap-2 mb-1 select-none">
                <div className="w-5 h-5 bg-slate-900 border border-emerald-400 text-emerald-400 font-bold text-[10px] flex items-center justify-center shadow-[1px_1px_0px_0px_#1e293b]">
                  AI
                </div>
                <span className="text-[10px] text-slate-300 uppercase font-bold">DOCUMIND · INFERENCE</span>
              </div>
              
              <div className="p-4 bg-[#0d1424] border-2 border-indigo-500/70 shadow-[4px_4px_0px_0px_#4338ca] text-xs md:text-sm text-indigo-300 flex items-center gap-3">
                <span className="w-3 h-3 bg-indigo-500 animate-pulse"></span>
                <span className="font-mono">Searching vector store &amp; generating grounded answer...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* Edge-to-Edge Fixed Bottom Console Input */}
      <div className="bg-[#0b101a]/95 border-t-2 border-slate-800 p-3 md:p-4 backdrop-blur-md flex-shrink-0 select-none">
        <form onSubmit={handleSend} className="max-w-5xl mx-auto relative flex items-end">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask a technical question about your documents... [Enter to send]"
            className="w-full bg-[#080d1a] border-2 border-slate-700 focus:border-indigo-400 pl-4 pr-32 py-3.5 text-sm md:text-base text-white placeholder-slate-500 font-mono shadow-[3px_3px_0px_0px_#1e293b] focus:outline-none resize-none min-h-[58px] max-h-36 transition-all"
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2 bottom-2 md:bottom-2.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-mono font-bold text-xs md:text-sm uppercase tracking-wider border-2 border-indigo-400 shadow-[3px_3px_0px_0px_#4338ca] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
          >
            <span>SEND</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-2 px-1">
          <span>LOCAL RAG ENGINE · QWEN-2.5-1.5B</span>
          <span className="hidden sm:inline">VERIFY WITH DOCUMENT SOURCES</span>
        </div>
      </div>

    </div>
  );
};

export default ChatPage;
