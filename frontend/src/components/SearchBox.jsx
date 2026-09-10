import { useState } from "react";
import api from "../services/api";

function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/search", {
        query: query.trim(),
        top_k: 5,
      });

      setResults(res.data || []);
      setHasSearched(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Search failed. Make sure embeddings are generated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your documents..."
          className="w-full bg-surface border border-subtle/70 rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-xs font-medium rounded-lg text-white transition-colors cursor-pointer"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Results Header */}
      {hasSearched && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Results ({results.length})
          </h3>

          {results.length === 0 ? (
            <p className="text-xs text-muted italic">No matching chunks found.</p>
          ) : (
            <div className="space-y-3">
              {results.map((item, index) => (
                <div
                  key={index}
                  className="bg-surface border border-subtle rounded-xl p-4 space-y-2 hover:border-subtle transition-colors"
                >
                  {/* Score & Page Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                      {typeof item.score === "number" ? item.score.toFixed(2) : item.score}
                    </span>
                    <span className="text-muted">
                      {item.document_id ? `${item.document_id} — ` : ""}Page {item.page_number}
                    </span>
                  </div>

                  {/* Chunk Text */}
                  <p className="text-xs text-foreground leading-relaxed line-clamp-4">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBox;
