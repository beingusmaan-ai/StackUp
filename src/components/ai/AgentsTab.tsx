"use client";

import { useState } from "react";
import {
  Loader2, Play, Clipboard, ChevronDown, ChevronUp,
  ClipboardList, AlertTriangle, Calendar, BarChart2, Users, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";

interface AgentDef {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  Icon: React.ElementType;
  color: string;
  badge: string;
}

const AGENTS: AgentDef[] = [
  {
    id: "standup",
    name: "Standup Agent",
    description: "Auto-generates a daily standup report: what was completed, in progress, and blocked.",
    endpoint: "/api/ai/agents/standup",
    Icon: ClipboardList,
    color: "from-blue-500 to-blue-600",
    badge: "Daily",
  },
  {
    id: "deadline",
    name: "Deadline Agent",
    description: "Analyzes overdue, critical, and upcoming deadlines and gives prioritized action items.",
    endpoint: "/api/ai/agents/deadline",
    Icon: Calendar,
    color: "from-orange-500 to-red-500",
    badge: "Urgent",
  },
  {
    id: "sprint-planner",
    name: "Sprint Planner",
    description: "Creates a realistic 2-week sprint plan based on team capacity and task priorities.",
    endpoint: "/api/ai/agents/sprint-planner",
    Icon: BarChart2,
    color: "from-violet-500 to-purple-600",
    badge: "Planning",
  },
  {
    id: "risk-monitor",
    name: "Risk Monitor",
    description: "Identifies blocked tasks, overdue items, and projects at risk with mitigation steps.",
    endpoint: "/api/ai/agents/risk-monitor",
    Icon: AlertTriangle,
    color: "from-yellow-500 to-orange-500",
    badge: "Risk",
  },
  {
    id: "workload",
    name: "Workload Balancer",
    description: "Analyzes team load distribution and recommends how to rebalance task assignments.",
    endpoint: "/api/ai/agents/workload",
    Icon: Users,
    color: "from-teal-500 to-emerald-600",
    badge: "Team",
  },
  {
    id: "estimator",
    name: "Task Estimator",
    description: "Reviews unestimated tasks and suggests hour estimates based on priority and patterns.",
    endpoint: "/api/ai/agents/estimator",
    Icon: Timer,
    color: "from-pink-500 to-rose-600",
    badge: "Insights",
  },
];

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-[12.5px] leading-relaxed text-foreground">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-semibold mt-2.5 text-foreground">{line.slice(4)}</p>;
        if (line.startsWith("## "))  return <p key={i} className="font-bold mt-3 text-foreground">{line.slice(3)}</p>;
        if (line.startsWith("# "))   return <p key={i} className="font-bold text-sm mt-3">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <p key={i} className="pl-3 before:content-['•'] before:mr-1.5 before:text-[#e8170b]">{line.slice(2)}</p>;
        if (/^\d+\. /.test(line)) return <p key={i} className="pl-3">{line}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentDef }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { activeTeamId } = useUIStore();

  async function run() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setExpanded(false);

    try {
      const res = await fetch(agent.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeamId }),
      });
      const data = await res.json();
      const text = data.summary || data.error || "No response generated.";
      setResult(text);
      setExpanded(true);
    } catch {
      setResult("Failed to reach agent. Please try again.");
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl overflow-hidden transition-all",
      result ? "shadow-sm" : ""
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm", agent.color)}>
              <agent.Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-foreground">{agent.name}</p>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{agent.badge}</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{agent.description}</p>
            </div>
          </div>

          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#e8170b] to-[#ff4500] text-white text-[11.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex-shrink-0 shadow-sm shadow-[#e8170b]/20"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {result && (
        <div className="border-t border-border">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <span>Agent Output</span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(result); toast.success("Copied"); }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                title="Copy output"
              >
                <Clipboard className="w-3 h-3" />
              </button>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {expanded && (
            <div className="px-4 pb-4">
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/60">
                <MarkdownText text={result} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentsTab() {
  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="text-center mb-5">
        <p className="text-sm font-semibold text-foreground">AI Agents</p>
        <p className="text-[12px] text-muted-foreground mt-1">Automated intelligence for your team — one click to run.</p>
      </div>
      {AGENTS.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
