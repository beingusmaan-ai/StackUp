import { addDays, addWeeks, addMonths, startOfDay, getDay, setDate, isAfter } from "date-fns";

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type EndType = "NEVER" | "ON_DATE" | "AFTER_COUNT";

export interface RecurringConfig {
  frequency: Frequency;
  interval: number;
  weekDays?: string | null; // "0,1,2,3,4,5,6" — 0=Sun, 1=Mon, …, 6=Sat
  monthDay?: number | null; // 1–31
  startDate: Date;
  endType: EndType;
  endDate?: Date | null;
  endCount?: number | null;
  generatedCount?: number;
}

export function computeNextRunDate(config: RecurringConfig, from: Date): Date | null {
  const { frequency, interval, weekDays, monthDay, endType, endDate, endCount, generatedCount = 0 } = config;

  if (endType === "AFTER_COUNT" && endCount != null && generatedCount >= endCount) return null;

  let next: Date | null = null;
  const base = startOfDay(from);

  if (frequency === "DAILY") {
    next = addDays(base, interval);
  } else if (frequency === "WEEKLY") {
    const days = (weekDays || "1").split(",").map(Number).sort((a, b) => a - b);

    if (interval === 1) {
      // Scan the next 7 days for first matching weekday
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(base, i);
        if (days.includes(getDay(candidate))) {
          next = candidate;
          break;
        }
      }
    } else {
      // Advance N weeks, then scan forward for first matching weekday
      const future = addWeeks(base, interval);
      for (let i = 0; i <= 6; i++) {
        const candidate = addDays(future, i);
        if (days.includes(getDay(candidate))) {
          next = candidate;
          break;
        }
      }
    }
  } else {
    // MONTHLY
    const targetDay = monthDay || 1;
    const future = addMonths(base, interval);
    const lastDay = new Date(future.getFullYear(), future.getMonth() + 1, 0).getDate();
    next = setDate(future, Math.min(targetDay, lastDay));
  }

  if (next === null) return null;
  if (endType === "ON_DATE" && endDate && isAfter(next, startOfDay(endDate))) return null;

  return next;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatFrequency(
  frequency: Frequency,
  interval: number,
  weekDays?: string | null,
  monthDay?: number | null
): string {
  if (frequency === "DAILY") {
    return interval === 1 ? "Daily" : `Every ${interval} days`;
  }
  if (frequency === "WEEKLY") {
    const base = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
    if (weekDays) {
      const dayLabels = weekDays
        .split(",")
        .map(Number)
        .map((d) => DAY_NAMES[d])
        .join(", ");
      return `${base} on ${dayLabels}`;
    }
    return base;
  }
  // MONTHLY
  const base = interval === 1 ? "Monthly" : `Every ${interval} months`;
  return monthDay ? `${base} on day ${monthDay}` : base;
}

export function hasReachedEnd(config: RecurringConfig): boolean {
  const { endType, endDate, endCount, generatedCount = 0 } = config;
  if (endType === "ON_DATE" && endDate && isAfter(new Date(), startOfDay(endDate))) return true;
  if (endType === "AFTER_COUNT" && endCount != null && generatedCount >= endCount) return true;
  return false;
}
