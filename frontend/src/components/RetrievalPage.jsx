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
    "Loss function formulation",
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
        top_k: 10,
      });

      const fetched = res.data?.candidates || res.data?.results || [];
      setResults(fetched);
      setContext(res.data?.context || "");
      setHasSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Retrieval failed. Please ensure embeddings are generated."
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
    <div className="w-full space-y-5 font-mono">
      {/* Search Input Bar - Enlarged */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRetrieve();
        }}
        className="space-y-3"
      >
        <div className="relative flex items-center">
          <span className="absolute left-4 text-indigo-400 font-bold select-none text-base">
            &gt;_
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document knowledge base..."
            className="w-full bg-background border-2 border-subtle py-3.5 pl-11 pr-36 text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-[3px_3px_0px_0px_#1e293b]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs md:text-sm font-bold uppercase tracking-wider text-white border-2 border-indigo-400 shadow-[3px_3px_0px_0px_#4338ca] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
          >
            {loading ? "SEARCHING..." : "SEARCH ▶"}
          </button>
        </div>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs md:text-sm text-muted font-bold uppercase tracking-wider mr-1">
            TRY:
          </span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleRetrieve(sq)}
              className="text-xs md:text-sm bg-surface border-2 border-subtle/80 hover:border-indigo-400 text-foreground px-3 py-1.5 hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#1e293b]"
            >
              {sq}
            </button>
          ))}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-950/70 border-2 border-rose-500 text-rose-300 text-sm font-semibold">
          [!] {error}
        </div>
      )}

      {/* Results Header */}
      {hasSearched && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-sm border-b-2 border-subtle pb-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white uppercase text-xs md:text-sm tracking-wider">
                SEARCH RESULTS
              </span>
              <span className="bg-indigo-950 border border-indigo-500 text-indigo-300 px-2.5 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_#312e81]">
                {results.length} CHUNKS
              </span>
            </div>
            <span className="text-xs text-muted">RAW CANDIDATES (TOP 10)</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 bg-background border-2 border-dashed border-subtle text-center">
              <p className="text-sm md:text-base text-foreground uppercase tracking-wider font-bold">
                No matching chunks above threshold
              </p>
              <p className="text-xs text-muted mt-2">
                Try another query or upload and embed more documents.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((item, index) => {
                const score =
                  typeof item.score === "number"
                    ? item.score
                    : parseFloat(item.score);
                const isHighMatch = score >= 0.85;
                const isMediumMatch = score >= 0.7;

                return (
                  <div
                    key={index}
                    className="bg-surface border-2 border-subtle p-5 shadow-[4px_4px_0px_0px_#1e293b] space-y-3.5 hover:border-indigo-500 transition-all"
                  >
                    {/* Top Row: Chunk ID & Similarity Score */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-surface border-2 border-subtle text-foreground px-2.5 py-1 text-xs font-bold">
                          {item.chunk_id || `CHUNK-${index + 1}`}
                        </span>
                        <span className="text-xs text-muted">
                          {item.text?.length || 0} chars
                        </span>
                      </div>

                      <div
                        className={`px-3 py-1 border-2 text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] ${
                          isHighMatch
                            ? "bg-emerald-950/80 border-emerald-400 text-emerald-300"
                            : isMediumMatch
                            ? "bg-sky-950/80 border-sky-400 text-sky-300"
                            : "bg-amber-950/80 border-amber-400 text-amber-300"
                        }`}
                      >
                        <span>★</span>
                        <span>SIMILARITY: {score.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Chunk Content - Enlarged, Clear Sans Text */}
                    <div className="bg-background border-2 border-subtle/90 p-4 text-sm md:text-base text-foreground leading-relaxed font-sans select-text shadow-inner">
                      {item.text}
                    </div>

                    {/* Bottom Row: Document Source & Page */}
                    <div className="flex items-center justify-between text-xs md:text-sm pt-2 text-muted border-t border-subtle">
                      <div className="flex items-center gap-1.5 text-foreground truncate max-w-[280px]">
                        <span className="text-indigo-400 font-bold">DOC:</span>
                        <span className="truncate font-semibold">
                          {item.document_id || "Document"}
                        </span>
                      </div>
                      <div className="bg-surface border-2 border-subtle px-2.5 py-0.5 text-foreground text-xs font-bold">
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
            <div className="mt-5 pt-4 border-t-2 border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wider">
                  ASSEMBLED LLM CONTEXT
                </span>
                <button
                  onClick={copyContext}
                  className="text-xs bg-surface-hover hover:bg-slate-700 border-2 border-slate-600 px-3 py-1.5 text-foreground uppercase font-bold cursor-pointer shadow-[2px_2px_0px_0px_#1e293b]"
                >
                  {copied ? "✓ COPIED" : "COPY CONTEXT"}
                </button>
              </div>

              <pre className="p-4 bg-background border-2 border-subtle text-xs md:text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
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
