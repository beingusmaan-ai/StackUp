"use client";

import { useState } from "react";
import { Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface SummaryData {
  headline: string;
  narrative: string;
  keyPoints: string[];
  callToAction: string;
}

interface Props {
  kpis: Record<string, { value: number; trend?: number }>;
  insights: { type: string; message: string }[];
}

export function ExecutiveSummaryPanel({ kpis, insights }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);

  async function generate() {
    setLoading(true);
    setVisible(true);
    setCollapsed(false);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpis, insights, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate summary");
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!visible && (
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 text-violet-600 text-[12px] font-medium hover:bg-violet-100 dark:hover:bg-violet-950/20 disabled:opacity-50 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? "Generating…" : "AI Summary"}
        </button>
      )}

      {visible && (
        <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              <span className="text-[12px] font-semibold text-violet-700 dark:text-violet-300">AI Executive Summary</span>
              {loading && <span className="text-[11px] text-violet-500">Generating…</span>}
            </div>
            <div className="flex items-center gap-1">
              {data && (
                <button onClick={() => setCollapsed((v) => !v)} className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-500">
                  {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={generate}
                disabled={loading}
                className="text-[10px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 px-1.5"
              >
                {loading ? "…" : "↻ Refresh"}
              </button>
              <button onClick={() => setVisible(false)} className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!collapsed && data && (
            <div className="px-4 pb-4 space-y-3 border-t border-violet-200 dark:border-violet-800 pt-3">
              <p className="text-[14px] font-semibold text-foreground">{data.headline}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{data.narrative}</p>

              {data.keyPoints.length > 0 && (
                <ul className="space-y-1.5">
                  {data.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              )}

              {data.callToAction && (
                <div className="flex items-start gap-2 p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide flex-shrink-0 mt-0.5">Action</span>
                  <p className="text-[12px] text-violet-800 dark:text-violet-200 font-medium">{data.callToAction}</p>
                </div>
              )}
            </div>
          )}

          {loading && !data && (
            <div className="px-4 pb-4 pt-3 border-t border-violet-200 dark:border-violet-800 space-y-2">
              {[80, 100, 60].map((w, i) => (
                <div key={i} className={`h-3 bg-violet-200 dark:bg-violet-800 rounded animate-pulse`} style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
