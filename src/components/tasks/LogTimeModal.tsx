"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface LogTimeModalProps {
  taskId: string;
  taskTitle: string;
  estimatedHours?: number | null;
  onClose: () => void;
}

export function LogTimeModal({ taskId, taskTitle, estimatedHours, onClose }: LogTimeModalProps) {
  const { data: session } = useSession();
  const [hours, setHours] = useState<string>(estimatedHours ? String(estimatedHours) : "1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const parsed = parseFloat(hours);
    if (!parsed || parsed <= 0) { toast.error("Enter valid hours"); return; }
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          taskId,
          date: new Date().toISOString().split("T")[0],
          hours: parsed,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${parsed}h logged`);
      onClose();
    } catch {
      toast.error("Failed to log time");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">Log Time</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Task name */}
        <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed line-clamp-2">
          <span className="font-medium text-foreground">{taskTitle}</span> was marked complete.
          <br />How long did this task take?
        </p>

        {/* Hours input */}
        <div className="mb-3">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Actual hours
            {estimatedHours && (
              <span className="ml-1.5 normal-case font-normal">(estimated {estimatedHours}h)</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-24 px-3 py-2 border border-border rounded-lg text-[13px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#e8170b]/30 focus:border-[#e8170b]"
              autoFocus
            />
            <span className="text-[12px] text-muted-foreground">hours</span>
          </div>
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Note <span className="normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Included revisions"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e8170b]/30 focus:border-[#e8170b]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-[13px] text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-3 py-2 text-[13px] font-medium bg-[#e8170b] hover:bg-[#c91409] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Log Time"}
          </button>
        </div>
      </div>
    </div>
  );
}
