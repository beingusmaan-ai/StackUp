"use client";

import { useState } from "react";
import { Sparkles, Scale, FileText, BarChart2 } from "lucide-react";
import { WorkloadBalancerModal } from "./WorkloadBalancerModal";
import { TeamDigestModal } from "./TeamDigestModal";
import { CapacityPlannerModal } from "./CapacityPlannerModal";

export interface TeamMemberStat {
  id: string;
  name: string;
  role: string;
  marketingRole: string | null;
  assigned: number;
  completed: number;
  delayed: number;
  rate: number;
}

interface Props {
  members: TeamMemberStat[];
}

type ActiveModal = "workload" | "digest" | "capacity" | null;

export function TeamAIPanel({ members }: Props) {
  const [active, setActive] = useState<ActiveModal>(null);

  if (members.length < 2) return null;

  return (
    <>
      <div className="flex items-center gap-2 mb-5 px-3 py-2.5 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-800 rounded-xl">
        <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-violet-600 mr-1">AI Tools</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActive("workload")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-[11px] font-medium hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
          >
            <Scale className="w-3 h-3" />
            Workload Balancer
          </button>
          <button
            onClick={() => setActive("digest")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-[11px] font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Team Digest
          </button>
          <button
            onClick={() => setActive("capacity")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-[11px] font-medium hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
          >
            <BarChart2 className="w-3 h-3" />
            Capacity Planner
          </button>
        </div>
      </div>

      {active === "workload" && (
        <WorkloadBalancerModal members={members} onClose={() => setActive(null)} />
      )}
      {active === "digest" && (
        <TeamDigestModal members={members} onClose={() => setActive(null)} />
      )}
      {active === "capacity" && (
        <CapacityPlannerModal members={members} onClose={() => setActive(null)} />
      )}
    </>
  );
}
