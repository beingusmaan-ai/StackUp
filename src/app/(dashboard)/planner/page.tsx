"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType = "MEETING" | "TIME_BLOCK" | "FOCUS" | "REMINDER";
type View = "day" | "week" | "month";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  type: EventType;
  color?: string | null;
  userId: string;
  taskId?: string | null;
  task?: { id: string; title: string; priority: string } | null;
}

interface CreateEventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  type: EventType;
  color?: string | null;
  taskId?: string | null;
}

interface PlannerTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  campaign?: { id: string; name: string } | null;
}

interface ModalSlot { date: Date; hour: number; minute: number }

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TYPE_CONFIG: Record<EventType, { label: string; color: string }> = {
  MEETING:    { label: "Meeting",    color: "#3b82f6" },
  TIME_BLOCK: { label: "Time Block", color: "#f97316" },
  FOCUS:      { label: "Focus",      color: "#8b5cf6" },
  REMINDER:   { label: "Reminder",   color: "#22c55e" },
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_ABBR    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const endOfDay   = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r; };

function startOfWeekMon(d: Date): Date {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0,0,0,0); return r;
}
function endOfWeekSun(d: Date): Date {
  const r = startOfWeekMon(d); r.setDate(r.getDate() + 6); r.setHours(23,59,59,999); return r;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date):   Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function isToday(d: Date) { return isSameDay(d, new Date()); }

function fmtHour(h: number): string {
  if (h === 0) return "12am"; if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h-12}pm`;
}
function fmtTime(d: Date): string {
  let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "pm" : "am";
  if (h === 0) h = 12; else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2,"0")}${ap}`;
}
function fmtDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function fmtHeader(d: Date, view: View): string {
  if (view === "day") return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (view === "week") {
    const s = startOfWeekMon(d), e = endOfWeekSun(d);
    return s.getMonth() === e.getMonth()
      ? `${MONTH_ABBR[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`
      : `${MONTH_ABBR[s.getMonth()]} ${s.getDate()} – ${MONTH_ABBR[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── CurrentTimeLine ─────────────────────────────────────────────────────────

function CurrentTimeLine() {
  const [top, setTop] = useState(() => {
    const n = new Date();
    return n.getHours() * HOUR_HEIGHT + (n.getMinutes() / 60) * HOUR_HEIGHT;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setTop(n.getHours() * HOUR_HEIGHT + (n.getMinutes() / 60) * HOUR_HEIGHT);
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top }}>
      <div className="w-2.5 h-2.5 rounded-full bg-[#e8170b] -ml-1.5 flex-shrink-0 shadow" />
      <div className="flex-1 h-px bg-[#e8170b]" />
    </div>
  );
}

// ─── EventBlock ───────────────────────────────────────────────────────────────

function EventBlock({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const start  = new Date(event.startTime);
  const end    = new Date(event.endTime);
  const top    = start.getHours() * HOUR_HEIGHT + (start.getMinutes() / 60) * HOUR_HEIGHT;
  const bottom = end.getHours()   * HOUR_HEIGHT + (end.getMinutes()   / 60) * HOUR_HEIGHT;
  const height = Math.max(bottom - top, 22);
  const color  = event.color ?? TYPE_CONFIG[event.type]?.color ?? "#3b82f6";

  return (
    <div
      className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer select-none z-10 group transition-all hover:brightness-110 active:scale-[0.98]"
      style={{ top, height, backgroundColor: color + "e6" }}
      onClick={onClick}
    >
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ backgroundColor: color }} />
      <div className="pl-2 pr-1.5 py-0.5">
        <p className="text-[11px] font-semibold text-white truncate leading-tight">{event.title}</p>
        {height >= 44 && (
          <p className="text-[10px] text-white/80 leading-tight">{fmtTime(start)} – {fmtTime(end)}</p>
        )}
        {height >= 60 && event.description && (
          <p className="text-[10px] text-white/60 mt-0.5 line-clamp-2 leading-tight">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── WeekDayGrid ─────────────────────────────────────────────────────────────

function WeekDayGrid({ days, events, onSlotClick, onEventClick }: {
  days: Date[];
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number, minute: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const eventsForDay = useCallback(
    (day: Date) => events.filter((e) => !e.allDay && isSameDay(new Date(e.startTime), day)),
    [events]
  );

  const handleColClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y    = e.clientY - rect.top + el.scrollTop;
    const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_HEIGHT)));
    const rawM = Math.round(((y % HOUR_HEIGHT) / HOUR_HEIGHT) * 4) * 15;
    onSlotClick(day, hour, rawM >= 60 ? 45 : rawM);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header row */}
      <div className="flex-shrink-0 flex border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="w-16 flex-shrink-0 border-r border-border/40" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 flex flex-col items-center py-2 border-l border-border/40 select-none",
              isToday(day) && "bg-[#e8170b]/[0.04]"
            )}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {DAY_ABBR[day.getDay()]}
            </span>
            <span className={cn(
              "text-xl font-light mt-0.5 w-9 h-9 flex items-center justify-center rounded-full transition-colors",
              isToday(day) ? "bg-[#e8170b] text-white font-semibold" : "text-foreground hover:bg-muted"
            )}>
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* All-day row */}
      {events.some((e) => e.allDay) && (
        <div className="flex-shrink-0 flex border-b border-border bg-muted/20 min-h-[28px]">
          <div className="w-16 flex-shrink-0 flex items-center justify-end pr-2">
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wide">all day</span>
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 border-l border-border/40 px-1 py-0.5 flex flex-wrap gap-0.5">
              {events.filter((e) => e.allDay && isSameDay(new Date(e.startTime), day)).map((ev) => (
                <button
                  key={ev.id}
                  className="text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate max-w-full"
                  style={{ backgroundColor: ev.color ?? TYPE_CONFIG[ev.type]?.color ?? "#3b82f6" }}
                  onClick={() => onEventClick(ev)}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 relative border-r border-border/40 bg-background">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground/40 select-none"
                style={{ top: h * HOUR_HEIGHT - 6 }}
              >
                {h !== 0 ? fmtHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 relative">
            {/* Hour grid lines */}
            {HOURS.map((h) => (
              <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: h * HOUR_HEIGHT }} />
            ))}
            {/* Half-hour lines */}
            {HOURS.map((h) => (
              <div key={`hh${h}`} className="absolute left-0 right-0 border-t border-border/20 border-dashed" style={{ top: h * HOUR_HEIGHT + 30 }} />
            ))}

            {/* Columns */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative border-l border-border/40 cursor-crosshair",
                    isToday(day) && "bg-[#e8170b]/[0.015]"
                  )}
                  onClick={(e) => handleColClick(e, day)}
                >
                  {isToday(day) && <CurrentTimeLine />}
                  {eventsForDay(day).map((ev) => (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, onDayClick, onEventClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeekMon(new Date(year, month, 1)), i));
  const evForDay = (d: Date) => events.filter((e) => isSameDay(new Date(e.startTime), d));

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      <div className="grid grid-cols-7 mb-1.5">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest py-1">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-border rounded-2xl overflow-hidden">
        {cells.map((day, i) => {
          const dayEvs = evForDay(day);
          const inMonth = day.getMonth() === month;
          return (
            <div
              key={i}
              className={cn(
                "bg-background p-1.5 cursor-pointer hover:bg-muted/40 transition-colors flex flex-col gap-0.5 overflow-hidden",
                !inMonth && "opacity-30",
                isToday(day) && "bg-[#e8170b]/[0.04] hover:bg-[#e8170b]/[0.07]"
              )}
              onClick={() => onDayClick(day)}
            >
              <span className={cn(
                "text-xs font-medium self-start w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0",
                isToday(day) ? "bg-[#e8170b] text-white" : "text-foreground"
              )}>
                {day.getDate()}
              </span>
              {dayEvs.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="text-[10px] text-white font-medium px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:brightness-110 transition-all"
                  style={{ backgroundColor: ev.color ?? TYPE_CONFIG[ev.type]?.color ?? "#3b82f6" }}
                  onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvs.length > 3 && (
                <span className="text-[10px] text-muted-foreground px-1">+{dayEvs.length - 3} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ month, onMonthChange, selectedDate, onDateClick, events }: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: Date;
  onDateClick: (d: Date) => void;
  events: CalendarEvent[];
}) {
  const y = month.getFullYear(), m = month.getMonth();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startOfWeekMon(new Date(y, m, 1)), i));
  const eventDays = new Set(events.map((e) => {
    const d = new Date(e.startTime);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));

  return (
    <div className="p-3 border-b border-border flex-shrink-0 select-none">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-foreground">{MONTH_ABBR[m]} {y}</span>
        <div className="flex">
          <button onClick={() => onMonthChange(addMonths(month, -1))} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={() => onMonthChange(addMonths(month, 1))} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground/50">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const other   = day.getMonth() !== m;
          const sel     = isSameDay(day, selectedDate);
          const tod     = isToday(day);
          const hasEvs  = eventDays.has(key);
          return (
            <button
              key={i}
              onClick={() => onDateClick(day)}
              className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-square rounded-md text-[10px] font-medium transition-all",
                other   ? "text-muted-foreground/25" : "text-foreground",
                sel     && "bg-[#e8170b] !text-white",
                !sel && tod && "text-[#e8170b] font-bold",
                !sel && !other && "hover:bg-muted"
              )}
            >
              {day.getDate()}
              {hasEvs && !sel && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#e8170b]/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onSchedule }: { task: PlannerTask; onSchedule: () => void }) {
  return (
    <div className="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-muted/60 transition-colors mb-0.5">
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? "#9ca3af" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground truncate">{task.title}</p>
        <p className="text-[10px] text-muted-foreground/60 truncate">
          {task.campaign?.name ?? (task.dueDate
            ? `Due ${new Date(task.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`
            : task.status.replace(/_/g, " ").toLowerCase()
          )}
        </p>
      </div>
      <button
        onClick={onSchedule}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[10px] font-semibold text-[#e8170b] bg-[#e8170b]/10 hover:bg-[#e8170b]/20 px-1.5 py-0.5 rounded-md transition-all"
      >
        + Add
      </button>
    </div>
  );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

function EventModal({ event, slot, onClose, onSave, onDelete, isPending }: {
  event: CalendarEvent | null;
  slot: ModalSlot | null;
  onClose: () => void;
  onSave: (data: CreateEventInput) => void;
  onDelete?: () => void;
  isPending: boolean;
}) {
  const initDate  = () => fmtDateInput(event ? new Date(event.startTime) : slot?.date ?? new Date());
  const initStart = () => {
    if (event) return fmtTimeInput(new Date(event.startTime));
    const h = slot?.hour ?? 9, m = slot?.minute ?? 0;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  };
  const initEnd = () => {
    if (event) return fmtTimeInput(new Date(event.endTime));
    const h = Math.min((slot?.hour ?? 9) + 1, 23), m = slot?.minute ?? 0;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  };

  const [title, setTitle]   = useState(event?.title ?? "");
  const [type,  setType]    = useState<EventType>(event?.type ?? "MEETING");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [date,  setDate]    = useState(initDate);
  const [startT, setStartT] = useState(initStart);
  const [endT,  setEndT]    = useState(initEnd);
  const [desc,  setDesc]    = useState(event?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(), type, allDay,
      startTime: allDay ? new Date(`${date}T00:00:00`).toISOString() : new Date(`${date}T${startT}:00`).toISOString(),
      endTime:   allDay ? new Date(`${date}T23:59:59`).toISOString() : new Date(`${date}T${endT}:00`).toISOString(),
      description: desc.trim() || null,
      color: event?.color ?? null,
      taskId: event?.taskId ?? null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Colour accent bar */}
        <div className="h-1" style={{ backgroundColor: TYPE_CONFIG[type]?.color ?? "#3b82f6" }} />

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{event ? "Edit Event" : "New Event"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title…"
            className="w-full text-base font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground/30 text-foreground"
            autoFocus
            required
          />

          {/* Type tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {(["MEETING","TIME_BLOCK","FOCUS","REMINDER"] as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "py-1.5 text-[10px] font-semibold rounded-lg border transition-all",
                  type === t ? "text-white border-transparent shadow-sm" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                style={type === t ? { backgroundColor: TYPE_CONFIG[t].color } : {}}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* Date + allDay */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-muted rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#e8170b]/30 text-foreground"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0 select-none">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-[#e8170b] rounded" />
              All day
            </label>
          </div>

          {/* Time range */}
          {!allDay && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startT}
                onChange={(e) => setStartT(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#e8170b]/30 text-foreground"
              />
              <span className="text-xs text-muted-foreground shrink-0">→</span>
              <input
                type="time"
                value={endT}
                onChange={(e) => setEndT(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-xl border border-border outline-none focus:ring-2 focus:ring-[#e8170b]/30 text-foreground"
              />
            </div>
          )}

          {/* Description */}
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Add description…"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-muted rounded-xl border border-border outline-none resize-none focus:ring-2 focus:ring-[#e8170b]/30 placeholder:text-muted-foreground/30 text-foreground"
          />

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {onDelete
              ? <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">Delete</button>
              : <div />
            }
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving…" : event ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const qc = useQueryClient();
  const [view,         setView]         = useState<View>("week");
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [showModal,    setShowModal]    = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalSlot,    setModalSlot]    = useState<ModalSlot | null>(null);
  const [miniCalMonth, setMiniCalMonth] = useState(new Date());

  const rangeStart = view === "day" ? startOfDay(currentDate) : view === "week" ? startOfWeekMon(currentDate) : startOfMonth(currentDate);
  const rangeEnd   = view === "day" ? endOfDay(currentDate)   : view === "week" ? endOfWeekSun(currentDate)   : endOfMonth(currentDate);

  const { data: evRes, isLoading } = useQuery({
    queryKey: ["planner-events", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => fetch(`/api/planner/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`).then((r) => r.json()),
  });
  const events: CalendarEvent[] = evRes?.data ?? [];

  const { data: taskRes } = useQuery({
    queryKey: ["planner-tasks"],
    queryFn: () => fetch("/api/tasks?picker=1").then((r) => r.json()),
  });
  const tasks: PlannerTask[] = taskRes?.data ?? [];

  const createEvent = useMutation({
    mutationFn: (d: CreateEventInput) =>
      fetch("/api/planner/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planner-events"] }); setShowModal(false); toast.success("Event created"); },
    onError: () => toast.error("Failed to create event"),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, ...d }: CreateEventInput & { id: string }) =>
      fetch(`/api/planner/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planner-events"] }); setShowModal(false); toast.success("Event updated"); },
    onError: () => toast.error("Failed to update event"),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => fetch(`/api/planner/events/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planner-events"] }); setShowModal(false); toast.success("Event deleted"); },
    onError: () => toast.error("Failed to delete event"),
  });

  const navigate = (dir: 1 | -1) =>
    setCurrentDate((d) => view === "day" ? addDays(d, dir) : view === "week" ? addDays(d, dir * 7) : addMonths(d, dir));

  const openNew  = (date: Date, hour = 9, minute = 0) => { setEditingEvent(null); setModalSlot({ date, hour, minute }); setShowModal(true); };
  const openEdit = (ev: CalendarEvent) => { setEditingEvent(ev); setModalSlot(null); setShowModal(true); };

  const weekDays = useMemo(() =>
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeekMon(currentDate), i))
      : [startOfDay(currentDate)],
    [view, currentDate]
  );

  const handleSave = (data: CreateEventInput) => {
    if (editingEvent) updateEvent.mutate({ id: editingEvent.id, ...data });
    else createEvent.mutate(data);
  };

  const scheduleTask = (task: PlannerTask) => {
    const start = new Date(currentDate); start.setHours(9, 0, 0, 0);
    const end   = new Date(start);       end.setHours(10, 0, 0, 0);
    createEvent.mutate({ title: task.title, type: "TIME_BLOCK", allDay: false, startTime: start.toISOString(), endTime: end.toISOString(), description: null, color: null, taskId: task.id });
  };

  return (
    <div className="-m-6 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-background z-20">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors text-foreground ml-1">
            Today
          </button>
        </div>

        <h2 className="text-sm font-semibold text-foreground select-none">{fmtHeader(currentDate, view)}</h2>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["day","week","month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 text-[11px] font-semibold rounded-md transition-all capitalize",
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNew(currentDate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Event
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <div className="w-52 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
          <MiniCalendar
            month={miniCalMonth}
            onMonthChange={setMiniCalMonth}
            selectedDate={currentDate}
            onDateClick={(d) => { setCurrentDate(d); if (view === "month") setView("week"); setMiniCalMonth(d); }}
            events={events}
          />
          <div className="flex-1 overflow-y-auto px-2 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1.5">My Tasks</p>
            {tasks.length === 0 && <p className="text-[11px] text-muted-foreground/40 px-1.5">No tasks assigned</p>}
            {tasks.slice(0, 30).map((t) => <TaskCard key={t.id} task={t} onSchedule={() => scheduleTask(t)} />)}
          </div>
        </div>

        {/* ── Calendar area ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-7 h-7 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === "month" ? (
            <MonthView currentDate={currentDate} events={events} onDayClick={(d) => { setCurrentDate(d); setView("day"); }} onEventClick={openEdit} />
          ) : (
            <WeekDayGrid days={weekDays} events={events} onSlotClick={openNew} onEventClick={openEdit} />
          )}
        </div>
      </div>

      {/* ── Event modal ───────────────────────────────────────────────── */}
      {showModal && (
        <EventModal
          event={editingEvent}
          slot={modalSlot}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          onDelete={editingEvent ? () => deleteEvent.mutate(editingEvent.id) : undefined}
          isPending={createEvent.isPending || updateEvent.isPending}
        />
      )}
    </div>
  );
}
