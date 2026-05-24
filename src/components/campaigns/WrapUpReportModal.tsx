"use client";

import { useState } from "react";
import { X, Sparkles, CheckCircle, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

interface WrapUpData {
  executiveSummary: string;
  delivered: string[];
  timelineAnalysis: string;
  completionRate: string;
  highlights: string[];
  improvements: string[];
}

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget?: number | null;
  goals?: string | null;
  tasks: { title: string; status: string; estimatedHours?: number | null }[];
}

interface Props {
  campaign: Campaign;
  onClose: () => void;
}

export function WrapUpReportModal({ campaign, onClose }: Props) {
  const [report, setReport] = useState<WrapUpData | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/campaign-wrapup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today,
          campaign: {
            name: campaign.name,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            budget: campaign.budget,
            goals: campaign.goals,
          },
          tasks: campaign.tasks,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setReport(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const lines = [
      `CAMPAIGN WRAP-UP REPORT`,
      `${campaign.name}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      ``,
      `EXECUTIVE SUMMARY`,
      report.executiveSummary,
      ``,
      `WHAT WAS DELIVERED`,
      ...report.delivered.map((d) => `• ${d}`),
      ``,
      `TIMELINE`,
      report.timelineAnalysis,
      ``,
      `COMPLETION RATE`,
      report.completionRate,
      ``,
      `HIGHLIGHTS`,
      ...report.highlights.map((h) => `• ${h}`),
      ``,
      `AREAS FOR IMPROVEMENT`,
      ...report.improvements.map((i) => `• ${i}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.name.replace(/\s+/g, "_")}_WrapUp.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">Campaign Wrap-Up Report</h2>
              <p className="text-[11px] text-muted-foreground">{campaign.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!report ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <TrendingUp className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-[13px] text-muted-foreground mb-1">
              Generate a comprehensive wrap-up report for <span className="font-semibold text-foreground">{campaign.name}</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mb-5">
              Includes what was delivered, timeline analysis, highlights, and recommendations.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Generating report…" : "Generate Wrap-Up Report"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Executive Summary */}
              <div className="p-4 bg-muted/40 rounded-xl">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Executive Summary</p>
                <p className="text-[13px] text-foreground leading-relaxed">{report.executiveSummary}</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-[11px] text-blue-600 font-semibold mb-0.5">Completion</p>
                  <p className="text-[13px] font-semibold text-foreground">{report.completionRate}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-0.5">Timeline</p>
                  <p className="text-[13px] font-semibold text-foreground">{report.timelineAnalysis}</p>
                </div>
              </div>

              {/* Delivered */}
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  What Was Delivered
                </p>
                <ul className="space-y-1.5">
                  {report.delivered.map((item, i) => (
                    <li key={i} className="text-[12px] text-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Highlights */}
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  Highlights
                </p>
                <ul className="space-y-1.5">
                  {report.highlights.map((item, i) => (
                    <li key={i} className="text-[12px] text-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  Areas for Improvement
                </p>
                <ul className="space-y-1.5">
                  {report.improvements.map((item, i) => (
                    <li key={i} className="text-[12px] text-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 text-[12px] text-emerald-600 hover:text-emerald-700 disabled:opacity-50 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button onClick={onClose} className="px-3 py-1.5 text-[12px] bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl font-medium transition-colors">
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
