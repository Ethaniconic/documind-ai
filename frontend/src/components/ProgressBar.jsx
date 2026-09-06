import React from "react";

const ProgressBar = ({ progress = 0, indeterminate = false, label = "" }) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full space-y-1.5">
      {(label || !indeterminate) && (
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>{label}</span>
          {!indeterminate && <span>{Math.round(clamped)}%</span>}
        </div>
      )}

      <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        {indeterminate ? (
          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 animate-[indeterminate_1.5s_infinite_linear]" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out shadow-sm shadow-purple-500/50"
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>

      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
