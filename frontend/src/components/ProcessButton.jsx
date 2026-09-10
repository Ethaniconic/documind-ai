import React, { useState } from "react";
import { processDocument } from "../services/api";

const ProcessButton = ({ document_id, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await processDocument(document_id);
      setResult(res);
      if (onDone) onDone(res);
    } catch (err) {
      setError(err.response?.data?.detail || "Processing failed.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="flex items-center justify-between p-4 bg-indigo-950/50 border-2 border-indigo-500/70 font-mono text-sm text-indigo-200 shadow-[3px_3px_0px_0px_#4338ca]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-emerald-400 text-base">✓ PROCESSED</span>
          <span className="text-muted">|</span>
          <span className="font-medium">
            {result.total_chunks ? `${result.total_chunks} Chunks ready` : "Chunks ready for vectorization"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleProcess}
        disabled={loading}
        className="w-full py-3.5 px-5 font-mono font-bold text-sm md:text-base uppercase tracking-wider text-white bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-indigo-400 shadow-[4px_4px_0px_0px_#3730a3] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#3730a3] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin inline-block"></span>
            <span>Chunking Text &amp; Cleaning...</span>
          </>
        ) : (
          <span>▶ CHUNK &amp; PROCESS DOCUMENT</span>
        )}
      </button>

      {error && (
        <div className="p-3.5 bg-rose-950/70 border-2 border-rose-500 text-rose-300 text-xs md:text-sm font-mono leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="font-bold text-rose-400">[!]</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessButton;
