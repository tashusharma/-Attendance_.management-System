import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Users, Camera, FileBarChart, ScanFace } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/students", label: "Students", icon: Users },
  { to: "/live", label: "Live Recognition", icon: Camera },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-ink-800 text-slate-100 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-6 py-6 border-b border-ink-700">
        <ScanFace className="text-teal-400" size={26} />
        <div>
          <div className="font-semibold text-sm leading-tight">Attendance Control</div>
          <div className="text-xs text-ink-600 text-slate-400/70">Face Recognition Gate</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-ink-700 text-white"
                  : "text-slate-300 hover:bg-ink-700/60 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-ink-700 text-xs text-slate-400">
        Powered by TensorFlow / Keras CNN
      </div>
    </aside>
  );
}
