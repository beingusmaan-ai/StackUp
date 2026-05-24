"use client";

import { useState } from "react";
import { X, Sparkles, Scale, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { TeamMemberStat } from "./TeamAIPanel";

interface WorkloadData {
  summary: string;
  overloaded: { id: string; name: string; reason: string }[];
  available: { id: string; name: string; capacityNote: string }[];
  suggestions: {
    fromId: string; fromName: string;
    toId: string; toName: string;
    tasksToMove: number; reason: string;
  }[];
}

interface Props {
  members: TeamMemberStat[];
  onClose: () => void;
}

export function WorkloadBalancerModal({ members, onClose }: Props) {
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/workload-balancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
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
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <Scale className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Workload Balancer</h2>
              <p className="text-[11px] text-muted-foreground">{members.length} team members · AI-powered rebalancing</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!data ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Scale className="w-10 h-10 text-orange-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              Analyze task distribution across <span className="font-semibold text-foreground">{members.length} members</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              Identifies overloaded members and recommends specific reassignments.
            </p>
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Analyzing…" : "Analyze Workload"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary */}
              <div className="p-3.5 bg-muted/40 rounded-xl">
                <p className="text-[13px] text-foreground leading-relaxed">{data.summary}</p>
              </div>

              {/* Overloaded */}
              {data.overloaded.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    Overloaded ({data.overloaded.length})
                  </p>
                  <div className="space-y-2">
                    {data.overloaded.map((m) => (
                      <div key={m.id} className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-red-600">{m.name[0]}</span>
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{m.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available */}
              {data.available.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Has Capacity ({data.available.length})
                  </p>
                  <div className="space-y-2">
                    {data.available.map((m) => (
                      <div key={m.id} className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-emerald-600">{m.name[0]}</span>
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{m.capacityNote}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2">Suggested Reassignments</p>
                  <div className="space-y-2">
                    {data.suggestions.map((s, i) => (
                      <div key={i} className="p-3 border border-border rounded-xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[12px] font-medium text-foreground">{s.fromName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-[12px] font-medium text-foreground">{s.toName}</span>
                          <span className="ml-auto text-[11px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">
                            {s.tasksToMove} task{s.tasksToMove !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.overloaded.length === 0 && data.suggestions.length === 0 && (
                <div className="text-center py-4 text-[13px] text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  Workload appears balanced — no reassignments recommended.
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={analyze}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-orange-600 hover:text-orange-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Re-analyzing…" : "Regenerate"}
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
