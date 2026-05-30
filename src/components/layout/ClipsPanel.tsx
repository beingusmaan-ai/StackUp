"use client";

import { useRef } from "react";
import { X, Download, Trash2, Play, Video } from "lucide-react";
import type { Clip } from "@/hooks/useScreenRecorder";
import { format } from "date-fns";

interface Props {
  clips: Clip[];
  onClose: () => void;
  onDelete: (id: string) => void;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function ClipsPanel({ clips, onClose, onDelete, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  function handleDownload(clip: Clip) {
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = clip.name.replace(/[^a-z0-9\-_ ]/gi, "_") + ".webm";
    a.click();
  }

  return (
    <div
      ref={panelRef}
      className="fixed top-[72px] right-4 z-50 w-[380px] max-h-[520px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        <Video className="w-4 h-4 text-[#e8170b]" />
        <span className="text-sm font-semibold text-foreground flex-1">Clips</span>
        <span className="text-xs text-muted-foreground">{clips.length} clip{clips.length !== 1 ? "s" : ""}</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <Video className="w-10 h-10 opacity-20" />
            <p className="text-sm">No clips yet</p>
            <p className="text-xs opacity-60">Record a clip to see it here</p>
          </div>
        ) : (
          clips.map((clip) => (
            <div key={clip.id} className="px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors">
              {/* Thumbnail */}
              <video
                src={clip.url}
                className="w-full rounded-xl mb-2.5 object-cover bg-black"
                style={{ maxHeight: "140px" }}
                muted
                preload="metadata"
              />
              {/* Meta + actions */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{clip.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(clip.createdAt, "MMM d, h:mm a")}
                    {" · "}
                    {fmtDuration(clip.durationMs)}
                    {" · "}
                    {clip.sizeMb.toFixed(1)} MB
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Play in new tab"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDownload(clip)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(clip.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
