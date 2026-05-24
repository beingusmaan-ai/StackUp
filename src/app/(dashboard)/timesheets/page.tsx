"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/store/ui-store";
import {
  format, getDaysInMonth, getDay, isSameDay, isToday,
  isWeekend, addMonths, subMonths,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Clock, Plus, X,
  Trash2, Pencil, ChevronDown, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  userId: string;
  taskId: string | null;
  date: string;
  hours: number;
  note: string | null;
  task: { id: string; title: string } | null;
}

interface Suggestion {
  taskId: string;
  taskTitle: string;
  estimatedHours: number | null;
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function DayCell({
  day,
  dayEntries,
  isSelected,
  onClick,
}: {
  day: Date;
  dayEntries: TimeEntry[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const total = dayEntries.reduce((s, e) => s + e.hours, 0);
  const weekend = isWeekend(day);
  const today = isToday(day);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-[72px] p-2 rounded-lg border text-left transition-all hover:border-[#e8170b]/40 hover:shadow-sm",
        isSelected ? "border-[#e8170b] bg-[#e8170b]/5 shadow-sm" : "border-border",
        weekend ? "bg-muted/30" : "bg-card",
        today && !isSelected && "ring-1 ring-[#e8170b]/30"
      )}
    >
      <span className={cn(
        "text-[12px] font-semibold leading-none",
        today ? "text-[#e8170b]" : weekend ? "text-muted-foreground" : "text-foreground"
      )}>
        {format(day, "d")}
      </span>
      {total > 0 && (
        <div className={cn(
          "mt-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
          total >= 8 ? "bg-[#10b981]/15 text-[#10b981]" :
          total >= 4 ? "bg-[#f59e0b]/15 text-[#f59e0b]" :
          "bg-[#4169e1]/15 text-[#4169e1]"
        )}>
          <Clock className="w-2.5 h-2.5" />
          {total}h
        </div>
      )}
      {dayEntries.length > 0 && total === 0 && (
        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
      )}
    </button>
  );
}

function DayPanel({
  day,
  entries,
  suggestions,
  onLogSuggestion,
  onDelete,
  onUpdate,
  onClose,
  onAdd,
  isPending,
}: {
  day: Date;
  entries: TimeEntry[];
  suggestions: Suggestion[];
  onLogSuggestion: (s: Suggestion) => void;
  onDelete: (id: string) => void;
  onUpdate: (data: { id: string; hours: number; note?: string }) => void;
  onClose: () => void;
  onAdd: (data: { hours: number; note?: string }) => void;
  isPending: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editNote, setEditNote] = useState("");
  const [addHours, setAddHours] = useState("1");
  const [addNote, setAddNote] = useState("");
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  useEffect(() => { setShowForm(false); setEditId(null); }, [day]);

  return (
    <div className="w-72 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20 flex-shrink-0">
        <div>
          <p className="text-[13px] font-bold text-foreground">{format(day, "EEE, MMM d")}</p>
          <p className="text-[11px] text-muted-foreground">
            {totalHours > 0 ? `${totalHours}h logged` : "Nothing logged yet"}
          </p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Logged entries */}
        {entries.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Logged</p>
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-muted/30 rounded-lg p-2.5">
                  {editId === entry.id ? (
                    <div className="space-y-2">
                      <p className="text-[12px] font-medium text-foreground truncate">
                        {entry.task?.title || entry.note || "General"}
                      </p>
                      <input
                        type="number"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        min="0.25" max="24" step="0.25"
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
                        placeholder="Hours"
                      />
                      <input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
                        placeholder="Note (optional)"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const h = parseFloat(editHours);
                            if (isNaN(h)) return;
                            onUpdate({ id: entry.id, hours: h, note: editNote });
                            setEditId(null);
                          }}
                          disabled={!editHours || isPending}
                          className="flex-1 py-1.5 text-[11px] font-semibold bg-[#e8170b] text-white rounded-lg hover:bg-[#c91409] disabled:opacity-50 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="flex-1 py-1.5 text-[11px] border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">
                          {entry.task?.title || entry.note || "General"}
                        </p>
                        {entry.task && entry.note && (
                          <p className="text-[10px] text-muted-foreground truncate">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[12px] font-bold text-foreground">{entry.hours}h</span>
                        <button
                          onClick={() => { setEditId(entry.id); setEditHours(String(entry.hours)); setEditNote(entry.note || ""); }}
                          className="w-5 h-5 rounded hover:bg-muted flex items-center justify-center transition-colors"
                        >
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          disabled={isPending}
                          className="w-5 h-5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested from activity</p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <div key={s.taskId} className="flex items-center gap-2 border border-border rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{s.taskTitle}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.estimatedHours ? `${s.estimatedHours}h estimated` : "No estimate"}
                    </p>
                  </div>
                  <button
                    onClick={() => onLogSuggestion(s)}
                    disabled={isPending}
                    className="flex-shrink-0 px-2 py-1 text-[11px] font-semibold bg-[#e8170b]/10 text-[#e8170b] rounded-lg hover:bg-[#e8170b]/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    Log {s.estimatedHours || 1}h
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom entry form */}
        {showForm ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom entry</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={addHours}
                onChange={(e) => setAddHours(e.target.value)}
                min="0.25" max="24" step="0.25"
                className="w-20 px-2 py-1.5 text-[12px] border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
                placeholder="Hours"
              />
              <span className="text-[12px] text-muted-foreground">hours</span>
            </div>
            <input
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              className="w-full px-2 py-1.5 text-[12px] border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              placeholder="Note or task name (optional)"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const h = parseFloat(addHours);
                  if (isNaN(h)) return;
                  onAdd({ hours: h, note: addNote });
                  setShowForm(false);
                  setAddHours("1");
                  setAddNote("");
                }}
                disabled={!addHours || isPending}
                className="flex-1 py-1.5 text-[11px] font-semibold bg-[#e8170b] text-white rounded-lg hover:bg-[#c91409] disabled:opacity-50 transition-colors"
              >
                Log Time
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-1.5 text-[11px] border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-muted-foreground hover:text-[#e8170b] border border-dashed border-border hover:border-[#e8170b]/50 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add custom entry
          </button>
        )}

        {entries.length === 0 && suggestions.length === 0 && !showForm && (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-muted-foreground opacity-20 mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground">No activity found for this day</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Add a custom entry below</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimesheetsPage() {
  const { data: session } = useSession();
  const { activeTeamId } = useUIStore();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const isAdmin = session?.user.role !== "TEAM_MEMBER";
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const userId = selectedUserId || session?.user.id || "";

  useEffect(() => {
    if (session?.user.id && !selectedUserId) setSelectedUserId(session.user.id);
  }, [session?.user.id, selectedUserId]);

  const { data, isLoading } = useQuery({
    queryKey: ["timesheets", userId, month, year],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets?userId=${userId}&month=${month}&year=${year}`);
      return res.json() as Promise<{ data: TimeEntry[]; activityByDay: Record<string, Suggestion[]> }>;
    },
    enabled: !!userId,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", activeTeamId],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
    enabled: isAdmin,
  });

  const entries: TimeEntry[] = data?.data || [];
  const activityByDay: Record<string, Suggestion[]> = data?.activityByDay || {};
  const allUsers: { id: string; name: string; departmentMemberships?: { departmentId: string }[] }[] = usersData?.data || [];
  const users = activeTeamId
    ? allUsers.filter((u) => u.departmentMemberships?.some((m) => m.departmentId === activeTeamId))
    : allUsers;

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const count = getDaysInMonth(currentDate);
    return Array.from({ length: count }, (_, i) => new Date(year, month - 1, i + 1));
  }, [currentDate, year, month]);

  // Monday-based start offset (Mon=0 … Sun=6)
  const startOffset = (getDay(calendarDays[0]) + 6) % 7;

  const entriesForDay = (day: Date) => entries.filter((e) => isSameDay(new Date(e.date), day));

  const suggestionsForDay = (day: Date): Suggestion[] => {
    const key = toDateKey(day);
    const all = activityByDay[key] || [];
    const logged = new Set(entriesForDay(day).map((e) => e.taskId).filter(Boolean));
    return all.filter((s) => !logged.has(s.taskId));
  };

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const loggedDays = new Set(entries.map((e) => e.date.split("T")[0])).size;
  const avgHours = loggedDays > 0 ? (totalHours / loggedDays).toFixed(1) : "0";

  const selectedUserName = users.find((u) => u.id === userId)?.name || session?.user.name || "";

  // Mutations
  const createEntry = useMutation({
    mutationFn: async (payload: { taskId?: string | null; hours: number; note?: string }) => {
      if (!selectedDay) throw new Error("No day selected");
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, taskId: payload.taskId || null, date: toDateKey(selectedDay), hours: payload.hours, note: payload.note || null }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(typeof errData.error === "string" ? errData.error : "Failed to log time");
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets", userId, month, year] }); toast.success("Time logged"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to log time"),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timesheets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets", userId, month, year] }); toast.success("Entry removed"); },
    onError: () => toast.error("Failed to remove"),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, hours, note }: { id: string; hours: number; note?: string }) => {
      const res = await fetch(`/api/timesheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, note }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timesheets", userId, month, year] }); toast.success("Updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const isPending = createEntry.isPending || deleteEntry.isPending || updateEntry.isPending;

  function handleExport() {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const params = new URLSearchParams({ from, to });
    if (userId) params.set("userId", userId);
    const a = document.createElement("a");
    a.href = `/api/timesheets/export?${params}`;
    a.download = "";
    a.click();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Timesheets</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isAdmin && selectedUserName ? `${selectedUserName} · ` : ""}
            {format(currentDate, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && users.length > 0 && (
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => { setSelectedUserId(e.target.value); setSelectedDay(null); }}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-[#e8170b] cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-1">
            <button onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setSelectedDay(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-semibold text-foreground min-w-[120px] text-center px-1">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setSelectedDay(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={handleExport}
            title={isAdmin ? "Export selected member's timesheet as CSV" : "Export your timesheet as CSV"}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:border-[#e8170b]/40 bg-card transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Hours", value: `${totalHours}h`, sub: "logged this month", color: "border-t-[#e8170b]" },
          { label: "Days Logged", value: String(loggedDays), sub: "days with entries", color: "border-t-[#4169e1]" },
          { label: "Daily Average", value: `${avgHours}h`, sub: "per logged day", color: "border-t-[#10b981]" },
        ].map((s) => (
          <div key={s.label} className={cn("bg-card border border-border border-t-[3px] rounded-xl p-4", s.color)}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1.5">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Calendar + Panel */}
      <div className="flex gap-4 items-start">
        {/* Calendar */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden min-w-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 p-2">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`pad-${i}`} className="h-[72px]" />
              ))}
              {calendarDays.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  dayEntries={entriesForDay(day)}
                  isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                  onClick={() => setSelectedDay(selectedDay && isSameDay(day, selectedDay) ? null : day)}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="border-t border-border px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#4169e1]/20 inline-block" />1–3h</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f59e0b]/20 inline-block" />4–7h</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#10b981]/20 inline-block" />8h+</span>
            <span className="ml-auto">Click a day to log or edit time</span>
          </div>
        </div>

        {/* Day panel */}
        {selectedDay && (
          <DayPanel
            day={selectedDay}
            entries={entriesForDay(selectedDay)}
            suggestions={suggestionsForDay(selectedDay)}
            onLogSuggestion={(s) => createEntry.mutate({ taskId: s.taskId, hours: s.estimatedHours || 1 })}
            onDelete={(id) => deleteEntry.mutate(id)}
            onUpdate={(d) => updateEntry.mutate(d)}
            onClose={() => setSelectedDay(null)}
            onAdd={(d) => createEntry.mutate(d)}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}
