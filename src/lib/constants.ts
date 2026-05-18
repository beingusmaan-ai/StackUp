import { TaskStatus, Priority, CampaignStatus } from "@prisma/client";

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: "TODO", label: "To Do", color: "bg-slate-100 text-slate-700" },
  { value: "ASSIGNED", label: "Assigned", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { value: "WAITING_APPROVAL", label: "Waiting Approval", color: "bg-purple-100 text-purple-700" },
  { value: "REVISION_REQUIRED", label: "Revision Required", color: "bg-orange-100 text-orange-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "BLOCKED", label: "Blocked", color: "bg-red-100 text-red-700" },
];

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-600" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-600" },
  { value: "ACTIVE", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "PAUSED", label: "Paused", color: "bg-yellow-100 text-yellow-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-blue-100 text-blue-700" },
  { value: "ARCHIVED", label: "Archived", color: "bg-slate-100 text-slate-500" },
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
  { href: "/campaigns", label: "Campaigns", icon: "Megaphone" },
  { href: "/calendar", label: "Calendar", icon: "Calendar" },
  { href: "/team", label: "Team", icon: "Users" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];
