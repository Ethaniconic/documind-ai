import React from "react";

const Header = () => {
  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center font-mono font-bold text-white text-sm shadow-[2px_2px_0px_0px_#818cf8]">
            //
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wider uppercase font-mono">
              DOCUMIND<span className="text-indigo-400">.AI</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Neural Semantic RAG Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 text-[11px] font-mono">
          <span className="w-2 h-2 rounded-none bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-semibold">FAISS ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
