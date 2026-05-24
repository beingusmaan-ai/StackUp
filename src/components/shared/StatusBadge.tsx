import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-[#a0a0b0]",
  ASSIGNED: "bg-[#4169e1]",
  IN_PROGRESS: "bg-[#f59e0b]",
  WAITING_APPROVAL: "bg-[#8b5cf6]",
  REVISION_REQUIRED: "bg-[#f97316]",
  COMPLETED: "bg-[#10b981]",
  BLOCKED: "bg-[#ef4444]",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_APPROVAL: "Waiting Approval",
  REVISION_REQUIRED: "Revision Required",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

const STATUS_TEXT: Record<string, string> = {
  TODO: "text-[#a0a0b0]",
  ASSIGNED: "text-[#4169e1]",
  IN_PROGRESS: "text-[#f59e0b]",
  WAITING_APPROVAL: "text-[#8b5cf6]",
  REVISION_REQUIRED: "text-[#f97316]",
  COMPLETED: "text-[#10b981]",
  BLOCKED: "text-[#ef4444]",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-[#a0a0b0]",
  MEDIUM: "bg-[#4169e1]",
  HIGH: "bg-[#f97316]",
  URGENT: "bg-[#ef4444]",
};

const PRIORITY_TEXT: Record<string, string> = {
  LOW: "text-[#a0a0b0]",
  MEDIUM: "text-[#4169e1]",
  HIGH: "text-[#f97316]",
  URGENT: "text-[#ef4444]",
};

const CAMPAIGN_DOT: Record<string, string> = {
  DRAFT: "bg-[#a0a0b0]",
  ACTIVE: "bg-[#10b981]",
  PAUSED: "bg-[#f59e0b]",
  COMPLETED: "bg-[#4169e1]",
  ARCHIVED: "bg-[#a0a0b0]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_TEXT[status] ?? "text-muted-foreground", className)}>
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[status] ?? "bg-[#a0a0b0]")} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", PRIORITY_TEXT[priority] ?? "text-muted-foreground", className)}>
      <span className={cn("w-2 h-2 rounded-sm flex-shrink-0", PRIORITY_DOT[priority] ?? "bg-[#a0a0b0]")} />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function CampaignStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", CAMPAIGN_DOT[status] ?? "bg-[#a0a0b0]")} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
