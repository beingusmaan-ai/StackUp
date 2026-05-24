"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserStat {
  id: string;
  name: string;
  marketingRole: string | null;
  completed: number;
  onTime: number;
  delayed: number;
  activeTasks: number;
  overdueTasks: number;
  avgCompletionDays: number;
  completionRate: number;
}

interface Anomaly {
  userId: string;
  userName: string;
  type: "positive" | "negative";
  title: string;
  detail: string;
}

interface AnomalyData {
  summary: string;
  anomalies: Anomaly[];
  teamPatterns: string[];
}

interface Props {
  users: UserStat[];
  dateRange: string;
  onClose: () => void;
}

export function ProductivityAnomaliesPanel({ users, dateRange, onClose }: Props) {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { detect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function detect() {
    setLoading(true);
    setCollapsed(false);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/productivity-anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users, dateRange, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          <span className="text-[12px] font-semibold text-violet-700 dark:text-violet-300">Anomaly Detection</span>
          {loading && <span className="text-[11px] text-violet-500">Analyzing…</span>}
          {data && !loading && (
            <span className="text-[11px] text-violet-500">
              {data.anomalies.length} anomal{data.anomalies.length !== 1 ? "ies" : "y"} found
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {data && (
            <button onClick={() => setCollapsed((v) => !v)} className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-500">
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={detect}
            disabled={loading}
            className="text-[10px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 px-1.5"
          >
            {loading ? "…" : "↻ Refresh"}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="px-4 pb-4 pt-3 border-t border-violet-200 dark:border-violet-800 space-y-2">
          {[90, 70, 80].map((w, i) => (
            <div key={i} className="h-3 bg-violet-200 dark:bg-violet-800 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {!collapsed && data && (
        <div className="px-4 pb-4 pt-3 border-t border-violet-200 dark:border-violet-800 space-y-4">
          <p className="text-[12px] text-muted-foreground">{data.summary}</p>

          {data.anomalies.length > 0 && (
            <div className="space-y-2">
              {data.anomalies.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 p-3 rounded-xl border",
                    a.type === "positive"
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    a.type === "positive" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"
                  )}>
                    {a.type === "positive"
                      ? <TrendingUp className="w-3 h-3 text-emerald-600" />
                      : <TrendingDown className="w-3 h-3 text-red-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-semibold text-foreground">{a.userName}</span>
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        a.type === "positive" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      )}>
                        {a.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.teamPatterns.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Team Patterns</p>
              <ul className="space-y-1">
                {data.teamPatterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 mt-1.5" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.anomalies.length === 0 && (
            <p className="text-[12px] text-emerald-600 font-medium">No significant anomalies — team is performing within normal range.</p>
          )}
        </div>
      )}
    </div>
  );
}
