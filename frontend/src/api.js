import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

export const api = axios.create({ baseURL: BASE_URL });

export const getStudents = () => api.get("/api/students").then((r) => r.data);

export const addStudent = (payload) =>
  api.post("/api/students", payload).then((r) => r.data);

export const getTodayAttendance = () =>
  api.get("/api/attendance/today").then((r) => r.data);

export const getActivityFeed = (limit = 20) =>
  api.get(`/api/activity?limit=${limit}`).then((r) => r.data);

export const getReports = ({ from, to, studentId } = {}) => {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (studentId) params.append("student_id", studentId);
  return api.get(`/api/reports?${params.toString()}`).then((r) => r.data);
};

export const recognizeEntry = (blob) => {
  const form = new FormData();
  form.append("frame", blob, "frame.jpg");
  return api
    .post("/api/recognize/entry", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const recognizeExit = (blob, isFinal = false) => {
  const form = new FormData();
  form.append("frame", blob, "frame.jpg");
  return api
    .post(`/api/recognize/exit?final=${isFinal}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const recognizeVideo = (file, mode = "entry", isFinal = false) => {
  const form = new FormData();
  form.append("video", file);
  form.append("mode", mode);
  form.append("final", isFinal);
  return api
    .post("/api/recognize/video", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
