import {
  User,
  Task,
  Campaign,
  TaskComment,
  TaskAttachment,
  TaskActivity,
  ApprovalRequest,
  Notification,
  Role,
  TaskStatus,
  Priority,
  CampaignStatus,
  MarketingRole,
} from "@prisma/client";

export type {
  User,
  Task,
  Campaign,
  TaskComment,
  TaskAttachment,
  TaskActivity,
  ApprovalRequest,
  Notification,
  Role,
  TaskStatus,
  Priority,
  CampaignStatus,
  MarketingRole,
};

export type TaskWithRelations = Task & {
  assignees: { user: User; assignedAt: Date }[];
  comments: (TaskComment & { author: User })[];
  attachments: TaskAttachment[];
  activityLog: (TaskActivity & { actor: User })[];
  createdBy: User;
  campaign?: Campaign | null;
  subTasks: Task[];
  approvalRequests: ApprovalRequest[];
};

export type CampaignWithTasks = Campaign & {
  owner: User;
  tasks: Task[];
  _count: { tasks: number };
};

export type DashboardMetrics = {
  totalTasks: number;
  tasksDueToday: number;
  overdueTasks: number;
  completedThisWeek: number;
  activeCampaigns: number;
  tasksByStatus: { status: string; count: number }[];
  teamPerformance: {
    user: User;
    assigned: number;
    completed: number;
    delayed: number;
    completionRate: number;
  }[];
  recentActivity: (TaskActivity & { actor: User; task: Task })[];
  campaignProgress: {
    campaign: Campaign & { owner: User };
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }[];
};

export type KanbanColumn = {
  id: TaskStatus;
  title: string;
  tasks: TaskWithRelations[];
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To Do",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_APPROVAL: "Waiting Approval",
  REVISION_REQUIRED: "Revision Required",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const MARKETING_ROLE_LABELS: Record<MarketingRole, string> = {
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  SEO_SPECIALIST: "SEO Specialist",
  PERFORMANCE_MARKETER: "Performance Marketer",
  CRM_EMAIL_MARKETER: "CRM/Email Marketer",
  MARKETING_MANAGER: "Marketing Manager",
};
