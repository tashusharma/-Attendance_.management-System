import React, { useEffect, useState } from "react";

export default function Topbar({ title }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-IN", { hour12: false });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between bg-white border-b border-slate-100 px-8 py-4">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">{dateStr}</span>
        <div className="flex items-center gap-1 bg-ink-800 text-teal-400 font-mono-tabular text-base px-3 py-1.5 rounded-md tracking-wider">
          {time.split("").map((ch, i) => (
            <span key={i} className={ch === ":" ? "text-slate-500" : ""}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
