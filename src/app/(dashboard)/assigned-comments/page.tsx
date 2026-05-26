"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, Filter, ChevronDown, CheckCheck, CalendarDays } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";

const DAY_OPTIONS = [
  { label: "Last 7 Days",  value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 180 Days",value: 180 },
];

type Author = { id: string; name: string; image?: string | null };
type TaskInfo = {
  id: string;
  title: string;
  status: string;
  priority: string;
  campaign: { name: string } | null;
  assignees: { user: Author }[];
};
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  task: TaskInfo;
  replies: { id: string; content: string; author: Author; createdAt: string }[];
};

export default function AssignedCommentsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tab, setTab] = useState<"assigned" | "delegated">("assigned");
  const [resolved, setResolved] = useState(false);
  const [days, setDays] = useState(90);
  const [showDaysMenu, setShowDaysMenu] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["assigned-comments", tab, resolved, days],
    queryFn: async () => {
      const res = await fetch(`/api/assigned-comments?tab=${tab}&resolved=${resolved}&days=${days}`);
      return res.json();
    },
    enabled: !!session,
  });

  const comments: Comment[] = data?.data || [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top tabs */}
      <div className="flex-shrink-0 border-b border-border px-6">
        <div className="flex gap-1">
          {(["assigned", "delegated"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-[#e8170b] text-[#e8170b]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "assigned" ? "Assigned to me" : "Delegated by me"}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>

        <button
          onClick={() => setResolved((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
            resolved
              ? "border-[#e8170b] bg-[#e8170b]/10 text-[#e8170b]"
              : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Resolved
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDaysMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#4169e1]" />
            {DAY_OPTIONS.find((d) => d.value === days)?.label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDaysMenu && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-background border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              {DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDays(opt.value); setShowDaysMenu(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted",
                    days === opt.value ? "text-[#e8170b] font-medium" : "text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No comments found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {tab === "assigned"
                ? "No comments on tasks assigned to you in this period"
                : "No comments on tasks you delegated in this period"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/tasks?task=${c.task.id}`)}
                className="flex gap-4 px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors group"
              >
                <UserAvatar name={c.author.name} image={c.author.image} size="md" />

                <div className="flex-1 min-w-0">
                  {/* Task info */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                      {c.task.title}
                    </span>
                    {c.task.campaign && (
                      <span className="text-[10px] bg-[#e8170b]/10 text-[#e8170b] px-1.5 py-0.5 rounded-full shrink-0">
                        {c.task.campaign.name}
                      </span>
                    )}
                    <StatusBadge status={c.task.status} />
                    <PriorityBadge priority={c.task.priority} />
                  </div>

                  {/* Comment */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium text-foreground shrink-0">{c.author.name}:</span>
                    <p className="text-xs text-muted-foreground truncate">{c.content}</p>
                  </div>

                  {/* Replies preview */}
                  {c.replies.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {[...new Map(c.replies.map((r) => [r.author.id, r.author])).values()].slice(0, 3).map((a) => (
                          <UserAvatar key={a.id} name={a.name} image={a.image} size="xs" />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {c.replies.length} {c.replies.length === 1 ? "reply" : "replies"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</p>
                  <span className="text-xs text-[#e8170b] font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                    View task →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
