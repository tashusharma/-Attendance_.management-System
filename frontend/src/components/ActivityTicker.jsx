import React, { useEffect, useState } from "react";
import { getActivityFeed } from "../api";
import { LogIn, LogOut, Coffee, CircleSlash } from "lucide-react";

const eventConfig = {
  entry: { label: "ENTRY", icon: LogIn, color: "text-teal-500" },
  break_out: { label: "BREAK OUT", icon: Coffee, color: "text-amber-500" },
  break_in: { label: "BREAK IN", icon: Coffee, color: "text-teal-500" },
  final_exit: { label: "FINAL EXIT", icon: LogOut, color: "text-coral-500" },
  unrecognized: { label: "UNRECOGNIZED", icon: CircleSlash, color: "text-slate-400" },
};

export default function ActivityTicker() {
  const [events, setEvents] = useState([]);

  const load = () => {
    getActivityFeed(15)
      .then(setEvents)
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // poll every 4s for new gate activity
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-ink-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-700 text-slate-300 text-xs uppercase tracking-widest">
        Live Gate Activity
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-ink-700">
        {events.length === 0 && (
          <div className="px-5 py-6 text-sm text-slate-500">Waiting for camera events…</div>
        )}
        {events.map((e, idx) => {
          const cfg = eventConfig[e.event_type] || eventConfig.unrecognized;
          const Icon = cfg.icon;
          return (
            <div
              key={`${e.roll_no}-${e.event_time}-${idx}`}
              className="flap-row flex items-center justify-between px-5 py-2.5"
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className={cfg.color} />
                <div>
                  <div className="text-sm text-white">{e.name}</div>
                  <div className="text-xs text-slate-400">{e.roll_no}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</div>
                <div className="font-mono-tabular text-sm text-slate-300">{e.event_time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
