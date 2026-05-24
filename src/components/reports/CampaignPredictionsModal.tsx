"use client";

import { useState } from "react";
import { X, Sparkles, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  daysRemaining: number | null;
  riskLevel: string;
}

interface Prediction {
  id: string;
  name: string;
  status: "on_track" | "at_risk" | "will_miss" | "no_deadline";
  predictedOffsetDays: number;
  confidence: "high" | "medium" | "low";
  insight: string;
}

interface Props {
  campaigns: Campaign[];
  onClose: () => void;
}

const STATUS_CONFIG = {
  on_track: { label: "On Track", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: TrendingUp },
  at_risk: { label: "At Risk", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", icon: Minus },
  will_miss: { label: "Will Miss", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", icon: TrendingDown },
  no_deadline: { label: "No Deadline", color: "text-muted-foreground", bg: "bg-muted/40", icon: Clock },
};

const CONFIDENCE_LABEL = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export function CampaignPredictionsModal({ campaigns, onClose }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function predict() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/campaign-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setPredictions(json.data.predictions ?? []);
      setSummary(json.data.summary ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prediction failed");
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
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Predictive Campaign Completion</h2>
              <p className="text-[11px] text-muted-foreground">{campaigns.length} active campaigns · AI timeline forecast</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {predictions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <TrendingUp className="w-10 h-10 text-blue-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              Forecast completion dates for <span className="font-semibold text-foreground">{campaigns.length} campaigns</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              Based on current progress velocity, blocked tasks, and remaining work.
            </p>
            <button
              onClick={predict}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Forecasting…" : "Generate Forecast"}
            </button>
          </div>
        ) : (
          <>
            {summary && (
              <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
                <p className="text-[12px] text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {summary}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {predictions.map((pred) => {
                const cfg = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.no_deadline;
                const Icon = cfg.icon;
                const offsetLabel = pred.status === "no_deadline"
                  ? "—"
                  : pred.predictedOffsetDays === 0
                    ? "On deadline"
                    : pred.predictedOffsetDays > 0
                      ? `${pred.predictedOffsetDays}d late`
                      : `${Math.abs(pred.predictedOffsetDays)}d early`;

                return (
                  <div key={pred.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground truncate">{pred.name}</p>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0", cfg.color, cfg.bg)}>
                          {cfg.label}
                        </span>
                        {pred.status !== "no_deadline" && (
                          <span className={cn(
                            "text-[11px] font-semibold flex-shrink-0",
                            pred.predictedOffsetDays > 0 ? "text-red-500" : pred.predictedOffsetDays < 0 ? "text-emerald-600" : "text-muted-foreground"
                          )}>
                            {offsetLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{pred.insight}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{CONFIDENCE_LABEL[pred.confidence]}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={predict}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? "Re-forecasting…" : "Regenerate"}
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
