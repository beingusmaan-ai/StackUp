"use client";

import { cn } from "@/lib/utils";
import { formatFrequency } from "@/lib/recurring";

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type EndType = "NEVER" | "ON_DATE" | "AFTER_COUNT";

export interface RecurringConfig {
  frequency: Frequency;
  interval: number;
  weekDays: string; // "0,1,2" — 0=Sun, 1=Mon, …, 6=Sat
  monthDay: number;
  startDate: string; // YYYY-MM-DD
  endType: EndType;
  endDate: string; // YYYY-MM-DD
  endCount: number;
}

export function getDefaultRecurringConfig(): RecurringConfig {
  return {
    frequency: "WEEKLY",
    interval: 1,
    weekDays: "1",
    monthDay: 1,
    startDate: new Date().toISOString().split("T")[0],
    endType: "NEVER",
    endDate: "",
    endCount: 10,
  };
}

export const DEFAULT_RECURRING_CONFIG: RecurringConfig = {
  frequency: "WEEKLY",
  interval: 1,
  weekDays: "1",
  monthDay: 1,
  startDate: new Date().toISOString().split("T")[0],
  endType: "NEVER",
  endDate: "",
  endCount: 10,
};

const WEEKDAYS = [
  { value: 0, label: "Su" },
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
];

interface Props {
  value: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
}

export function RecurringBuilder({ value, onChange }: Props) {
  const selectedDays = value.weekDays
    ? value.weekDays.split(",").map(Number)
    : [1];

  function set(partial: Partial<RecurringConfig>) {
    onChange({ ...value, ...partial });
  }

  function toggleDay(day: number) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    if (next.length === 0) return;
    set({ weekDays: next.join(",") });
  }

  const previewText = [
    formatFrequency(value.frequency, value.interval, value.weekDays, value.monthDay),
    value.startDate && `starting ${value.startDate}`,
    value.endType === "ON_DATE" && value.endDate && `until ${value.endDate}`,
    value.endType === "AFTER_COUNT" && `for ${value.endCount} occurrences`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="border border-border rounded-xl p-4 space-y-4 bg-muted/20">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
        Recurrence Settings
      </p>

      {/* Frequency tabs */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Repeats</label>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["DAILY", "WEEKLY", "MONTHLY"] as Frequency[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set({ frequency: f })}
              className={cn(
                "flex-1 py-1.5 rounded-md text-[13px] font-medium transition-all",
                value.frequency === f
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Interval */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium whitespace-nowrap">Every</label>
        <input
          type="number"
          value={value.interval}
          onChange={(e) =>
            set({ interval: Math.max(1, parseInt(e.target.value) || 1) })
          }
          min={1}
          max={99}
          className="w-14 px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
        />
        <span className="text-sm text-muted-foreground">
          {value.frequency === "DAILY"
            ? "day(s)"
            : value.frequency === "WEEKLY"
            ? "week(s)"
            : "month(s)"}
        </span>
      </div>

      {/* Weekday picker */}
      {value.frequency === "WEEKLY" && (
        <div>
          <label className="block text-sm font-medium mb-1.5">On days</label>
          <div className="flex gap-1">
            {WEEKDAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  "w-9 h-9 rounded-lg text-[12px] font-semibold transition-all border",
                  selectedDays.includes(d.value)
                    ? "bg-[#e8170b] text-white border-[#e8170b]"
                    : "border-border text-muted-foreground hover:border-[#e8170b] hover:text-[#e8170b]"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Month day picker */}
      {value.frequency === "MONTHLY" && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            On day of month
          </label>
          <input
            type="number"
            value={value.monthDay}
            onChange={(e) =>
              set({
                monthDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
              })
            }
            min={1}
            max={31}
            className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
          />
        </div>
      )}

      {/* Start date */}
      <div>
        <label className="block text-sm font-medium mb-1.5">First occurrence</label>
        <input
          type="date"
          value={value.startDate}
          onChange={(e) => set({ startDate: e.target.value })}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
        />
      </div>

      {/* End condition */}
      <div>
        <label className="block text-sm font-medium mb-2">Ends</label>
        <div className="space-y-2">
          {(
            [
              ["NEVER", "Never"],
              ["ON_DATE", "On a specific date"],
              ["AFTER_COUNT", "After N occurrences"],
            ] as [EndType, string][]
          ).map(([type, label]) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="endType"
                value={type}
                checked={value.endType === type}
                onChange={() => set({ endType: type })}
                className="accent-[#e8170b]"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        {value.endType === "ON_DATE" && (
          <div className="mt-2 ml-5">
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>
        )}

        {value.endType === "AFTER_COUNT" && (
          <div className="mt-2 ml-5 flex items-center gap-2">
            <input
              type="number"
              value={value.endCount}
              onChange={(e) =>
                set({ endCount: Math.max(1, parseInt(e.target.value) || 1) })
              }
              min={1}
              max={999}
              className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
            <span className="text-sm text-muted-foreground">occurrences</span>
          </div>
        )}
      </div>

      {/* Summary preview */}
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <p className="text-[12px] text-muted-foreground">{previewText || "Configure recurrence above"}</p>
      </div>
    </div>
  );
}
