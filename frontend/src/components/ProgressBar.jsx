import React from "react";

const ProgressBar = ({ progress = 0, indeterminate = false, label = "" }) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full space-y-1.5 font-mono">
      {(label || !indeterminate) && (
        <div className="flex items-center justify-between text-xs text-foreground">
          <span className="font-semibold uppercase tracking-wider text-[11px]">{label}</span>
          {!indeterminate && <span className="text-indigo-400 font-bold">{Math.round(clamped)}%</span>}
        </div>
      )}

      <div className="h-3 w-full bg-surface border-2 border-subtle p-0.5 relative overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-2/5 bg-indigo-500 animate-[indeterminate_1.2s_infinite_linear]" />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 ease-out"
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
