"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, CheckCircle, MessageCircle, AlertTriangle, Megaphone, ChevronRight } from "lucide-react";
import { formatRelative, cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const TYPE_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  TASK_ASSIGNED: { icon: CheckCircle, color: "text-[#4169e1]" },
  TASK_STATUS_CHANGED: { icon: CheckCircle, color: "text-yellow-500" },
  TASK_COMMENT: { icon: MessageCircle, color: "text-purple-500" },
  TASK_DUE_SOON: { icon: AlertTriangle, color: "text-orange-500" },
  TASK_OVERDUE: { icon: AlertTriangle, color: "text-red-500" },
  APPROVAL_REQUESTED: { icon: CheckCheck, color: "text-[#e8170b]" },
  APPROVAL_DECIDED: { icon: CheckCheck, color: "text-green-500" },
  REVISION_REQUESTED: { icon: AlertTriangle, color: "text-orange-500" },
  TASK_COMPLETED: { icon: CheckCircle, color: "text-green-500" },
  CAMPAIGN_UPDATED: { icon: Megaphone, color: "text-purple-500" },
  SYSTEM: { icon: Bell, color: "text-slate-500" },
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  taskId?: string | null;
  task?: { id: string; title: string } | null;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=50");
      return res.json();
    },
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });

  function handleClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.taskId) {
      router.push(`/tasks?task=${n.taskId}`);
    }
  }

  const notifications: Notification[] = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
        actions={
          unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )
        }
      />

      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const config = TYPE_ICON[n.type] || TYPE_ICON.SYSTEM;
            const Icon = config.icon;
            const isClickable = !!n.taskId;

            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex items-start gap-4 p-4 transition-colors",
                  !n.isRead && "bg-[#e8170b]/[0.03]",
                  isClickable && "cursor-pointer hover:bg-muted/40 group"
                )}
              >
                <div className={cn("mt-0.5 p-2 rounded-xl bg-muted flex-shrink-0", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#e8170b]" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                    {isClickable && (
                      <span className="text-xs text-[#e8170b] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        View task <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
