"use client";

import { formatDate, isOverdue, cn } from "@/lib/utils";
import { AvatarGroup } from "@/components/shared/UserAvatar";
import { Calendar, MessageCircle, Paperclip } from "lucide-react";

const PRIORITY_BAR: Record<string, string> = {
  LOW: "bg-[#a0a0b0]",
  MEDIUM: "bg-[#4169e1]",
  HIGH: "bg-[#f97316]",
  URGENT: "bg-[#ef4444]",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "text-[#a0a0b0]",
  MEDIUM: "text-[#4169e1]",
  HIGH: "text-[#f97316]",
  URGENT: "text-[#ef4444]",
};

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: Date | string | null;
    campaign?: { name: string } | null;
    assignees: { user: { name: string; image?: string | null } }[];
    assignedDepartment?: { name: string; color: string } | null;
    requestingDepartment?: { name: string; color: string } | null;
    _count?: { comments?: number; attachments?: number };
  };
  onClick?: () => void;
  compact?: boolean;
}

export function TaskCard({ task, onClick, compact = false }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && task.status !== "COMPLETED";

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-md p-3 hover:shadow-sm hover:border-[#e8170b]/40 transition-all cursor-pointer group relative overflow-hidden"
      )}
    >
      {/* Priority left border */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", PRIORITY_BAR[task.priority] ?? "bg-slate-300")} />

      <div className="pl-1">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {task.assignedDepartment && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: task.assignedDepartment.color }}
            >
              {task.assignedDepartment.name}
            </span>
          )}
          {task.requestingDepartment && task.assignedDepartment && (
            <span className="text-[9px] text-muted-foreground">
              ← {task.requestingDepartment.name}
            </span>
          )}
          {task.campaign && !task.assignedDepartment && (
            <span className="inline-block text-[10px] font-medium text-[#e8170b]">
              {task.campaign.name}
            </span>
          )}
        </div>

        <h4 className={cn(
          "font-medium text-[13px] leading-snug group-hover:text-[#e8170b] transition-colors line-clamp-2",
          task.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"
        )}>
          {task.title}
        </h4>

        {!compact && task.description && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            {task.dueDate && (
              <span className={cn("flex items-center gap-1", overdue ? "text-red-500 font-medium" : "")}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task._count?.comments ? (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {task._count.comments}
              </span>
            ) : null}
            {task._count?.attachments ? (
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {task._count.attachments}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", PRIORITY_LABEL[task.priority])}>
              {task.priority === "URGENT" ? "!" : task.priority.charAt(0)}
            </span>
            {task.assignees.length > 0 && (
              <AvatarGroup users={task.assignees.map((a) => a.user)} max={3} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
