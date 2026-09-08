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
      <div className="flex items-center justify-between p-3 bg-indigo-950/40 border-2 border-indigo-500/60 font-mono text-xs text-indigo-300 shadow-[3px_3px_0px_0px_#4338ca]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-400">✓ PROCESSED</span>
          <span className="text-slate-400">|</span>
          <span>Chunks ready for vectorization</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleProcess}
        disabled={loading}
        className="w-full py-3 px-4 font-mono font-bold text-xs uppercase tracking-wider text-white bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-indigo-400 shadow-[4px_4px_0px_0px_#3730a3] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#3730a3] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin inline-block"></span>
            <span>Chunking Text & Cleaning...</span>
          </>
        ) : (
          <span>▶ CHUNK & PROCESS DOCUMENT</span>
        )}
      </button>

      {error && (
        <p className="text-xs font-mono text-rose-400 text-center">{error}</p>
      )}
    </div>
  );
};

export default ProcessButton;
