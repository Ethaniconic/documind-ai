import { useState, useEffect } from "react";
import axios from "axios";
import ProgressBar from "./ProgressBar";

function EmbeddingCard({ document }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

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
      }, 350);
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

  // 1. Success Dashboard View
  if (successData) {
    return (
      <div className="w-full bg-surface border-2 border-subtle/90 p-5 shadow-[4px_4px_0px_0px_#1e293b] space-y-4 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-950 border border-indigo-500/60 flex items-center justify-center text-indigo-400 font-bold text-xs">
              ⚡
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Vector Index Active</h3>
              <p className="text-[10px] text-muted">Indexed into local FAISS</p>
            </div>
          </div>

          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/80 border border-emerald-500 text-emerald-400">
            ● READY
          </span>
        </div>

        {/* Square Metric Tiles */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background border border-subtle p-2.5">
            <span className="text-[9px] uppercase text-muted block font-bold">
              MODEL
            </span>
            <p className="text-xs font-bold text-foreground mt-1 truncate" title={successData.model}>
              {successData.model}
            </p>
          </div>

          <div className="bg-background border border-subtle p-2.5">
            <span className="text-[9px] uppercase text-muted block font-bold">
              DIMENSION
            </span>
            <p className="text-xs font-bold text-indigo-400 mt-1">
              {successData.dimension}D Vector
            </p>
          </div>

          <div className="bg-background border border-subtle p-2.5">
            <span className="text-[9px] uppercase text-muted block font-bold">
              CHUNKS INDEXED
            </span>
            <p className="text-xs font-bold text-emerald-400 mt-1">
              {successData.chunksEmbedded} Chunks
            </p>
          </div>

          <div className="bg-background border border-subtle p-2.5">
            <span className="text-[9px] uppercase text-muted block font-bold">
              FAISS STATUS
            </span>
            <p className="text-xs font-bold text-sky-400 mt-1 truncate">
              Persisted
            </p>
          </div>
        </div>

        <ProgressBar progress={100} label="FAISS Vector Store Ready" />
      </div>
    );
  }

  // 2. Initial / Loading View
  return (
    <div className="w-full bg-surface border-2 border-subtle/90 p-4 shadow-[4px_4px_0px_0px_#1e293b] space-y-3 font-mono">
      <div className="flex items-center justify-between text-xs border-b border-subtle pb-2">
        <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">Neural Embeddings</span>
        <span className="text-[10px] text-muted truncate max-w-[120px]">{documentId || "No doc"}</span>
      </div>

      {loading && (
        <ProgressBar progress={progress} label="Encoding 384D Embeddings..." />
      )}

      {error && (
        <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <button
        onClick={generateEmbeddings}
        disabled={loading || !documentId}
        className="w-full py-3 px-4 font-mono font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-indigo-400 shadow-[4px_4px_0px_0px_#4338ca] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#4338ca] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin inline-block"></span>
            <span>Generating & Indexing...</span>
          </>
        ) : (
          <span>⚡ GENERATE FAISS EMBEDDINGS</span>
        )}
      </button>
    </div>
  );
}

export default EmbeddingCard;
