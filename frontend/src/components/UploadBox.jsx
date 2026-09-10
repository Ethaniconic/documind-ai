import React, { useRef, useState } from "react";

const UploadBox = ({ onFileSelect, onError }) => {
  const [isDrag, setIsDrag] = useState(false);
  const inputRef = useRef(null);

  const validateAndSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onError?.("Invalid file type. Only .pdf files are supported.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onError?.("File too large. Maximum size is 20MB.");
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    validateAndSelect(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
      onDragLeave={() => setIsDrag(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
        isDrag
          ? "border-indigo-400 bg-indigo-950/40"
          : "border-subtle/80 bg-surface hover:border-indigo-500/80 hover:bg-surface"
      }`}
    >
      {/* Corner crosshairs */}
      <span className="absolute top-1 left-1 text-slate-600 font-mono text-[10px] select-none">+</span>
      <span className="absolute top-1 right-1 text-slate-600 font-mono text-[10px] select-none">+</span>
      <span className="absolute bottom-1 left-1 text-slate-600 font-mono text-[10px] select-none">+</span>
      <span className="absolute bottom-1 right-1 text-slate-600 font-mono text-[10px] select-none">+</span>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files?.[0])}
      />

      <div className="w-14 h-14 mx-auto mb-4 border-2 border-indigo-500/60 bg-indigo-950/70 flex items-center justify-center text-indigo-400 shadow-[3px_3px_0px_0px_#4f46e5]">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <h3 className="text-base md:text-lg font-bold text-foreground tracking-wide uppercase font-mono">
        Drop Document Here
      </h3>
      <p className="text-sm text-muted mt-1.5">or click to browse files</p>

      <div className="flex items-center justify-center gap-3 mt-5 text-xs md:text-sm font-mono">
        <span className="bg-surface-hover border-2 border-subtle text-indigo-300 px-3 py-1 font-bold shadow-[2px_2px_0px_0px_#1e293b]">
          FORMAT: PDF
        </span>
        <span className="bg-surface-hover border-2 border-subtle text-foreground px-3 py-1 font-semibold shadow-[2px_2px_0px_0px_#1e293b]">
          MAX: 20 MB
        </span>
      </div>
    </div>
  );
};

export default UploadBox;