import React, { useEffect, useState } from "react";
import { getStudents, addStudent } from "../api";
import { UserPlus, Terminal } from "lucide-react";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ roll_no: "", name: "", class_name: "" });
  const [justAdded, setJustAdded] = useState(null);
  const [error, setError] = useState("");

  const load = () => getStudents().then(setStudents);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await addStudent(form);
      setJustAdded(form);
      setForm({ roll_no: "", name: "", class_name: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add student");
    }
  };

  return (
    <div className="p-8 grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-700">
          Registered Students ({students.length})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Roll No</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Class</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.roll_no} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono-tabular">{s.roll_no}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 text-slate-500">{s.class_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <UserPlus size={18} className="text-teal-500" /> Register Student
          </div>

          <input
            required
            placeholder="Roll No (e.g. 21CS045)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={form.roll_no}
            onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
          />
          <input
            required
            placeholder="Full Name"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Class (e.g. CS-A)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={form.class_name}
            onChange={(e) => setForm({ ...form, class_name: e.target.value })}
          />

          {error && <div className="text-coral-500 text-xs">{error}</div>}

          <button
            type="submit"
            className="w-full bg-ink-800 hover:bg-ink-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            Add Student
          </button>
        </form>

        {justAdded && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-semibold">
              <Terminal size={14} /> Next steps on the server
            </div>
            <p className="text-slate-400">
              The database record is created, but the face model doesn't know
              this student's face yet. On the machine running the backend:
            </p>
            <pre className="bg-black/40 rounded-md p-3 overflow-x-auto font-mono-tabular">
{`python src/capture_faces.py --roll ${justAdded.roll_no} --name "${justAdded.name}"
python src/train_model.py`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
