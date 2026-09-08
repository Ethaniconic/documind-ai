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
          : "border-slate-700/80 bg-[#0d1424] hover:border-indigo-500/80 hover:bg-[#0f172a]"
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

      <div className="w-12 h-12 mx-auto mb-3 border-2 border-indigo-500/60 bg-indigo-950/70 flex items-center justify-center text-indigo-400 shadow-[3px_3px_0px_0px_#4f46e5]">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase font-mono">
        Drop Document Here
      </h3>
      <p className="text-xs text-slate-400 mt-1">or click to browse files</p>

      <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono">
        <span className="bg-slate-800 border border-slate-700 text-indigo-300 px-2 py-0.5 font-bold">
          FORMAT: PDF
        </span>
        <span className="bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5">
          MAX: 20 MB
        </span>
      </div>
    </div>
  );
};

export default UploadBox;