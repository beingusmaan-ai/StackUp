import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { Megaphone } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  endDate: string | Date;
  status: string;
  owner: { name: string };
}

interface CampaignProgressChartProps {
  data: {
    campaign: Campaign;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }[];
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE:    "bg-emerald-500",
  DRAFT:     "bg-gray-400",
  PAUSED:    "bg-amber-500",
  COMPLETED: "bg-blue-500",
  ARCHIVED:  "bg-gray-400",
};

export function CampaignProgressChart({ data }: CampaignProgressChartProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">Project Progress</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{data.length} active projects</p>
        </div>
        <Link
          href="/campaigns"
          className="text-[11px] text-[#5c52ed] dark:text-[#e8170b] font-semibold hover:opacity-80 transition-opacity"
        >
          + View All
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <Megaphone className="w-10 h-10 text-muted-foreground opacity-20" />
          <p className="text-[12px] text-muted-foreground">No active projects</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {data.map((d) => (
            <Link
              key={d.campaign.id}
              href={`/campaigns/${d.campaign.id}`}
              className="bg-muted/40 hover:bg-muted/70 rounded-xl p-3.5 transition-colors block"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5", STATUS_DOT[d.campaign.status] ?? "bg-gray-400")} />
                  <span className="text-[12px] font-semibold text-foreground leading-tight line-clamp-1">{d.campaign.name}</span>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground mb-2.5">
                {d.completedTasks}/{d.totalTasks} tasks · {d.campaign.owner.name}
              </p>

              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    d.progress >= 80 ? "bg-emerald-500" : d.progress >= 50 ? "bg-amber-500" : "bg-[#e8170b]"
                  )}
                  style={{ width: `${d.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Due {formatDate(d.campaign.endDate)}</span>
                <span className={cn(
                  "text-[11px] font-bold",
                  d.progress >= 80 ? "text-emerald-600" : d.progress >= 50 ? "text-amber-600" : "text-[#e8170b]"
                )}>{d.progress}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
