import Link from "next/link";
import { formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { CheckCircle, MessageCircle, RefreshCw, Plus, Activity, ChevronRight } from "lucide-react";

const ACTION_CONFIG: Record<string, { icon: typeof Plus; dot: string; label: string }> = {
  created:        { icon: Plus,          dot: "bg-blue-500",   label: "created" },
  status_changed: { icon: RefreshCw,     dot: "bg-amber-500",  label: "updated" },
  commented:      { icon: MessageCircle, dot: "bg-violet-500", label: "commented on" },
  completed:      { icon: CheckCircle,   dot: "bg-emerald-500", label: "completed" },
};

interface ActivityItem {
  id: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string | Date;
  actor: { name: string; image?: string | null };
  task: { id: string; title: string };
}

export function RecentActivity({ data }: { data: ActivityItem[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">Recent Activity</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Latest updates</p>
        </div>
        <Link
          href="/notifications"
          className="text-[11px] text-[#5c52ed] dark:text-[#e8170b] font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2">
          <Activity className="w-8 h-8 text-muted-foreground opacity-20" />
          <p className="text-[12px] text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="p-4">
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {data.map((a) => {
                const config = ACTION_CONFIG[a.action] ?? ACTION_CONFIG.status_changed;
                return (
                  <div key={a.id} className="flex items-start gap-3 relative">
                    <div className={`w-[9px] h-[9px] rounded-full flex-shrink-0 mt-1.5 z-10 ml-[11px] -translate-x-full ${config.dot}`} />
                    <div className="flex-1 min-w-0 -ml-1">
                      <div className="flex items-start gap-2">
                        <UserAvatar name={a.actor.name} image={a.actor.image} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-foreground leading-snug">
                            <span className="font-semibold">{a.actor.name}</span>
                            {" "}<span className="text-muted-foreground">{config.label}</span>{" "}
                            <span className="font-medium">"{a.task.title}"</span>
                          </p>
                          {a.action === "status_changed" && a.fromValue && a.toValue && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {a.fromValue.replace(/_/g, " ")} → {a.toValue.replace(/_/g, " ")}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
