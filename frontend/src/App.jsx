import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import LiveRecognition from "./pages/LiveRecognition";
import Reports from "./pages/Reports";

const titles = {
  "/": "Dashboard",
  "/students": "Students",
  "/live": "Live Recognition",
  "/reports": "Reports",
};

export default function App() {
  const location = useLocation();
  const title = titles[location.pathname] || "Attendance Control";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Topbar title={title} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/live" element={<LiveRecognition />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  );
}
