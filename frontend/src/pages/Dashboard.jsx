import React, { useEffect, useState } from "react";
import { getTodayAttendance } from "../api";
import SummaryCard from "../components/SummaryCard";
import StatusBadge from "../components/StatusBadge";
import ActivityTicker from "../components/ActivityTicker";
import { Users, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodayAttendance()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const present = records.filter((r) => r.status === "Present").length;
  const partial = records.filter((r) => r.status === "Partial").length;
  const absent = records.filter((r) => r.status === "Absent").length;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Recognized Today" value={records.length} accent="ink" icon={Users} />
        <SummaryCard label="Present" value={present} accent="teal" icon={CheckCircle2} />
        <SummaryCard label="Partial" value={partial} accent="amber" icon={AlertTriangle} />
        <SummaryCard label="Absent" value={absent} accent="coral" icon={XCircle} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Roll No</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Entry</th>
                <th className="text-left px-4 py-3">Exit</th>
                <th className="text-left px-4 py-3">Break (min)</th>
                <th className="text-left px-4 py-3">Present (min)</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No recognitions yet today. Once a student is detected at the
                    entry camera, their record appears here.
                  </td>
                </tr>
              )}
              {records.map((r) => (
                <tr key={r.roll_no} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-tabular">{r.roll_no}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 font-mono-tabular">{r.entry_time || "-"}</td>
                  <td className="px-4 py-3 font-mono-tabular">{r.final_exit_time || "-"}</td>
                  <td className="px-4 py-3 font-mono-tabular">{r.total_break_minutes}</td>
                  <td className="px-4 py-3 font-mono-tabular">{r.total_present_minutes}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ActivityTicker />
      </div>
    </div>
  );
}
