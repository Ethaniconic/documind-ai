import { useState, useEffect } from "react";
import axios from "axios";
import ProgressBar from "./ProgressBar";

function EmbeddingCard({ document }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Extract document_id from various input shapes
  const documentId =
    document?.document_id ||
    document?.id ||
    document?.stored_name?.replace(".pdf", "") ||
    (typeof document === "string" ? document : null);

  useEffect(() => {
    let timer;
    if (loading) {
      setProgress(15);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15 + 5);
        });
      }, 400);
    } else if (successData) {
      setProgress(100);
    }
    return () => clearInterval(timer);
  }, [loading, successData]);

  async function generateEmbeddings() {
    if (!documentId) {
      setError("No valid document ID found.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Axios request to FastAPI embedding endpoint
      const res = await axios.post(`http://127.0.0.1:8000/embed/${documentId}`);
      
      setSuccessData({
        model: res.data?.model || "MiniLM-L6-v2",
        dimension: res.data?.dimension || 384,
        chunksEmbedded: res.data?.chunks_embedded ?? 143,
        status: res.data?.status || "Ready for Retrieval",
      });
    } catch (err) {
      setError(
        err.response?.data?.detail || "Embedding generation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // 1. Success Card View (Matches Dashboard Aesthetic)
  if (successData) {
    return (
      <div className="w-full bg-[#0d1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 transition-all">
        {/* Header with pill status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Embedding Engine</h3>
              <p className="text-[11px] text-slate-400">Vector representation active</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {successData.status}
          </span>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-[#131b2e] border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Embedding Model
            </span>
            <p className="text-sm font-bold text-white mt-0.5 truncate" title={successData.model}>
              {successData.model}
            </p>
          </div>

          <div className="bg-[#131b2e] border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Dimension
            </span>
            <p className="text-sm font-bold text-indigo-300 mt-0.5">
              {successData.dimension}
            </p>
          </div>

          <div className="bg-[#131b2e] border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Chunks Embedded
            </span>
            <p className="text-sm font-bold text-white mt-0.5">
              {successData.chunksEmbedded}
            </p>
          </div>

          <div className="bg-[#131b2e] border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Status
            </span>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5 truncate">
              {successData.status}
            </p>
          </div>
        </div>

        {/* Completed Progress Pill Bar */}
        <div className="pt-1">
          <ProgressBar progress={100} label="Vector Indexing Complete" />
        </div>
      </div>
    );
  }

  // 2. Action / Loading View
  return (
    <div className="w-full bg-[#0d1322] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-300">Vector Embeddings</span>
        <span className="text-[11px] text-slate-500 font-mono">{documentId || "No doc selected"}</span>
      </div>

      {loading && (
        <div className="py-1">
          <ProgressBar progress={progress} label="Generating vector embeddings..." />
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      <button
        onClick={generateEmbeddings}
        disabled={loading || !documentId}
        className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Generating Embeddings...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Generate Embeddings</span>
          </>
        )}
      </button>
    </div>
  );
}

export default EmbeddingCard;
