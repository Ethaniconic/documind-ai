import React from "react";

const Header = () => {
  return (
    <div className="border-b-2 border-slate-800 pb-5 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center font-mono font-bold text-white text-lg shadow-[3px_3px_0px_0px_#818cf8]">
            //
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider uppercase font-mono">
              DOCUMIND<span className="text-indigo-400">.AI</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-mono">Neural Semantic RAG Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-900/90 border-2 border-slate-700/80 px-3.5 py-1.5 text-xs md:text-sm font-mono shadow-[2px_2px_0px_0px_#1e293b]">
          <span className="w-2.5 h-2.5 bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
          <span className="text-slate-200 font-bold">FAISS ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
