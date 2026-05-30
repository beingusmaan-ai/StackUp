"use client";

import { useState } from "react";
import { X, Calendar, Bell, FileText, Paperclip, ChevronDown, Check, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format, addDays, startOfDay, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  notifyMe: boolean;
  isCompleted: boolean;
  createdAt: string;
};

const TABS = ["Task", "Doc", "Reminder", "Whiteboard", "Dashboard"];

const DATE_PRESETS = [
  { label: "Today",     getValue: () => startOfDay(new Date()) },
  { label: "Tomorrow",  getValue: () => startOfDay(addDays(new Date(), 1)) },
  { label: "Next week", getValue: () => startOfDay(addDays(new Date(), 7)) },
  { label: "No date",   getValue: () => null },
];

function dueDateLabel(d: Date | null) {
  if (!d) return "No date";
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

interface Props {
  onClose: () => void;
}

export function CreateReminderModal({ onClose }: Props) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("Reminder");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(startOfDay(new Date()));
  const [notifyMe, setNotifyMe] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"create" | "list">("create");

  const { data: remindersData } = useQuery<{ data: Reminder[] }>({
    queryKey: ["reminders"],
    queryFn: () => fetch("/api/reminders").then((r) => r.json()),
    staleTime: 30_000,
  });
  const reminders = remindersData?.data ?? [];

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate?.toISOString() ?? null,
          notifyMe,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setTitle("");
      setDescription("");
      setShowDesc(false);
      setDueDate(startOfDay(new Date()));
      setNotifyMe(true);
      setView("list");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: string) {
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: true }),
    });
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
  }

  const initials = session?.user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-[580px] overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-border px-6 pt-4 pb-0">
          <div className="flex gap-5 flex-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "pb-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-[#e8170b] text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors mb-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tab !== "Reminder" ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            Coming soon
          </div>
        ) : view === "create" ? (
          <>
            {/* Create form body */}
            <div className="px-6 py-5 space-y-4 min-h-[180px]">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleCreate(); }}
                placeholder="Reminder name or type '/' for commands"
                className="w-full text-xl text-foreground placeholder:text-muted-foreground/40 bg-transparent outline-none"
              />

              {!showDesc ? (
                <button
                  onClick={() => setShowDesc(true)}
                  className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Add description
                </button>
              ) : (
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description…"
                  className="w-full text-sm text-foreground placeholder:text-muted-foreground/40 bg-transparent outline-none resize-none min-h-[60px] leading-relaxed"
                />
              )}

              {/* Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Date chip */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-sm text-foreground transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {dueDateLabel(dueDate)}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full mt-1 left-0 z-10 bg-background border border-border rounded-xl shadow-xl py-1.5 w-44">
                      {DATE_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => { setDueDate(p.getValue()); setShowDatePicker(false); }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                            dueDateLabel(dueDate) === p.label && "text-[#e8170b] font-medium"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                      <div className="border-t border-border mt-1 pt-1 px-3 pb-1">
                        <input
                          type="date"
                          onChange={(e) => {
                            if (e.target.value) { setDueDate(new Date(e.target.value + "T00:00:00")); setShowDatePicker(false); }
                          }}
                          className="w-full text-xs text-foreground bg-transparent outline-none py-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* For me chip */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground cursor-default select-none">
                  <div className="w-4 h-4 rounded-full bg-[#e8170b] flex items-center justify-center text-[9px] font-bold text-white">
                    {initials}
                  </div>
                  For me
                </div>

                {/* Notify me chip */}
                <button
                  onClick={() => setNotifyMe((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
                    notifyMe
                      ? "border-[#e8170b]/50 bg-[#e8170b]/8 text-[#e8170b]"
                      : "border-border hover:bg-muted text-foreground"
                  )}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Notify me
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                {reminders.length > 0 && (
                  <button
                    onClick={() => setView("list")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View {reminders.length} reminder{reminders.length !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || saving}
                className="px-5 py-2 bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? "Creating…" : "Create Reminder"}
              </button>
            </div>
          </>
        ) : (
          /* Reminders list view */
          <>
            <div className="px-6 py-4 max-h-[360px] overflow-y-auto space-y-1">
              {reminders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming reminders</p>
              ) : (
                reminders.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                    <button
                      onClick={() => handleComplete(r.id)}
                      className="w-5 h-5 rounded-full border-2 border-border hover:border-[#e8170b] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5 text-transparent group-hover:text-[#e8170b] transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      {r.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.description}</p>}
                      {r.dueDate && (
                        <p className={cn(
                          "text-xs mt-0.5",
                          new Date(r.dueDate) < new Date() ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {dueDateLabel(new Date(r.dueDate))} · {format(new Date(r.dueDate), "h:mm a")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{reminders.length} active reminder{reminders.length !== 1 ? "s" : ""}</span>
              <button
                onClick={() => { setView("create"); setTitle(""); }}
                className="px-4 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl text-sm font-semibold transition-colors"
              >
                + New Reminder
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
