import React from "react";

const styles = {
  Present: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  Partial: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Absent: "bg-coral-500/10 text-coral-500 border-coral-500/30",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[status] || styles.Absent
      }`}
    >
      {status}
    </span>
  );
}
