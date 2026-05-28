"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, List, LayoutGrid, Search, CalendarDays, ChevronDown, Sparkles, X, Megaphone } from "lucide-react";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { SmartBreakdownModal } from "@/components/tasks/SmartBreakdownModal";
import { MeetingNotesModal } from "@/components/tasks/MeetingNotesModal";
import { RiskFlagsPanel } from "@/components/tasks/RiskFlagsPanel";
import { DailyFocusPanel } from "@/components/tasks/DailyFocusPanel";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { CalendarView } from "@/components/tasks/CalendarView";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { useUIStore } from "@/store/ui-store";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { AvatarGroup } from "@/components/shared/UserAvatar";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  estimatedHours?: number | null;
  taskType?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  assignees: { user: { id: string; name: string; image?: string | null; marketingRole?: string | null } }[];
  createdBy: { id: string; name: string };
  requestingDepartment?: { id: string; name: string; color: string } | null;
  assignedDepartment?: { id: string; name: string; color: string } | null;
  _count: { comments: number; attachments: number };
};

interface TaskPrefill {
  title?: string;
  taskType?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: string;
  assigneeIds?: string[];
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-[#a0a0b0]",
  MEDIUM: "bg-[#4169e1]",
  HIGH: "bg-[#f97316]",
  URGENT: "bg-[#ef4444]",
};

type ViewMode = "list" | "kanban" | "calendar";
type TaskTab = "all" | "byProject" | "mine" | "incoming" | "outgoing";

interface ProjectGroup { label: string; id: string | null; tasks: Task[] }

function ByProjectView({
  groups,
  onTaskOpen,
  onAddTask,
}: {
  groups: ProjectGroup[];
  onTaskOpen: (id: string) => void;
  onAddTask: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-16 text-center">
        <p className="text-[13px] text-muted-foreground">No tasks found.</p>
        <button onClick={onAddTask} className="mt-3 text-[13px] text-[#e8170b] font-medium">
          + Create your first task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const key = group.id ?? "__none__";
        const open = !collapsed.has(key);
        const done = group.tasks.filter((t) => t.status === "COMPLETED").length;
        return (
          <div key={key} className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Project header */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0", !open && "-rotate-90")} />
              <Megaphone className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />
              <span className="text-[13px] font-semibold text-foreground flex-1 truncate">{group.label}</span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {done}/{group.tasks.length} done
              </span>
            </button>

            {/* Task rows */}
            {open && (
              <>
                <div className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-t border-b border-border bg-muted/40"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}>
                  <div className="px-4 py-2">Task</div>
                  <div className="px-3 py-2">Status</div>
                  <div className="px-3 py-2">Priority</div>
                  <div className="px-3 py-2">Assignees</div>
                  <div className="px-3 py-2">Due Date</div>
                </div>
                <div className="divide-y divide-border">
                  {group.tasks.map((task) => {
                    const overdue = isOverdue(task.dueDate) && task.status !== "COMPLETED";
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskOpen(task.id)}
                        className="grid items-center hover:bg-muted/30 cursor-pointer transition-colors group"
                        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
                      >
                        <div className="px-4 py-2.5 flex items-center gap-2.5 min-w-0">
                          <span className={cn("w-1.5 h-1.5 rounded-sm flex-shrink-0", PRIORITY_DOT[task.priority] ?? "bg-slate-300")} />
                          <div className="min-w-0">
                            <p className={cn(
                              "text-[13px] font-medium truncate group-hover:text-[#e8170b] transition-colors",
                              task.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {task.title}
                            </p>
                            {task.taskType && (
                              <p className="text-[11px] text-muted-foreground truncate">{task.taskType}</p>
                            )}
                          </div>
                        </div>
                        <div className="px-3 py-2.5"><StatusBadge status={task.status} /></div>
                        <div className="px-3 py-2.5"><PriorityBadge priority={task.priority} /></div>
                        <div className="px-3 py-2.5">
                          <AvatarGroup users={task.assignees.map((a) => a.user)} max={3} />
                        </div>
                        <div className={cn("px-3 py-2.5 text-[12px]", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {formatDate(task.dueDate)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TasksPage() {
  const { taskView, setTaskView, activeTeamId } = useUIStore();
  const { data: session } = useSession();
  const [taskTab, setTaskTab] = useState<TaskTab>("all");
  const [showForm, setShowForm] = useState(false);
  const [formPrefill, setFormPrefill] = useState<TaskPrefill | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const taskId = searchParams.get("task");
    const filter = searchParams.get("filter");
    const searchQ = searchParams.get("search");

    if (taskId) setSelectedTaskId(taskId);
    if (searchQ) setSearch(searchQ);

    if (filter === "today")     setDateFilter("today");
    if (filter === "overdue")   setDateFilter("overdue");
    if (filter === "completed") setStatusFilter("COMPLETED");

    if (taskId || filter || searchQ) router.replace("/tasks", { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<"" | "today" | "overdue" | "upcoming">("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [logTimeTask, setLogTimeTask] = useState<{ id: string; title: string; estimatedHours?: number | null } | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);

  // NL quick-add state
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [showNL, setShowNL] = useState(false);
  const nlInputRef = useRef<HTMLInputElement>(null);

  // NL filter state
  const [aiFilterText, setAiFilterText] = useState("");
  const [aiFilterActive, setAiFilterActive] = useState(false);
  const [aiFilterParsing, setAiFilterParsing] = useState(false);

  const queryClient = useQueryClient();
  const view = (taskView as ViewMode) || "list";

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns-list"],
    queryFn: () => fetch("/api/campaigns").then((r) => r.json()),
  });
  const campaigns: { id: string; name: string }[] = campaignsData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });
  const users: { id: string; name: string }[] = usersData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", search, statusFilter, priorityFilter, taskTab, activeTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (taskTab === "incoming" || taskTab === "outgoing") params.set("tab", taskTab);
      if (activeTeamId && taskTab !== "incoming" && taskTab !== "outgoing" && taskTab !== "byProject") params.set("teamId", activeTeamId);
      const res = await fetch(`/api/tasks?${params}`);
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error("Failed to update status"),
  });

  const tasks: Task[] = data?.data || [];

  const filteredTasks = tasks.filter((task) => {
    if (taskTab === "mine" && session?.user?.id) {
      if (!task.assignees.some((a) => a.user.id === session.user.id)) return false;
    }
    // incoming/outgoing already filtered by API
    if (assigneeFilter) {
      if (!task.assignees.some((a) => a.user.id === assigneeFilter)) return false;
    }
    if (!dateFilter) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (dateFilter === "today") return due !== null && due >= today && due < tomorrow;
    if (dateFilter === "overdue") return due !== null && due < today && task.status !== "COMPLETED";
    if (dateFilter === "upcoming") return due !== null && due >= tomorrow && task.status !== "COMPLETED";
    return true;
  });

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: string) => {
      statusMutation.mutate({ taskId, status: newStatus });
      if (newStatus === "COMPLETED") {
        const task = tasks.find((t) => t.id === taskId);
        if (task) setLogTimeTask({ id: task.id, title: task.title, estimatedHours: task.estimatedHours });
      }
    },
    [statusMutation, tasks]
  );

  // NL quick-add: parse natural language into prefill
  async function handleNLParse() {
    if (!nlText.trim()) return;
    setNlParsing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlText, users, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const d = json.data;
      setFormPrefill({
        title: d.title || nlText,
        taskType: d.taskType || "",
        priority: d.priority || "MEDIUM",
        dueDate: d.dueDate || "",
        estimatedHours: d.estimatedHours ? String(d.estimatedHours) : "",
        assigneeIds: d.assigneeId ? [d.assigneeId] : [],
      });
      setNlText("");
      setShowNL(false);
      setShowForm(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI parsing failed");
    } finally {
      setNlParsing(false);
    }
  }

  // NL filter: parse query into filters
  async function handleAIFilter() {
    if (!aiFilterText.trim()) return;
    setAiFilterParsing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ai/parse-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiFilterText, users, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const d = json.data;
      if (d.search) setSearch(d.search);
      if (d.status) setStatusFilter(d.status);
      if (d.priority) setPriorityFilter(d.priority);
      if (d.dateFilter) setDateFilter(d.dateFilter);
      if (d.assigneeId) setAssigneeFilter(d.assigneeId);
      setAiFilterActive(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI filter failed");
    } finally {
      setAiFilterParsing(false);
    }
  }

  function clearAIFilter() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setDateFilter("");
    setAssigneeFilter("");
    setAiFilterText("");
    setAiFilterActive(false);
  }

  // open NL input and focus
  function openNL() {
    setShowNL(true);
    setTimeout(() => nlInputRef.current?.focus(), 50);
  }

  const myTasks = tasks.filter((t) =>
    session?.user?.id ? t.assignees.some((a) => a.user.id === session.user.id) : false
  );

  const tasksByProject = useMemo(() => {
    const groups = new Map<string, { label: string; id: string | null; tasks: Task[] }>();
    for (const task of filteredTasks) {
      const key = task.campaign?.id ?? "__none__";
      if (!groups.has(key)) {
        groups.set(key, { label: task.campaign?.name ?? "No Project", id: task.campaign?.id ?? null, tasks: [] });
      }
      groups.get(key)!.tasks.push(task);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.id === null ? 1 : b.id === null ? -1 : a.label.localeCompare(b.label)
    );
  }, [filteredTasks]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {filteredTasks.length}{filteredTasks.length !== tasks.length ? ` of ${tasks.length}` : ""} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNL}
            className="flex items-center gap-1.5 px-3 py-2 border border-violet-300 dark:border-violet-700 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-md text-[13px] font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Add
          </button>
          <button
            onClick={() => setShowMeetingNotes(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#e8170b]/30 text-[#e8170b] hover:bg-[#e8170b]/5 rounded-md text-[13px] font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            From Notes
          </button>
          <button
            onClick={() => setShowBreakdown(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-[13px] font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Breakdown
          </button>
          <button
            onClick={() => { setFormPrefill(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-md text-[13px] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* NL quick-add bar */}
      {showNL && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          <input
            ref={nlInputRef}
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNLParse()}
            placeholder='e.g. "Design Instagram banner for Ahmed due Friday high priority"'
            className="flex-1 bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={handleNLParse}
            disabled={nlParsing || !nlText.trim()}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors flex-shrink-0"
          >
            {nlParsing ? "Parsing…" : "Parse →"}
          </button>
          <button onClick={() => setShowNL(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {([
          { tab: "all", label: "All Tasks" },
          { tab: "byProject", label: "By Project" },
          { tab: "mine", label: "My Tasks" },
          { tab: "incoming", label: "Incoming Requests" },
          { tab: "outgoing", label: "Outgoing Requests" },
        ] as { tab: TaskTab; label: string }[]).map(({ tab, label }) => (
          <button
            key={tab}
            onClick={() => setTaskTab(tab)}
            className={cn(
              "px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
              taskTab === tab
                ? "border-[#e8170b] text-[#e8170b]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* AI filter search */}
        <div className={cn(
          "flex items-center gap-1.5 bg-card border rounded-md px-2.5 py-1.5 w-56 transition-colors",
          aiFilterActive ? "border-violet-400 dark:border-violet-600" : "border-border"
        )}>
          <Sparkles className={cn("w-3.5 h-3.5 flex-shrink-0 cursor-pointer", aiFilterActive ? "text-violet-500" : "text-muted-foreground hover:text-violet-500")}
            onClick={handleAIFilter}
          />
          <input
            placeholder={aiFilterActive ? "AI filter active…" : "Ask AI to filter…"}
            value={aiFilterText}
            onChange={(e) => setAiFilterText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAIFilter()}
            className="bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground w-full"
          />
          {aiFilterActive && (
            <button onClick={clearAIFilter} className="flex-shrink-0 text-violet-400 hover:text-violet-600">
              <X className="w-3 h-3" />
            </button>
          )}
          {aiFilterParsing && (
            <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2.5 py-1.5 w-44">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-[13px] outline-none text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-card border border-border rounded-md pl-2.5 pr-7 py-1.5 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer hover:border-[#e8170b]/40 transition-colors"
          >
            <option value="">Status</option>
            {["TODO","ASSIGNED","IN_PROGRESS","WAITING_APPROVAL","REVISION_REQUIRED","COMPLETED","BLOCKED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Priority */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="appearance-none bg-card border border-border rounded-md pl-2.5 pr-7 py-1.5 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer hover:border-[#e8170b]/40 transition-colors"
          >
            <option value="">Priority</option>
            {["LOW","MEDIUM","HIGH","URGENT"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Timeline */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as "" | "today" | "overdue" | "upcoming")}
            className={cn(
              "appearance-none bg-card border rounded-md pl-2.5 pr-7 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer transition-colors",
              dateFilter ? "border-[#e8170b]/60 text-foreground font-medium" : "border-border text-muted-foreground hover:border-[#e8170b]/40"
            )}
          >
            <option value="">Timeline</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* View switcher */}
        <div className="ml-auto flex items-center gap-0.5 bg-card border border-border rounded-md p-0.5">
          {([
            { mode: "list", icon: List },
            { mode: "kanban", icon: LayoutGrid },
            { mode: "calendar", icon: CalendarDays },
          ] as { mode: ViewMode; icon: React.ElementType }[]).map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setTaskView(mode)}
              className={cn(
                "p-1.5 rounded transition-colors",
                view === mode ? "bg-[#e8170b] text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Risk flags — always visible when risks exist */}
      <RiskFlagsPanel tasks={tasks} onTaskClick={setSelectedTaskId} />

      {/* Daily focus — only in My Tasks tab */}
      {taskTab === "mine" && (
        <DailyFocusPanel tasks={myTasks} onTaskClick={setSelectedTaskId} />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : taskTab === "byProject" ? (
        <ByProjectView
          groups={tasksByProject}
          onTaskOpen={setSelectedTaskId}
          onAddTask={() => { setFormPrefill(null); setShowForm(true); }}
        />
      ) : view === "kanban" ? (
        <TaskKanbanBoard tasks={filteredTasks} onTaskOpen={setSelectedTaskId} onStatusChange={handleStatusChange} />
      ) : view === "calendar" ? (
        <CalendarView tasks={filteredTasks.map((t) => ({ ...t, dueDate: t.dueDate ?? null }))} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/40"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
            <div className="px-4 py-2.5">Task</div>
            <div className="px-3 py-2.5">Status</div>
            <div className="px-3 py-2.5">Priority</div>
            <div className="px-3 py-2.5">Team</div>
            <div className="px-3 py-2.5">Assignees</div>
            <div className="px-3 py-2.5">Due Date</div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-[13px] text-muted-foreground">No tasks found.</p>
              <button
                onClick={() => { setFormPrefill(null); setShowForm(true); }}
                className="mt-3 text-[13px] text-[#e8170b] hover:text-violet-700 font-medium"
              >
                + Create your first task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task.dueDate) && task.status !== "COMPLETED";
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="grid items-center hover:bg-muted/30 cursor-pointer transition-colors group"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}
                  >
                    <div className="px-4 py-2.5 flex items-center gap-2.5 min-w-0">
                      <span className={cn("w-1.5 h-1.5 rounded-sm flex-shrink-0", PRIORITY_DOT[task.priority] ?? "bg-slate-300")} />
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[13px] font-medium truncate group-hover:text-[#e8170b] transition-colors",
                          task.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"
                        )}>
                          {task.title}
                        </p>
                        {task.taskType && (
                          <p className="text-[11px] text-muted-foreground truncate">{task.taskType}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-2.5"><StatusBadge status={task.status} /></div>
                    <div className="px-3 py-2.5"><PriorityBadge priority={task.priority} /></div>
                    <div className="px-3 py-2.5">
                      {task.assignedDepartment ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white truncate max-w-full"
                          style={{ backgroundColor: task.assignedDepartment.color }}
                        >
                          {task.assignedDepartment.name}
                        </span>
                      ) : task.campaign ? (
                        <span className="text-[11px] text-[#e8170b] dark:text-[#f87168] font-medium truncate block">
                          {task.campaign.name}
                        </span>
                      ) : null}
                      {task.requestingDepartment && task.assignedDepartment && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                          from {task.requestingDepartment.name}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <AvatarGroup users={task.assignees.map((a) => a.user)} max={3} />
                    </div>
                    <div className={cn("px-3 py-2.5 text-[12px]", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                      {formatDate(task.dueDate)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            onClick={() => { setFormPrefill(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-muted-foreground hover:text-[#e8170b] hover:bg-muted/30 cursor-pointer transition-colors border-t border-border"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </div>
        </div>
      )}

      {showForm && (
        <TaskForm
          onClose={() => { setShowForm(false); setFormPrefill(null); }}
          onSuccess={() => {
            setShowForm(false);
            setFormPrefill(null);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }}
          prefill={formPrefill}
        />
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
        />
      )}

      {logTimeTask && (
        <LogTimeModal
          taskId={logTimeTask.id}
          taskTitle={logTimeTask.title}
          estimatedHours={logTimeTask.estimatedHours}
          onClose={() => setLogTimeTask(null)}
        />
      )}

      {showMeetingNotes && (
        <MeetingNotesModal
          onClose={() => setShowMeetingNotes(false)}
          onTasksCreated={() => {
            setShowMeetingNotes(false);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }}
        />
      )}

      {showBreakdown && (
        <SmartBreakdownModal
          campaigns={campaigns}
          onClose={() => setShowBreakdown(false)}
          onTasksCreated={() => {
            setShowBreakdown(false);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }}
        />
      )}
    </div>
  );
}
