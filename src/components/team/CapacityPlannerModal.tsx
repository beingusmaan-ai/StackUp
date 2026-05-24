"use client";

import { useState } from "react";
import { X, Sparkles, BarChart2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TeamMemberStat } from "./TeamAIPanel";

interface CapacityMember {
  id: string;
  name: string;
  capacityScore: number;
  status: "available" | "busy" | "overloaded";
  note: string;
}

interface RolePick {
  role: string;
  roleLabel: string;
  bestPickId: string;
  bestPickName: string;
  reason: string;
}

interface CapacityData {
  summary: string;
  members: CapacityMember[];
  byRole: RolePick[];
}

interface Props {
  members: TeamMemberStat[];
  onClose: () => void;
}

const STATUS_CONFIG = {
  available: { label: "Available", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  busy: { label: "Busy", bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  overloaded: { label: "Overloaded", bar: "bg-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

export function CapacityPlannerModal({ members, onClose }: Props) {
  const [data, setData] = useState<CapacityData | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/capacity-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Capacity Planner</h2>
              <p className="text-[11px] text-muted-foreground">Who has bandwidth for new work?</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!data ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <BarChart2 className="w-10 h-10 text-violet-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              Score capacity across <span className="font-semibold text-foreground">{members.length} team members</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              See who can take on new tasks and get best-pick recommendations by role.
            </p>
            <button
              onClick={calculate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Calculating…" : "Calculate Capacity"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary */}
              <div className="p-3.5 bg-muted/40 rounded-xl">
                <p className="text-[13px] text-foreground">{data.summary}</p>
              </div>

              {/* Member capacity grid */}
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-2">Team Capacity</p>
                <div className="space-y-2">
                  {data.members
                    .slice()
                    .sort((a, b) => b.capacityScore - a.capacityScore)
                    .map((m) => {
                      const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.busy;
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-foreground">{m.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[12px] font-semibold text-foreground truncate">{m.name}</p>
                              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0", cfg.badge)}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", cfg.bar)}
                                  style={{ width: `${m.capacityScore}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-7 text-right flex-shrink-0">{m.capacityScore}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.note}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Best picks by role */}
              {data.byRole.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-violet-500" />
                    Best Picks for New Tasks
                  </p>
                  <div className="space-y-2">
                    {data.byRole.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-800 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-950/40 px-1.5 py-0.5 rounded-full">
                              {r.roleLabel}
                            </span>
                            <span className="text-[12px] font-semibold text-foreground">{r.bestPickName}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{r.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={calculate}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-violet-600 hover:text-violet-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Recalculating…" : "Regenerate"}
              </button>
              <button onClick={onClose} className="px-4 py-1.5 text-[12px] bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl font-medium transition-colors">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
