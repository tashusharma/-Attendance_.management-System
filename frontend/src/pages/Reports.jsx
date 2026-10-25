import React, { useEffect, useState } from "react";
import { getReports } from "../api";
import StatusBadge from "../components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function Reports() {
  const [from, setFrom] = useState(daysAgoStr(6));
  const [to, setTo] = useState(todayStr());
  const [rows, setRows] = useState([]);

  const load = () => getReports({ from, to }).then(setRows);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = Object.values(
    rows.reduce((acc, r) => {
      acc[r.roll_no] = acc[r.roll_no] || { roll_no: r.roll_no, total_present_minutes: 0 };
      acc[r.roll_no].total_present_minutes += r.total_present_minutes;
      return acc;
    }, {})
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end gap-3 bg-white rounded-xl shadow-sm p-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={load}
          className="bg-ink-800 hover:bg-ink-700 text-white text-sm font-medium rounded-lg px-4 py-1.5"
        >
          Apply
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="text-sm font-semibold text-slate-700 mb-3">
          Total Present Minutes (selected range)
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F4" />
            <XAxis dataKey="roll_no" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total_present_minutes" fill="#2BB3A3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Roll No</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Entry</th>
              <th className="text-left px-4 py-2">Exit</th>
              <th className="text-left px-4 py-2">Break (min)</th>
              <th className="text-left px-4 py-2">Present (min)</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2 font-mono-tabular">{r.roll_no}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 font-mono-tabular">{r.entry_time || "-"}</td>
                <td className="px-4 py-2 font-mono-tabular">{r.final_exit_time || "-"}</td>
                <td className="px-4 py-2 font-mono-tabular">{r.total_break_minutes}</td>
                <td className="px-4 py-2 font-mono-tabular">{r.total_present_minutes}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
