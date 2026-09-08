import { useState } from "react";
import api from "../services/api";

function RetrievalPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const sampleQueries = [
    "Explain gradient descent",
    "What is backpropagation?",
    "Learning rate optimization",
    "Loss function formulation"
  ];

  async function handleRetrieve(searchQuery) {
    const q = (typeof searchQuery === "string" ? searchQuery : query).trim();
    if (!q || loading) return;

    if (typeof searchQuery === "string") {
      setQuery(searchQuery);
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/retrieve", {
        query: q,
        top_k: 5,
      });

      setResults(res.data?.results || []);
      setContext(res.data?.context || "");
      setHasSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Retrieval failed. Please ensure embeddings are generated."
      );
    } finally {
      setLoading(false);
    }
  }

  const copyContext = () => {
    if (!context) return;
    navigator.clipboard.writeText(context);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4 font-mono">
      {/* Search Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleRetrieve(); }} className="space-y-2">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-indigo-400 font-bold select-none text-xs">&gt;_</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document knowledge base..."
            className="w-full bg-[#080d1a] border-2 border-slate-700 p-3 pl-8 pr-28 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-[3px_3px_0px_0px_#1e293b]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-[11px] font-bold uppercase tracking-wider text-white border border-indigo-400 shadow-[2px_2px_0px_0px_#4338ca] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
          >
            {loading ? "SEARCHING..." : "SEARCH"}
          </button>
        </div>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider self-center mr-1">TRY:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleRetrieve(sq)}
              className="text-[10px] bg-slate-900 border border-slate-700/80 hover:border-indigo-400 text-slate-300 px-2 py-0.5 hover:text-white transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-950/50 border-2 border-rose-500/80 text-rose-300 text-xs">
          [!] {error}
        </div>
      )}

      {/* Results Header */}
      {hasSearched && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-[11px]">SEARCH RESULTS</span>
              <span className="bg-indigo-950 border border-indigo-500 text-indigo-300 px-2 py-0.2 text-[10px] font-bold">
                {results.length} CHUNKS
              </span>
            </div>
            <span className="text-[10px] text-slate-400">THRESHOLD: &gt;= 0.65</span>
          </div>

          {results.length === 0 ? (
            <div className="p-6 bg-[#080d1a] border-2 border-dashed border-slate-800 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">No matching chunks above threshold</p>
              <p className="text-[10px] text-slate-500 mt-1">Try another query or upload more documents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((item, index) => {
                const score = typeof item.score === "number" ? item.score : parseFloat(item.score);
                const isHighMatch = score >= 0.85;
                const isMediumMatch = score >= 0.70;

                return (
                  <div
                    key={index}
                    className="bg-[#0d1424] border-2 border-slate-700/90 p-4 shadow-[4px_4px_0px_0px_#1e293b] space-y-3 hover:border-indigo-500/80 transition-all"
                  >
                    {/* Top Row: Chunk ID & Similarity Score */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                          {item.chunk_id || `CHUNK-${index + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.text.length} chars
                        </span>
                      </div>

                      <div className={`px-2.5 py-0.5 border text-[11px] font-bold flex items-center gap-1 ${
                        isHighMatch
                          ? "bg-emerald-950/80 border-emerald-400 text-emerald-300"
                          : isMediumMatch
                          ? "bg-sky-950/80 border-sky-400 text-sky-300"
                          : "bg-amber-950/80 border-amber-400 text-amber-300"
                      }`}>
                        <span>★</span>
                        <span>SIMILARITY: {score.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Chunk Content */}
                    <div className="bg-[#080d1a] border border-slate-800 p-3 text-xs text-slate-200 leading-relaxed font-sans select-text">
                      {item.text}
                    </div>

                    {/* Bottom Row: Document Source & Page */}
                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800">
                      <div className="flex items-center gap-1 text-slate-300 truncate max-w-[200px]">
                        <span className="text-indigo-400 font-bold">DOC:</span>
                        <span className="truncate">{item.document_id || "Document"}</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 px-2 py-0.5 text-slate-300 text-[10px] font-bold">
                        PAGE {item.page_number}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assembled RAG Context Drawer */}
          {context && (
            <div className="mt-4 pt-3 border-t-2 border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase">
                  ASSEMBLED LLM CONTEXT
                </span>
                <button
                  onClick={copyContext}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 text-slate-200 uppercase font-bold cursor-pointer"
                >
                  {copied ? "✓ COPIED" : "COPY CONTEXT"}
                </button>
              </div>

              <pre className="p-3 bg-[#080d1a] border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {context}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RetrievalPage;
