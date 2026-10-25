import React from "react";

export default function SummaryCard({ label, value, accent = "teal", icon: Icon }) {
  const accentMap = {
    teal: "border-teal-500 text-teal-600",
    amber: "border-amber-500 text-amber-500",
    coral: "border-coral-500 text-coral-500",
    ink: "border-ink-600 text-ink-700",
  };

  return (
    <div
      className={`flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm border-l-4 ${accentMap[accent]}`}
    >
      <div>
        <div className="text-2xl font-bold text-slate-900 font-mono-tabular">{value}</div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      </div>
      {Icon && <Icon size={28} className="opacity-70" />}
    </div>
  );
}
