"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, CheckSquare, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/shared/StatusBadge";

interface ExtractedTask {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName: string | null;
  assigneeId: string | null;
  dueDate: string | null;
}

interface MeetingNotesModalProps {
  onClose: () => void;
  onTasksCreated: () => void;
}

export function MeetingNotesModal({ onClose, onTasksCreated }: MeetingNotesModalProps) {
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");

  const extract = async () => {
    if (!notes.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/ai/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setTasks(data.tasks ?? []);
      setSelected(new Set(data.tasks.map((_: ExtractedTask, i: number) => i)));
      setStep("review");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const createTasks = async () => {
    const toCreate = tasks.filter((_, i) => selected.has(i));
    if (toCreate.length === 0) return;
    setIsCreating(true);
    let created = 0;
    for (const t of toCreate) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            description: t.description || undefined,
            priority: t.priority,
            dueDate: t.dueDate || undefined,
            assigneeIds: t.assigneeId ? [t.assigneeId] : [],
          }),
        });
        if (res.ok) created++;
      } catch {
        // continue
      }
    }
    setIsCreating(false);
    toast.success(`${created} task${created !== 1 ? "s" : ""} created`);
    onTasksCreated();
    onClose();
  };

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((_, i) => i)));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e8170b] to-[#ff6b35] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Meeting Notes → Tasks</h2>
              <p className="text-[11px] text-muted-foreground">AI extracts action items from your notes</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "input" ? (
            <div className="p-6 space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Paste your meeting notes here…\n\nExample:\n- John to follow up with the client by Friday\n- Sarah to design the new banner (urgent)\n- Review campaign brief before Thursday's call`}
                rows={12}
                className="w-full px-4 py-3 text-sm bg-muted rounded-xl border border-border outline-none resize-none focus:ring-2 focus:ring-[#e8170b]/30 placeholder:text-muted-foreground/40 text-foreground leading-relaxed"
              />
              <button
                onClick={extract}
                disabled={!notes.trim() || isExtracting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {isExtracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Extracting tasks…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Extract Tasks</>
                )}
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No action items found in your notes.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""} found — select which to create</p>
                    <button onClick={toggleAll} className="text-[11px] text-[#e8170b] hover:underline">
                      {selected.size === tasks.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  {tasks.map((t, i) => (
                    <div
                      key={i}
                      onClick={() => setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected.has(i) ? "border-[#e8170b]/40 bg-[#e8170b]/5" : "border-border hover:border-border/80 bg-muted/30"
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
                        {selected.has(i) ? <CheckSquare className="w-4 h-4 text-[#e8170b]" /> : <Square className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{t.title}</span>
                          <PriorityBadge priority={t.priority} />
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {t.assigneeName && (
                            <span className="text-[11px] text-muted-foreground">
                              👤 {t.assigneeName}{!t.assigneeId && " (not matched)"}
                            </span>
                          )}
                          {t.dueDate && (
                            <span className="text-[11px] text-muted-foreground">
                              📅 {new Date(t.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && tasks.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => setStep("input")}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={createTasks}
              disabled={selected.size === 0 || isCreating}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><Plus className="w-4 h-4" /> Create {selected.size} Task{selected.size !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
