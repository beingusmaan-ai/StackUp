"use client";

import { useState } from "react";
import { X, Smile } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PRESETS = [
  { emoji: "📅", message: "In a meeting", duration: 60,     durationLabel: "for an hour" },
  { emoji: "🎯", message: "Focusing",     duration: 240,    durationLabel: "for 4 hours" },
  { emoji: "🤒", message: "Sick",         duration: "today", durationLabel: "OOO for Today" },
  { emoji: "🏖️", message: "Vacation",    duration: "week",  durationLabel: "OOO until Saturday" },
];

const DURATION_OPTIONS = [
  { label: "Don't clear",  value: null },
  { label: "30 minutes",   value: 30 },
  { label: "1 hour",       value: 60 },
  { label: "4 hours",      value: 240 },
  { label: "Today",        value: "today" },
  { label: "This week",    value: "week" },
];

const COMMON_EMOJIS = [
  "😊","🎯","📅","💻","☕","🤒","🏖️","🚀",
  "💡","🔥","⚡","🌟","🎉","🤝","📝",
];

function getExpiresAt(duration: number | string | null): string | null {
  if (duration === null || duration === undefined) return null;
  const now = new Date();
  if (typeof duration === "number") {
    return new Date(now.getTime() + duration * 60_000).toISOString();
  }
  if (duration === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return end.toISOString();
  }
  if (duration === "week") {
    const end = new Date(now);
    const daysUntilSat = (6 - end.getDay() + 7) % 7 || 7;
    end.setDate(end.getDate() + daysUntilSat);
    end.setHours(23, 59, 59, 0);
    return end.toISOString();
  }
  return null;
}

interface StatusData {
  statusEmoji?: string | null;
  statusMessage?: string | null;
  statusExpiresAt?: string | null;
}

interface Props {
  onClose: () => void;
  currentStatus?: StatusData | null;
  workspaceName?: string;
}

export function SetStatusModal({ onClose, currentStatus, workspaceName = "Your" }: Props) {
  const queryClient = useQueryClient();
  const [emoji, setEmoji] = useState(currentStatus?.statusEmoji ?? "");
  const [message, setMessage] = useState(currentStatus?.statusMessage ?? "");
  const [duration, setDuration] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji: emoji || null,
          message: message || null,
          expiresAt: getExpiresAt(duration),
        }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["my-status"] });
      toast.success("Status updated");
      onClose();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    try {
      await fetch("/api/users/me/status", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["my-status"] });
      toast.success("Status cleared");
      onClose();
    } catch {
      toast.error("Failed to clear status");
    } finally {
      setLoading(false);
    }
  }

  const hasCurrentStatus = !!(currentStatus?.statusEmoji || currentStatus?.statusMessage);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Set status</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Emoji + message row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="w-10 h-10 rounded-full border border-border bg-muted hover:bg-muted/70 flex items-center justify-center text-lg transition-colors"
              >
                {emoji || <Smile className="w-5 h-5 text-muted-foreground" />}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-12 left-0 z-10 bg-background border border-border rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1 w-44">
                  {COMMON_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                      className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-base transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (emoji || message)) handleSave(); }}
              placeholder="What's on your mind?"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] placeholder:text-muted-foreground"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clear after</label>
            <select
              value={duration ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDuration(v === "" ? null : isNaN(Number(v)) ? v : Number(v));
              }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              For {workspaceName}&apos;s Workspace
            </p>
            <div className="space-y-0.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.message}
                  type="button"
                  onClick={() => {
                    setEmoji(preset.emoji);
                    setMessage(preset.message);
                    setDuration(preset.duration);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                >
                  <span className="text-base leading-none w-5 flex-shrink-0">{preset.emoji}</span>
                  <span className="text-sm font-medium flex-1">{preset.message}</span>
                  <span className="text-xs text-muted-foreground">— {preset.durationLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          {hasCurrentStatus ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Clear status
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || (!emoji && !message)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? "Saving…" : "Save"}
            {!loading && <span className="text-xs opacity-60">↵</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
