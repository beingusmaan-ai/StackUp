"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthData {
  score: number;
  level: "excellent" | "good" | "at_risk" | "critical";
  diagnosis: string;
  risks: string[];
}

interface Campaign {
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  tasks: { status: string; dueDate?: string | null }[];
  completedTasks: number;
  progress: number;
}

const LEVEL_STYLE: Record<string, string> = {
  excellent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  good: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  at_risk: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  critical: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
};

const LEVEL_ICON: Record<string, React.ReactNode> = {
  excellent: <CheckCircle className="w-4 h-4" />,
  good: <TrendingUp className="w-4 h-4" />,
  at_risk: <AlertTriangle className="w-4 h-4" />,
  critical: <XCircle className="w-4 h-4" />,
};

export function CampaignHealthScore({ campaign }: { campaign: Campaign }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchHealth() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const startMs = new Date(campaign.startDate).getTime();
      const endMs = new Date(campaign.endDate).getTime();
      const todayMs = new Date(today).getTime();
      const totalDays = Math.ceil((endMs - startMs) / 86400000);
      const daysRemaining = Math.max(0, Math.ceil((endMs - todayMs) / 86400000));
      const blockedTasks = campaign.tasks.filter((t) => t.status === "BLOCKED").length;
      const overdueTasks = campaign.tasks.filter((t) => {
        if (!t.dueDate || t.status === "COMPLETED") return false;
        return new Date(t.dueDate) < new Date(today);
      }).length;

      const res = await fetch("/api/ai/campaign-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          today,
          totalTasks: campaign.tasks.length,
          completedTasks: campaign.completedTasks,
          blockedTasks,
          overdueTasks,
          progress: campaign.progress,
          daysRemaining,
          totalDays,
        }),
      });
      const json = await res.json();
      if (res.ok) setHealth(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!health) {
    return (
      <button
        onClick={fetchHealth}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-[12px] font-medium transition-colors disabled:opacity-50"
      >
        {loading
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? "Analysing…" : "AI Health Score"}
      </button>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border", LEVEL_STYLE[health.level])}>
      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
        {LEVEL_ICON[health.level]}
        <span className="text-2xl font-bold leading-none">{health.score}</span>
        <span className="text-[11px] font-medium opacity-70">/100</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold capitalize">{health.level.replace("_", " ")}</p>
        <p className="text-[12px] opacity-80 mt-0.5">{health.diagnosis}</p>
        {health.risks.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {health.risks.map((r, i) => (
              <li key={i} className="text-[11px] opacity-70 flex items-start gap-1">
                <span className="mt-1 w-1 h-1 rounded-full bg-current flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={fetchHealth}
        disabled={loading}
        className="flex-shrink-0 opacity-60 hover:opacity-100 disabled:opacity-30"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
      </button>
    </div>
  );
}
