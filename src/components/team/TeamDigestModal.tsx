"use client";

import { useState } from "react";
import { X, Sparkles, FileText, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import type { TeamMemberStat } from "./TeamAIPanel";

interface DigestData {
  headline: string;
  executiveSummary: string;
  topPerformers: { name: string; insight: string }[];
  atRisk: { name: string; issue: string }[];
  patterns: string;
  recommendations: string[];
}

interface Props {
  members: TeamMemberStat[];
  onClose: () => void;
}

export function TeamDigestModal({ members, onClose }: Props) {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/team-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Team Performance Digest</h2>
              <p className="text-[11px] text-muted-foreground">AI-written management briefing</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!data ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-10 h-10 text-blue-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              Generate a performance briefing for <span className="font-semibold text-foreground">{members.length} team members</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              Covers top performers, at-risk members, patterns, and actionable recommendations.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Writing digest…" : "Generate Digest"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Headline */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-[14px] font-semibold text-foreground mb-1.5">{data.headline}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{data.executiveSummary}</p>
              </div>

              {/* Top performers */}
              {data.topPerformers.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Top Performers
                  </p>
                  <div className="space-y-2">
                    {data.topPerformers.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-white">{p.name[0]}</span>
                        </span>
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* At risk */}
              {data.atRisk.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                    Needs Attention
                  </p>
                  <div className="space-y-2">
                    {data.atRisk.map((m, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                        <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-white">{m.name[0]}</span>
                        </span>
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{m.issue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {data.patterns && (
                <div className="p-3.5 bg-muted/40 rounded-xl">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Team Patterns</p>
                  <p className="text-[12px] text-foreground leading-relaxed">{data.patterns}</p>
                </div>
              )}

              {/* Recommendations */}
              {data.recommendations.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
                    Recommendations
                  </p>
                  <ul className="space-y-2">
                    {data.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
                        <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Regenerating…" : "Regenerate"}
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
