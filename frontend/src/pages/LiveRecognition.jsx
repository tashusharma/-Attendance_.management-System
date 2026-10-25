import React, { useEffect, useRef, useState } from "react";
import { recognizeEntry, recognizeExit, recognizeVideo } from "../api";
import { LogIn, LogOut, Camera, Video, Loader2, ScanFace } from "lucide-react";

export default function LiveRecognition() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("entry"); // "entry" | "exit"
  const [isFinal, setIsFinal] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [streamError, setStreamError] = useState("");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setStreamError("Could not access the webcam. Check browser permissions."));
  }, []);

  const captureAndSend = async () => {
    setBusy(true);
    setResult(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      try {
        const data =
          mode === "entry" ? await recognizeEntry(blob) : await recognizeExit(blob, isFinal);
        setResult(data);
      } catch (err) {
        setResult([{ status: "error", message: "Could not reach the backend API" }]);
      } finally {
        setBusy(false);
      }
    }, "image/jpeg");
  };

  const uploadAndProcessVideo = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBusy(true);
    setResult(null);
    try {
      const data = await recognizeVideo(file, mode, isFinal);
      setResult(data);
    } catch (err) {
      setResult([{ status: "error", message: "Could not reach the backend API" }]);
    } finally {
      setBusy(false);
      event.target.value = null;
    }
  };

  return (
    <div className="p-8 grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
          {streamError ? (
            <p className="text-coral-400 text-sm p-6 text-center">{streamError}</p>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Scanner Overlay Animation */}
              {busy && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-all duration-300">
                  <div className="relative w-48 h-48 border-2 border-teal-500/50 rounded-xl overflow-hidden flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(20,184,166,0.3)] bg-black/20">
                    <ScanFace size={64} className="text-teal-400 opacity-30 animate-pulse" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)]" style={{ animation: "scan 2s linear infinite" }} />
                  </div>
                  <div className="flex items-center gap-2 text-teal-300 font-medium tracking-wide bg-black/30 px-4 py-2 rounded-full border border-teal-500/30">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing & Analyzing...</span>
                  </div>
                  <style>{`
                    @keyframes scan {
                      0% { top: 0; opacity: 0; }
                      10% { opacity: 1; }
                      90% { opacity: 1; }
                      100% { top: 100%; opacity: 0; }
                    }
                  `}</style>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode("entry")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "entry" ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <LogIn size={16} /> Entry Camera
          </button>
          <button
            onClick={() => setMode("exit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "exit" ? "bg-coral-500 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <LogOut size={16} /> Exit Camera
          </button>

          {mode === "exit" && (
            <label className="flex items-center gap-2 text-sm text-slate-600 ml-2">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
                className="accent-coral-500"
              />
              End of day (final exit)
            </label>
          )}

          <button
            onClick={captureAndSend}
            disabled={busy || !!streamError}
            className={`ml-auto flex items-center gap-2 bg-ink-800 hover:bg-ink-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all ${busy ? "opacity-70 cursor-wait" : "disabled:opacity-50"}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {busy ? "Recognizing…" : "Capture & Recognize"}
          </button>

          <input 
            type="file" 
            accept="video/*" 
            ref={fileInputRef} 
            onChange={uploadAndProcessVideo} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className={`flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all ${busy ? "opacity-70 cursor-wait animate-pulse" : "disabled:opacity-50"}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            {busy ? "Processing..." : "Upload Video"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="font-semibold text-slate-700 mb-3">Result</div>
        {!result && !busy && <p className="text-sm text-slate-400">Capture a frame to see the recognition result.</p>}
        
        {/* Skeleton Loading State */}
        {busy && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3 animate-pulse bg-slate-50/50">
                <div className="h-5 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-teal-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        )}

        {result && !busy &&
          result.map((r, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-3 mb-2 text-sm">
              {r.roll_no ? (
                <>
                  <div className="font-semibold text-slate-800">
                    {r.name} <span className="text-slate-400 font-mono-tabular">({r.roll_no})</span>
                  </div>
                  <div className="text-teal-600 font-medium">{r.event}</div>
                  {r.confidence && (
                    <div className="text-xs text-slate-400">
                      Confidence: {(r.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </>
              ) : (
                <div className="text-coral-500">Face not recognized</div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
