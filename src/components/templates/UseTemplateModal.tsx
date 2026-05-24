"use client";

import { useState, useEffect, useRef } from "react";
import { X, Zap, Calendar, Target, User, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui-store";

const ROLE_LABELS: Record<string, string> = {
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  SEO_SPECIALIST: "SEO Specialist",
  PERFORMANCE_MARKETER: "Performance Marketer",
  CRM_EMAIL_MARKETER: "CRM/Email Marketer",
  MARKETING_MANAGER: "Marketing Manager",
  SALES_REP: "Sales Rep",
  SALES_MANAGER: "Sales Manager",
  ACCOUNT_MANAGER: "Account Manager",
  ACCOUNT_EXECUTIVE: "Account Executive",
  BUSINESS_DEVELOPMENT: "Business Development",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

interface EditableTask {
  _id: string; // local-only key
  templateTaskId?: string; // original id if from template
  title: string;
  assignedRole: string;
  priority: string;
  estimatedHours: string;
  dayOffset: string;
}

interface EditableGroup {
  name: string;
  tasks: EditableTask[];
}

interface TemplateTask {
  id: string;
  title: string;
  assignedRole?: string | null;
  priority: string;
  estimatedHours?: number | null;
  dayOffset?: number | null;
}

interface TemplateGroup {
  name: string;
  tasks: TemplateTask[];
}

interface Template {
  id: string;
  name: string;
  estimatedDays?: number | null;
  groups: TemplateGroup[];
}

interface UserRecord {
  id: string;
  name: string;
  marketingRole?: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface UseTemplateModalProps {
  template: Template;
  onClose: () => void;
  onSuccess: (campaignId: string | null) => void;
}

let _uid = 0;
function uid() {
  return `t${++_uid}-${Math.random().toString(36).slice(2, 6)}`;
}

function smartDatePreview(
  deadline: Date,
  idx: number,
  total: number,
  estimatedDays: number | null,
  dayOffset: string
): string {
  const d = new Date(deadline);
  const offset = dayOffset ? parseInt(dayOffset) : null;
  if (offset != null && !isNaN(offset)) {
    d.setDate(d.getDate() - offset);
  } else {
    const span = estimatedDays ?? Math.max(total * 2, 7);
    const daysBack = Math.round(((total - 1 - idx) / Math.max(total - 1, 1)) * span);
    d.setDate(d.getDate() - daysBack);
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toEditableGroups(groups: TemplateGroup[]): EditableGroup[] {
  return groups.map((g) => ({
    name: g.name,
    tasks: g.tasks.map((t) => ({
      _id: uid(),
      templateTaskId: t.id,
      title: t.title,
      assignedRole: t.assignedRole ?? "",
      priority: t.priority,
      estimatedHours: t.estimatedHours?.toString() ?? "",
      dayOffset: t.dayOffset?.toString() ?? "",
    })),
  }));
}

export function UseTemplateModal({ template, onClose, onSuccess }: UseTemplateModalProps) {
  const router = useRouter();
  const { activeTeamId } = useUIStore();
  const [step, setStep] = useState<"config" | "preview">("config");
  const [loading, setLoading] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);

  const [campaignMode, setCampaignMode] = useState<"existing" | "new">("existing");
  const [campaignId, setCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState(`${template.name} — Workflow`);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (template.estimatedDays ?? 30));
    return d.toISOString().split("T")[0];
  });
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});

  // Editable groups state — initialized from template, user can add/remove tasks
  const [editableGroups, setEditableGroups] = useState<EditableGroup[]>(() =>
    toEditableGroups(template.groups)
  );
  // Track which group is showing the "add task" input
  const [addingToGroup, setAddingToGroup] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

  const allTasks = editableGroups.flatMap((g) => g.tasks);
  const originalRoles = Array.from(
    new Set(template.groups.flatMap((g) => g.tasks.map((t) => t.assignedRole).filter(Boolean)))
  ) as string[];

  useEffect(() => {
    const campaignUrl = activeTeamId
      ? `/api/campaigns?departmentId=${activeTeamId}`
      : "/api/campaigns";
    const usersUrl = activeTeamId
      ? `/api/users?departmentId=${activeTeamId}`
      : "/api/users";
    Promise.all([
      fetch(campaignUrl).then((r) => r.json()),
      fetch(usersUrl).then((r) => r.json()),
    ]).then(([c, u]) => {
      const campaignList: Campaign[] = c.data || [];
      setCampaigns(campaignList);
      if (campaignList.length === 0) {
        setCampaignMode("new");
      } else {
        setCampaignId(campaignList[0].id);
      }
      const userList: UserRecord[] = u.data || [];
      setUsers(userList);
      const auto: Record<string, string> = {};
      originalRoles.forEach((role) => {
        const match = userList.find((u) => u.marketingRole === role);
        if (match) auto[role] = match.id;
      });
      setRoleAssignments(auto);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    if (addingToGroup !== null) newTaskRef.current?.focus();
  }, [addingToGroup]);

  function removeTask(groupIdx: number, taskId: string) {
    setEditableGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx ? { ...g, tasks: g.tasks.filter((t) => t._id !== taskId) } : g
      )
    );
  }

  function commitAddTask(groupIdx: number) {
    const title = newTaskTitle.trim();
    if (!title) {
      setAddingToGroup(null);
      setNewTaskTitle("");
      return;
    }
    setEditableGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? {
              ...g,
              tasks: [
                ...g.tasks,
                { _id: uid(), title, assignedRole: "", priority: "MEDIUM", estimatedHours: "", dayOffset: "" },
              ],
            }
          : g
      )
    );
    setNewTaskTitle("");
    // Keep the input open so user can add another
  }

  async function handleGenerate() {
    if (campaignMode === "new" && !campaignName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (campaignMode === "existing" && !campaignId) {
      toast.error("Please select a project");
      return;
    }
    if (!deadline) {
      toast.error("Deadline is required");
      return;
    }
    if (allTasks.length === 0) {
      toast.error("Add at least one task");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${template.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaignMode === "existing" ? campaignId || null : null,
          createCampaign: campaignMode === "new",
          campaignName: campaignMode === "new" ? campaignName : null,
          deadline,
          roleAssignments,
          // Send the user's edited task list
          customGroups: editableGroups.map((g) => ({
            name: g.name,
            tasks: g.tasks.map((t) => ({
              title: t.title,
              assignedRole: t.assignedRole || null,
              priority: t.priority,
              estimatedHours: t.estimatedHours ? parseFloat(t.estimatedHours) : null,
              dayOffset: t.dayOffset ? parseInt(t.dayOffset) : null,
            })),
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      toast.success(`${data.tasksCreated} tasks generated successfully!`);
      onSuccess(data.campaignId);
      if (data.campaignId) router.push(`/campaigns/${data.campaignId}`);
    } catch {
      toast.error("Failed to generate workflow");
    } finally {
      setLoading(false);
    }
  }

  const deadlineDate = deadline ? new Date(deadline) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#e8170b]" />
              <h2 className="text-base font-semibold">Use Template</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{template.name}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["config", "preview"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                step === s
                  ? "border-b-2 border-[#e8170b] text-[#e8170b]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "config" ? "1. Configure" : "2. Tasks"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === "config" ? (
            <>
              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Project
                </label>
                <div className="flex gap-2 mb-3">
                  {(["new", "existing"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setCampaignMode(m)}
                      className={cn(
                        "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                        campaignMode === m
                          ? "border-[#e8170b] bg-[#e8170b]/5 text-[#e8170b]"
                          : "border-border text-muted-foreground hover:border-gray-400"
                      )}
                    >
                      {m === "new" ? "Create new project" : "Add to existing"}
                    </button>
                  ))}
                </div>
                {campaignMode === "new" ? (
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Project name…"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                  />
                ) : (
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                  >
                    {campaigns.length === 0 ? (
                      <option value="">No projects yet — create one first</option>
                    ) : (
                      campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Project Deadline *
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Task due dates are distributed backwards from this deadline.
                </p>
              </div>

              {/* Role assignments */}
              {originalRoles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Role Assignments
                  </label>
                  <div className="space-y-2">
                    {originalRoles.map((role) => (
                      <div key={role} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-44 flex-shrink-0 truncate">
                          {ROLE_LABELS[role] ?? role}
                        </span>
                        <select
                          value={roleAssignments[role] ?? ""}
                          onChange={(e) =>
                            setRoleAssignments((prev) => ({ ...prev, [role]: e.target.value }))
                          }
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}{u.marketingRole === role ? " ✓" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep("preview")}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Review & Edit Tasks ({allTasks.length}) →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{allTasks.length} tasks</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Add or remove tasks before generating</p>
                </div>
                <button onClick={() => setStep("config")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
              </div>

              {/* Editable group + task list */}
              <div className="space-y-4">
                {editableGroups.map((group, gi) => {
                  const groupOffset = editableGroups.slice(0, gi).reduce((s, g) => s + g.tasks.length, 0);
                  return (
                    <div key={gi} className="rounded-xl border border-border overflow-hidden">
                      {/* Group header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{group.tasks.length} tasks</span>
                      </div>

                      {/* Tasks */}
                      <div className="divide-y divide-border">
                        {group.tasks.map((task, ti) => {
                          const globalIdx = groupOffset + ti;
                          const assigneeName = task.assignedRole
                            ? users.find((u) => u.id === roleAssignments[task.assignedRole])?.name
                            : null;
                          const dueDateStr = deadlineDate
                            ? smartDatePreview(deadlineDate, globalIdx, allTasks.length, template.estimatedDays ?? null, task.dayOffset)
                            : "—";

                          return (
                            <div key={task._id} className="flex items-center gap-2 px-3 py-2.5 group/row hover:bg-muted/20 transition-colors">
                              <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                {task.assignedRole && (
                                  <p className="text-xs text-muted-foreground">
                                    {ROLE_LABELS[task.assignedRole] ?? task.assignedRole}
                                    {assigneeName && (
                                      <span className="text-[#e8170b]"> → {assigneeName}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0", PRIORITY_COLORS[task.priority])}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
                                {deadlineDate ? `Due ${dueDateStr}` : "—"}
                              </span>
                              <button
                                onClick={() => removeTask(gi, task._id)}
                                className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-300 flex-shrink-0"
                                title="Remove task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add task row */}
                        {addingToGroup === gi ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-950/20">
                            <Plus className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />
                            <input
                              ref={newTaskRef}
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitAddTask(gi);
                                if (e.key === "Escape") { setAddingToGroup(null); setNewTaskTitle(""); }
                              }}
                              placeholder="Task title… (Enter to add, Esc to cancel)"
                              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
                            />
                            <button
                              onClick={() => commitAddTask(gi)}
                              className="text-xs px-2 py-1 rounded-lg bg-[#e8170b] text-white font-medium hover:bg-[#c91409] flex-shrink-0"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setAddingToGroup(null); setNewTaskTitle(""); }}
                              className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingToGroup(gi); setNewTaskTitle(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-[#e8170b] hover:bg-muted/30 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add task to {group.name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {allTasks.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  All tasks removed. Add at least one task to generate.
                </p>
              )}
            </>
          )}
        </div>

        {/* Sticky footer with generate button */}
        {step === "preview" && (
          <div className="border-t border-border p-4 flex-shrink-0">
            <button
              onClick={handleGenerate}
              disabled={loading || allTasks.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <Zap className="w-4 h-4" />
              {loading ? "Generating…" : `Generate ${allTasks.length} Task${allTasks.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
