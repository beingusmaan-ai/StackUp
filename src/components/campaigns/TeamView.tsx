"use client";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Flag, Circle, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignees: { user: { id: string; name: string; image?: string | null } }[];
  _count: { subTasks: number; comments: number };
}

interface TeamViewProps {
  tasks: TeamTask[];
  onTaskClick: (id: string) => void;
}

const STATUS_ICON: Record<string, { Icon: React.ElementType; cls: string }> = {
  TODO:               { Icon: Circle,       cls: "text-slate-400" },
  ASSIGNED:           { Icon: Circle,       cls: "text-purple-400" },
  IN_PROGRESS:        { Icon: Clock,        cls: "text-blue-500" },
  WAITING_APPROVAL:   { Icon: CheckCircle2, cls: "text-sky-400" },
  REVISION_REQUIRED:  { Icon: AlertCircle,  cls: "text-orange-500" },
  COMPLETED:          { Icon: CheckCircle2, cls: "text-emerald-500" },
  BLOCKED:            { Icon: XCircle,      cls: "text-red-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgent", color: "text-red-500" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  MEDIUM: { label: "Medium", color: "text-blue-400" },
  LOW:    { label: "Low",    color: "text-slate-400" },
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  WAITING_APPROVAL: "Waiting Approval", REVISION_REQUIRED: "Revision",
  COMPLETED: "Completed", BLOCKED: "Blocked",
};

function isOverdue(dueDate?: string | null) {
  return !!dueDate && new Date(dueDate) < new Date();
}

export function TeamView({ tasks, onTaskClick }: TeamViewProps) {
  // Build member map — each unique user gets a swimlane
  const memberMap = new Map<string, { id: string; name: string; image?: string | null; tasks: TeamTask[] }>();

  tasks.forEach((task) => {
    if (task.assignees.length === 0) {
      const key = "__unassigned__";
      if (!memberMap.has(key)) memberMap.set(key, { id: key, name: "Unassigned", tasks: [] });
      memberMap.get(key)!.tasks.push(task);
    } else {
      task.assignees.forEach(({ user }) => {
        if (!memberMap.has(user.id)) memberMap.set(user.id, { ...user, tasks: [] });
        memberMap.get(user.id)!.tasks.push(task);
      });
    }
  });

  const members = Array.from(memberMap.values()).sort((a, b) =>
    a.id === "__unassigned__" ? 1 : b.id === "__unassigned__" ? -1 : b.tasks.length - a.tasks.length
  );

  if (members.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
        <Circle className="w-10 h-10 mb-3 opacity-20" />
        <p>No tasks assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {members.map((member) => {
        const completed  = member.tasks.filter((t) => t.status === "COMPLETED").length;
        const blocked    = member.tasks.filter((t) => t.status === "BLOCKED").length;
        const inProgress = member.tasks.filter((t) => t.status === "IN_PROGRESS").length;
        const overdue    = member.tasks.filter((t) => isOverdue(t.dueDate) && t.status !== "COMPLETED").length;

        return (
          <div key={member.id} className="border-b border-border last:border-0">
            {/* Member header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
              {member.id === "__unassigned__" ? (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                  <Circle className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : (
                <UserAvatar name={member.name} image={member.image} size="md" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{member.name}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>{member.tasks.length} tasks</span>
                  {inProgress > 0 && <span className="text-blue-500">{inProgress} in progress</span>}
                  {completed > 0  && <span className="text-emerald-500">{completed} done</span>}
                  {blocked > 0    && <span className="text-red-500">{blocked} blocked</span>}
                  {overdue > 0    && <span className="text-red-500 font-semibold">{overdue} overdue</span>}
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: member.tasks.length > 0 ? `${Math.round((completed / member.tasks.length) * 100)}%` : "0%" }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground w-8 text-right flex-shrink-0">
                {member.tasks.length > 0 ? `${Math.round((completed / member.tasks.length) * 100)}%` : "—"}
              </span>
            </div>

            {/* Task rows */}
            <div>
              {member.tasks.map((task) => {
                const statusCfg = STATUS_ICON[task.status] ?? STATUS_ICON["TODO"];
                const priCfg    = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG["MEDIUM"];
                const over      = isOverdue(task.dueDate) && task.status !== "COMPLETED";

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors border-b border-border/30 last:border-0 group"
                  >
                    <statusCfg.Icon className={cn("w-3.5 h-3.5 flex-shrink-0", statusCfg.cls)} />
                    <p className="flex-1 min-w-0 text-sm truncate">{task.title}</p>
                    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    <div className="flex items-center gap-1 w-20 flex-shrink-0">
                      <Flag className={cn("w-3 h-3 fill-current flex-shrink-0", priCfg.color)} />
                      <span className={cn("text-xs", priCfg.color)}>{priCfg.label}</span>
                    </div>
                    <span className={cn("text-xs w-20 text-right flex-shrink-0", over ? "text-red-500 font-medium" : "text-muted-foreground")}>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
