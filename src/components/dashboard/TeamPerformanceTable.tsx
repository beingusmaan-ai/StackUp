import Link from "next/link";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { Users, ChevronRight } from "lucide-react";

interface TeamMember {
  user: { id: string; name: string; image?: string | null; marketingRole?: string | null };
  assigned: number;
  completed: number;
  delayed: number;
  completionRate: number;
}

export function TeamPerformanceTable({ data }: { data: TeamMember[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">Team Performance</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{data.length} members</p>
        </div>
        <Link
          href="/team"
          className="text-[11px] text-[#5c52ed] dark:text-[#e8170b] font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center gap-2">
          <Users className="w-8 h-8 text-muted-foreground opacity-20" />
          <p className="text-[12px] text-muted-foreground">No team data</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {data.map((m) => (
            <div key={m.user.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <UserAvatar name={m.user.name} image={m.user.image} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{m.user.name}</p>
                {m.user.marketingRole && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {m.user.marketingRole.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-5 flex-shrink-0 text-center">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{m.assigned}</p>
                  <p className="text-[10px] text-muted-foreground">Tasks</p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-500">{m.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                {m.delayed > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-red-500">{m.delayed}</p>
                    <p className="text-[10px] text-muted-foreground">Late</p>
                  </div>
                )}
              </div>
              <div className="w-24 flex items-center gap-2 flex-shrink-0">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      m.completionRate >= 80 ? "bg-emerald-500" : m.completionRate >= 50 ? "bg-amber-500" : "bg-[#e8170b]"
                    )}
                    style={{ width: `${m.completionRate}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground w-7 text-right">{m.completionRate}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
