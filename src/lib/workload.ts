// Shared types
export interface TaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  estimatedHours: number | null;
  taskType: string | null;
  campaign: { id: string; name: string } | null;
}

export interface UserWorkload {
  id: string;
  name: string;
  email: string;
  marketingRole: string | null;
  department: string | null;
  image: string | null;
  weeklyCapacity: number;
  activeTasks: number;
  overdueTasks: number;
  workloadScore: number;
  capacityUsage: number; // percentage
  status: WorkloadStatus;
  remainingPoints: number;
  tasks: TaskItem[];
}

export interface CampaignWorkload {
  id: string;
  name: string;
  workloadScore: number;
  taskCount: number;
}

export interface WorkloadInsight {
  type: "warning" | "suggestion";
  message: string;
  userId?: string;
  targetUserId?: string;
}

export interface WorkloadData {
  users: UserWorkload[];
  campaigns: CampaignWorkload[];
  insights: WorkloadInsight[];
  summary: {
    totalCapacity: number;
    activeWorkload: number;
    overloadedCount: number;
    availableCapacity: number;
    delayedTaskRisk: number;
  };
}

// Constants
export const PRIORITY_POINTS: Record<string, number> = {
  LOW: 5, MEDIUM: 10, HIGH: 20, URGENT: 30,
};

export const ROLE_CAPACITY: Record<string, number> = {
  MARKETING_MANAGER: 120,
  GRAPHIC_DESIGNER: 100,
  CONTENT_WRITER: 90,
  SEO_SPECIALIST: 110,
  SOCIAL_MEDIA_MANAGER: 90,
  VIDEO_EDITOR: 80,
  ADS_MANAGER: 120,
};

export const DEFAULT_CAPACITY = 80;

export const ACTIVE_STATUSES = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED", "BLOCKED"];

export type WorkloadStatus = "healthy" | "busy" | "high_load" | "overloaded";

export const STATUS_CONFIG: Record<WorkloadStatus, {
  label: string; color: string; bgClass: string; badgeBg: string; textClass: string;
}> = {
  healthy:    { label: "Healthy",    color: "#10b981", bgClass: "bg-emerald-500", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400", textClass: "text-emerald-600 dark:text-emerald-400" },
  busy:       { label: "Busy",       color: "#f59e0b", bgClass: "bg-amber-500",   badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",   textClass: "text-amber-600 dark:text-amber-400" },
  high_load:  { label: "High Load",  color: "#f97316", bgClass: "bg-orange-500",  badgeBg: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",  textClass: "text-orange-600 dark:text-orange-400" },
  overloaded: { label: "Overloaded", color: "#e8170b", bgClass: "bg-[#e8170b]",   badgeBg: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",   textClass: "text-[#e8170b]" },
};

// Utility functions
export function resolveCapacity(marketingRole: string | null, storedCapacity?: number): number {
  if (storedCapacity && storedCapacity > 0) return storedCapacity;
  return (marketingRole && ROLE_CAPACITY[marketingRole]) || DEFAULT_CAPACITY;
}

export function computeWorkloadStatus(usage: number): WorkloadStatus {
  if (usage > 100) return "overloaded";
  if (usage > 80) return "high_load";
  if (usage > 50) return "busy";
  return "healthy";
}

export function formatRole(marketingRole: string | null): string {
  if (!marketingRole) return "Team Member";
  return marketingRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
