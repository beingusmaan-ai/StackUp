"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, formatDate } from "@/lib/utils";
import { Calendar, User, Sparkles } from "lucide-react";
import { CampaignPredictionsModal } from "@/components/reports/CampaignPredictionsModal";
import { useUIStore } from "@/store/ui-store";

type Campaign = {
  id: string;
  name: string;
  department: { name: string; color: string } | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  inReviewTasks: number;
  pendingTasks: number;
  deadline: string | null;
  daysRemaining: number | null;
  owner: string;
  riskLevel: "safe" | "watch" | "risk" | "critical";
};

const RISK_CONFIG = {
  safe: { label: "Safe", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
  watch: { label: "Watch", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500" },
  risk: { label: "Risk", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", dot: "bg-orange-500" },
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", dot: "bg-red-500" },
};

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-[#e8170b]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CampaignReportsPage() {
  const { activeTeamId } = useUIStore();
  const [showPredictions, setShowPredictions] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "campaigns", activeTeamId],
    queryFn: () => {
      const url = activeTeamId
        ? `/api/reports/campaigns?departmentId=${activeTeamId}`
        : "/api/reports/campaigns";
      return fetch(url).then((r) => r.json());
    },
    refetchInterval: 60_000,
  });

  const campaigns: Campaign[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Project Reports</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{campaigns.length} active projects</p>
        </div>
        <button
          onClick={() => setShowPredictions(true)}
          disabled={isLoading || campaigns.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 text-[12px] font-medium hover:bg-blue-100 dark:hover:bg-blue-950/20 disabled:opacity-40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Predict Completion
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div
          className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}
        >
          {["Project", "Progress", "Tasks", "Blocked", "In Review", "Deadline", "Risk"].map((h) => (
            <div key={h} className="px-4 py-2.5">{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">No active campaigns found.</div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((c) => {
              const risk = RISK_CONFIG[c.riskLevel];
              return (
                <div
                  key={c.id}
                  className="grid items-center hover:bg-muted/20 transition-colors"
                  style={{ gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1fr 1fr 0.8fr" }}
                >
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">{c.owner}</span>
                      {c.department && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.department.color }} />
                          <span className="text-[11px] text-muted-foreground">{c.department.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <ProgressBar pct={c.progress} />
                    <p className="text-[11px] text-muted-foreground mt-0.5">{c.completedTasks}/{c.totalTasks} tasks</p>
                  </div>
                  <div className="px-4 py-3 text-[13px] text-muted-foreground">{c.totalTasks}</div>
                  <div className={cn("px-4 py-3 text-[13px] font-medium", c.blockedTasks > 0 ? "text-red-500" : "text-muted-foreground")}>
                    {c.blockedTasks}
                  </div>
                  <div className={cn("px-4 py-3 text-[13px] font-medium", c.inReviewTasks > 0 ? "text-violet-500" : "text-muted-foreground")}>
                    {c.inReviewTasks}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[12px] text-muted-foreground">
                        {c.deadline ? formatDate(c.deadline) : "—"}
                      </span>
                    </div>
                    {c.daysRemaining !== null && (
                      <p className={cn("text-[11px] mt-0.5", c.daysRemaining < 0 ? "text-red-500" : c.daysRemaining <= 7 ? "text-orange-500" : "text-muted-foreground")}>
                        {c.daysRemaining < 0 ? `${Math.abs(c.daysRemaining)}d overdue` : `${c.daysRemaining}d left`}
                      </p>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", risk.color, risk.bg)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", risk.dot)} />
                      {risk.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPredictions && (
        <CampaignPredictionsModal
          campaigns={campaigns}
          onClose={() => setShowPredictions(false)}
        />
      )}
    </div>
  );
}
