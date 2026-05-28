"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Clock, Circle, CheckCircle2,
  XCircle, AlertCircle, Trash2, X, Flag, MessageSquare, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarGroup } from "@/components/shared/UserAvatar";
import { formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TaskUser {
  id: string;
  name: string;
  image?: string | null;
}

export interface GroupedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignees: { user: TaskUser }[];
  _count: { subTasks: number; comments: number };
  listName?: string; // shown in folder-view mode
}

interface TaskListGroupedProps {
  tasks: GroupedTask[];
  canManage: boolean;
  onTaskClick: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (status?: string) => void;
  deletingTaskId: string | null;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  Icon: React.ElementType;
  iconClass: string;
}> = {
  TODO:               { label: "TO DO",             badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",        Icon: Circle,       iconClass: "text-slate-400 dark:text-slate-500" },
  ASSIGNED:           { label: "ASSIGNED",           badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",  Icon: Circle,       iconClass: "text-purple-400" },
  IN_PROGRESS:        { label: "IN PROGRESS",        badgeClass: "bg-blue-600 text-white dark:bg-blue-700",                                   Icon: Clock,        iconClass: "text-blue-500" },
  WAITING_APPROVAL:   { label: "WAITING APPROVAL",   badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",             Icon: CheckCircle2, iconClass: "text-sky-400" },
  REVISION_REQUIRED:  { label: "REVISION REQUIRED",  badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300", Icon: AlertCircle,  iconClass: "text-orange-500" },
  COMPLETED:          { label: "COMPLETED",           badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", Icon: CheckCircle2, iconClass: "text-emerald-500" },
  BLOCKED:            { label: "BLOCKED",             badgeClass: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",             Icon: XCircle,      iconClass: "text-red-500" },
  CANCELLED:          { label: "CANCELLED",           badgeClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",        Icon: XCircle,      iconClass: "text-slate-400" },
};

const STATUS_ORDER = ["IN_PROGRESS", "ASSIGNED", "TODO", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED", "CANCELLED"];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgent", color: "text-red-500" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  MEDIUM: { label: "Medium", color: "text-blue-400" },
  LOW:    { label: "Low",    color: "text-slate-400" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// ── Column header row ──────────────────────────────────────────────────────────

function ColHeaders({ canManage }: { canManage: boolean }) {
  return (
    <div className="flex items-center h-8 text-[11px] font-medium text-muted-foreground/70 border-b border-border/40 select-none">
      <div className="w-8 flex-shrink-0" /> {/* checkbox + expand */}
      <div className="w-5 flex-shrink-0" /> {/* status icon */}
      <div className="flex-1 min-w-0 pl-1">Name</div>
      <div className="w-32 flex-shrink-0 text-center">Assignee</div>
      <div className="w-28 flex-shrink-0 text-center">Due date</div>
      <div className="w-28 flex-shrink-0">Priority</div>
      {canManage && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  selected,
  onSelect,
  onTaskClick,
  onDeleteTask,
  deletingTaskId,
  canManage,
}: {
  task: GroupedTask;
  selected: boolean;
  onSelect: (id: string, on: boolean) => void;
  onTaskClick: (id: string) => void;
  onDeleteTask: (id: string) => void;
  deletingTaskId: string | null;
  canManage: boolean;
}) {
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG["TODO"];
  const { Icon, iconClass } = cfg;
  const priCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG["MEDIUM"];
  const overdue = isOverdue(task.dueDate);

  return (
    <div
      className={cn(
        "flex items-center h-10 group cursor-pointer border-b border-border/30 transition-colors",
        selected ? "bg-[#e8170b]/5 dark:bg-[#e8170b]/10" : "hover:bg-muted/30"
      )}
      onClick={() => onTaskClick(task.id)}
    >
      {/* Checkbox */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(task.id, !selected); }}
          className={cn(
            "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer",
            selected
              ? "bg-[#e8170b] border-[#e8170b]"
              : "border-border opacity-0 group-hover:opacity-100 hover:border-[#e8170b]"
          )}
        >
          {selected && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>

      {/* Expand arrow (for subtasks) + status icon */}
      <div className="w-5 flex-shrink-0 flex items-center">
        {task._count.subTasks > 0 ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
        ) : null}
      </div>
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        <Icon className={cn("w-3.5 h-3.5", iconClass)} />
      </div>

      {/* Task name + badges */}
      <div className="flex-1 min-w-0 pl-1 flex items-center gap-2 pr-2">
        <span className="text-sm truncate">{task.title}</span>
        {task._count.subTasks > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
            <GitBranch className="w-2.5 h-2.5" />
            {task._count.subTasks}
          </span>
        )}
        {task._count.comments > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100">
            <MessageSquare className="w-2.5 h-2.5" />
            {task._count.comments}
          </span>
        )}
        {task.listName && (
          <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded flex-shrink-0 hidden group-hover:inline-flex">
            {task.listName}
          </span>
        )}
      </div>

      {/* Assignee */}
      <div className="w-32 flex-shrink-0 flex justify-center">
        <AvatarGroup users={task.assignees.map((a) => a.user)} max={3} />
      </div>

      {/* Due date */}
      <div className="w-28 flex-shrink-0 text-center">
        {task.dueDate ? (
          <span className={cn("text-xs", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}
          </span>
        ) : (
          <span className="text-muted-foreground/30 text-xs opacity-0 group-hover:opacity-100">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        <Flag className={cn("w-3 h-3 fill-current flex-shrink-0", priCfg.color)} />
        <span className={cn("text-xs", priCfg.color)}>{priCfg.label}</span>
      </div>

      {/* Delete button */}
      {canManage && (
        <div className="w-8 flex-shrink-0 flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
            disabled={deletingTaskId === task.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-muted-foreground disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Status group ───────────────────────────────────────────────────────────────

function StatusGroup({
  status,
  tasks,
  selectedIds,
  onSelect,
  onSelectGroup,
  onTaskClick,
  onDeleteTask,
  onAddTask,
  deletingTaskId,
  canManage,
}: {
  status: string;
  tasks: GroupedTask[];
  selectedIds: Set<string>;
  onSelect: (id: string, on: boolean) => void;
  onSelectGroup: (ids: string[], on: boolean) => void;
  onTaskClick: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (status: string) => void;
  deletingTaskId: string | null;
  canManage: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? { label: status, badgeClass: "bg-muted text-muted-foreground", Icon: Circle, iconClass: "text-muted-foreground" };

  const groupIds = tasks.map((t) => t.id);
  const allSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));
  const someSelected = groupIds.some((id) => selectedIds.has(id));

  function handleGroupCheckbox(e: React.MouseEvent) {
    e.stopPropagation();
    onSelectGroup(groupIds, !allSelected);
  }

  return (
    <div className="mb-1">
      {/* Status group header */}
      <div className="flex items-center gap-2 px-2 py-2 cursor-pointer select-none group/header" onClick={() => setCollapsed((v) => !v)}>
        {/* Group checkbox */}
        <div
          onClick={handleGroupCheckbox}
          className={cn(
            "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer",
            allSelected
              ? "bg-[#e8170b] border-[#e8170b]"
              : someSelected
              ? "bg-[#e8170b]/30 border-[#e8170b]"
              : "border-border opacity-0 group/header-hover:opacity-100"
          )}
          title={allSelected ? "Deselect all in group" : "Select all in group"}
        >
          {allSelected && (
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {someSelected && !allSelected && (
            <div className="w-1.5 h-0.5 bg-[#e8170b] rounded-full" />
          )}
        </div>

        <div className="text-muted-foreground/60 flex-shrink-0">
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide", cfg.badgeClass)}>
          <cfg.Icon className="w-3 h-3" />
          {cfg.label}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{tasks.length}</span>
      </div>

      {!collapsed && (
        <>
          <ColHeaders canManage={canManage} />
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onSelect={onSelect}
              onTaskClick={onTaskClick}
              onDeleteTask={onDeleteTask}
              deletingTaskId={deletingTaskId}
              canManage={canManage}
            />
          ))}
          {canManage && (
            <div
              className="flex items-center gap-1.5 h-9 px-8 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => onAddTask(status)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function TaskListGrouped({
  tasks,
  canManage,
  onTaskClick,
  onDeleteTask,
  onAddTask,
  deletingTaskId,
}: TaskListGroupedProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleSelect(id: string, on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleSelectGroup(ids: string[], on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => on ? next.add(id) : next.delete(id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Group tasks by status, preserving STATUS_ORDER
  const grouped = STATUS_ORDER.reduce<Record<string, GroupedTask[]>>((acc, s) => {
    const group = tasks.filter((t) => t.status === s);
    if (group.length > 0) acc[s] = group;
    return acc;
  }, {});
  // Any statuses not in STATUS_ORDER
  tasks.forEach((t) => {
    if (!grouped[t.status]) grouped[t.status] = [];
    if (!grouped[t.status].includes(t)) grouped[t.status].push(t);
  });

  const orderedStatuses = [
    ...STATUS_ORDER.filter((s) => grouped[s]),
    ...Object.keys(grouped).filter((s) => !STATUS_ORDER.includes(s)),
  ];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        <Circle className="w-10 h-10 mb-3 opacity-20" />
        <p>No tasks yet.</p>
        {canManage && (
          <button
            onClick={() => onAddTask()}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative">
      <div className="min-w-[600px]">
        {orderedStatuses.map((status) => (
          <StatusGroup
            key={status}
            status={status}
            tasks={grouped[status]}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectGroup={handleSelectGroup}
            onTaskClick={onTaskClick}
            onDeleteTask={onDeleteTask}
            onAddTask={onAddTask}
            deletingTaskId={deletingTaskId}
            canManage={canManage}
          />
        ))}
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl px-4 py-2.5 text-sm font-medium">
          <span className="flex items-center gap-1.5 mr-2">
            {selectedIds.size} Task{selectedIds.size > 1 ? "s" : ""} selected
            <button onClick={clearSelection} className="ml-1 hover:opacity-70 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          <div className="w-px h-4 bg-white/20" />
          <button className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs">
            Status
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs">
            Assignees
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs">
            Dates
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={() => {
              selectedIds.forEach((id) => onDeleteTask(id));
              clearSelection();
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
