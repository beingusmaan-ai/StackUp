// String union types replacing Prisma enums (SQLite compatibility)
export type Role = "ADMIN" | "TEAM_LEAD" | "TEAM_MEMBER";
export type MarketingRole =
  | "CONTENT_WRITER" | "GRAPHIC_DESIGNER" | "VIDEO_EDITOR"
  | "SOCIAL_MEDIA_MANAGER" | "SEO_SPECIALIST" | "PERFORMANCE_MARKETER"
  | "CRM_EMAIL_MARKETER" | "MARKETING_MANAGER";
export type TaskStatus =
  | "TODO" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_APPROVAL"
  | "REVISION_REQUIRED" | "COMPLETED" | "BLOCKED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REVISION_REQUIRED";
export type NotificationType =
  | "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "TASK_COMMENT" | "TASK_DUE_SOON"
  | "TASK_OVERDUE" | "APPROVAL_REQUESTED" | "APPROVAL_DECIDED" | "REVISION_REQUESTED"
  | "TASK_COMPLETED" | "CAMPAIGN_UPDATED" | "SYSTEM";

// Base model types (matching Prisma generated shape)
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  role: string;
  marketingRole?: string | null;
  department?: string | null;
  isActive: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  taskType?: string | null;
  status: string;
  priority: string;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  position: number;
  campaignId?: string | null;
  parentTaskId?: string | null;
  createdById: string;
  approvedById?: string | null;
  requestingDepartmentId?: string | null;
  assignedDepartmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentMember {
  departmentId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  templateTasks?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate: Date;
  endDate: Date;
  budget?: number | null;
  goals?: string | null;
  ownerId: string;
  departmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: Date;
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  requesterId: string;
  deciderId?: string | null;
  status: string;
  message?: string | null;
  decisionNote?: string | null;
  decidedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  taskId?: string | null;
  createdAt: Date;
}

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
