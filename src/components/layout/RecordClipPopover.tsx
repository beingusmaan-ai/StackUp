"use client";

import { useState, useEffect } from "react";
import { Monitor, Mic, MicOff, Video, ChevronDown } from "lucide-react";

type MicDevice = { deviceId: string; label: string };

interface Props {
  isRecording: boolean;
  elapsedMs: number;
  onStart: (micDeviceId: string) => void;
  onStop: () => void;
  onOpenClips: () => void;
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function RecordClipPopover({ isRecording, elapsedMs, onStart, onStop, onOpenClips }: Props) {
  const [mics, setMics] = useState<MicDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("none");
  const [screenRes, setScreenRes] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setScreenRes(`${window.screen.width}×${window.screen.height}px`);
    }
    navigator.mediaDevices?.enumerateDevices()
      .then((devices) => {
        const audioIn = devices.filter((d) => d.kind === "audioinput");
        setMics(audioIn.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        })));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="absolute right-0 top-full mt-2 w-[310px] bg-background border border-border rounded-2xl shadow-2xl z-50">
      {!isRecording ? (
        <div className="p-4 space-y-2.5">
          {/* Screen source row */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-xl">
            <Monitor className="w-5 h-5 text-foreground flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Entire screen</span>
            <span className="text-xs text-muted-foreground">{screenRes}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Microphone row */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-xl">
            {selectedMicId === "none"
              ? <MicOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              : <Mic className="w-5 h-5 text-foreground flex-shrink-0" />}
            <select
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-foreground cursor-pointer"
            >
              <option value="none">No microphone</option>
              {mics.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 pointer-events-none" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => onStart(selectedMicId)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-white/40" />
              Record Clip
              <span className="text-[10px] font-normal opacity-75">Ctrl+Alt+S</span>
            </button>
            <button
              onClick={onOpenClips}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border hover:bg-muted text-sm text-foreground transition-colors font-medium"
            >
              <Video className="w-4 h-4" />
              Clips
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#e8170b] animate-pulse" />
            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">{fmtElapsed(elapsedMs)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Recording in progress…</p>
          <button
            onClick={onStop}
            className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Stop Recording
          </button>
          <button
            onClick={onOpenClips}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View Clips
          </button>
        </div>
      )}
    </div>
  );
}
