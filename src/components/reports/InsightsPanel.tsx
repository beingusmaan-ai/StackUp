import { AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  type: "warning" | "info";
  text: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-[13px] font-semibold text-foreground mb-3">Manager Insights</h3>
        <p className="text-[12px] text-muted-foreground">No insights at this time. Team is running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-[13px] font-semibold text-foreground mb-3">Manager Insights</h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 px-3 py-2.5 rounded-md text-[12px]",
              insight.type === "warning"
                ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
            )}
          >
            {insight.type === "warning"
              ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              : <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
