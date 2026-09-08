import React from "react";

const UploadButton = ({ onUpload, loading, disabled }) => {
  return (
    <button
      onClick={onUpload}
      disabled={disabled || loading}
      className="w-full py-3 px-4 font-mono font-bold text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-indigo-400 shadow-[4px_4px_0px_0px_#4338ca] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#4338ca] transition-all flex items-center justify-center gap-2 cursor-pointer"
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin inline-block"></span>
          <span>Uploading Document...</span>
        </>
      ) : (
        <span>▶ INGEST & UPLOAD FILE</span>
      )}
    </button>
  );
};

export default UploadButton;