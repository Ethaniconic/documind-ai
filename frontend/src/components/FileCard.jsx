import React from "react";

const FileCard = ({ doc, isSuccess = false, onRemove }) => {
  if (!doc) return null;
  const name = doc.filename || doc.name;
  const size = doc.size_kb ? `${doc.size_kb} KB` : `${(doc.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className={`p-3.5 border-2 flex items-center justify-between transition-all ${
      isSuccess 
        ? "bg-emerald-950/30 border-emerald-500/60 shadow-[3px_3px_0px_0px_#059669]" 
        : "bg-[#0d1424] border-slate-700/80 shadow-[3px_3px_0px_0px_#1e293b]"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 border-2 flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
          isSuccess 
            ? "bg-emerald-950 border-emerald-400 text-emerald-400" 
            : "bg-indigo-950 border-indigo-400 text-indigo-400"
        }`}>
          PDF
        </div>
        <div className="truncate">
          <p className="text-xs font-mono font-bold text-slate-100 truncate">{name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{size} • DOCUMENT</p>
        </div>
      </div>

      {isSuccess ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-500 px-2 py-0.5 uppercase">
            ✓ Uploaded
          </span>
          {onRemove && (
            <button 
              onClick={onRemove} 
              className="text-slate-500 hover:text-slate-200 font-mono text-xs px-1 border border-slate-700 hover:border-slate-500 cursor-pointer"
              title="Dismiss"
            >
              [X]
            </button>
          )}
        </div>
      ) : onRemove && (
        <button 
          onClick={onRemove} 
          className="text-slate-500 hover:text-rose-400 font-mono text-xs px-1.5 py-0.5 border border-slate-700 hover:border-rose-500 cursor-pointer" 
          title="Remove"
        >
          [X]
        </button>
      )}
    </div>
  );
};

export default FileCard;
