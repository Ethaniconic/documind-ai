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
      <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 text-violet-300 text-xs">
        ✓ Processed — {result.chunks_created ?? "chunks saved"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleProcess}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          <span>Process Document</span>
        )}
      </button>

      {error && (
        <p className="text-xs text-rose-400 text-center">{error}</p>
      )}
    </div>
  );
};

export default ProcessButton;
