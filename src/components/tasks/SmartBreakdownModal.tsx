"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles, ChevronDown, ChevronRight, Plus, Trash2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui-store";

interface BreakdownTask {
  title: string;
  assignedRole: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedHours: number;
  assigneeIds: string[];
}

interface BreakdownGroup {
  name: string;
  tasks: BreakdownTask[];
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-slate-500 bg-slate-100 dark:bg-slate-800",
  MEDIUM: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
  HIGH: "text-orange-600 bg-orange-50 dark:bg-orange-950/40",
  URGENT: "text-red-600 bg-red-50 dark:bg-red-950/40",
};

interface Campaign { id: string; name: string }
interface User { id: string; name: string; marketingRole?: string | null }

interface SmartBreakdownModalProps {
  campaigns: Campaign[];
  onClose: () => void;
  onTasksCreated: () => void;
}

function AssigneeDropdown({
  users,
  assigneeIds,
  onChange,
}: {
  users: User[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    onChange(assigneeIds.includes(id) ? assigneeIds.filter((x) => x !== id) : [...assigneeIds, id]);
  }

  const names = assigneeIds
    .map((id) => users.find((u) => u.id === id)?.name?.split(" ")[0])
    .filter(Boolean)
    .join(", ");

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[11px] transition-colors",
          assigneeIds.length > 0
            ? "border-[#e8170b]/40 text-[#e8170b] bg-[#e8170b]/5"
            : "border-border text-muted-foreground hover:border-[#e8170b]/40 hover:text-[#e8170b]"
        )}
      >
        <UserPlus className="w-3 h-3" />
        {assigneeIds.length > 0 ? names : "Assign"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[70] bg-background border border-border rounded-xl shadow-lg w-48 py-1 max-h-48 overflow-y-auto">
          {users.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-muted-foreground">No users found</p>
          )}
          {users.map((u) => {
            const selected = assigneeIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(u.id); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors"
              >
                <div className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  selected ? "bg-[#e8170b] border-[#e8170b]" : "border-border"
                )}>
                  {selected && <Check className="w-2 h-2 text-white" />}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[12px] font-medium text-foreground truncate">{u.name}</p>
                  {u.marketingRole && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.marketingRole.replace(/_/g, " ").toLowerCase()}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SmartBreakdownModal({ campaigns, onClose, onTasksCreated }: SmartBreakdownModalProps) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [groups, setGroups] = useState<BreakdownGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"input" | "review" | "create">("input");
  const [users, setUsers] = useState<User[]>([]);

  // Create step state
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const { activeTeamId } = useUIStore();

  useEffect(() => {
    const usersUrl = activeTeamId ? `/api/users?departmentId=${activeTeamId}` : "/api/users";
    fetch(usersUrl).then((r) => r.json()).then((j) => setUsers(j.data || []));
  }, [activeTeamId]);

  const totalTasks = groups.reduce((s, g) => s + g.tasks.length, 0);
  const totalHours = groups.reduce((s, g) => s + g.tasks.reduce((ts, t) => ts + (t.estimatedHours || 0), 0), 0);

  function updateTaskAssignees(gi: number, ti: number, ids: string[]) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== gi ? g : {
          ...g,
          tasks: g.tasks.map((t, j) => j !== ti ? t : { ...t, assigneeIds: ids }),
        }
      )
    );
  }

  async function handleGenerate() {
    if (!goal.trim()) { toast.error("Describe your project goal"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/task-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, campaignName: campaignName || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      // Seed assigneeIds as empty for each task
      const groupsWithAssignees: BreakdownGroup[] = json.data.groups.map((g: Omit<BreakdownGroup, "tasks"> & { tasks: Omit<BreakdownTask, "assigneeIds">[] }) => ({
        ...g,
        tasks: g.tasks.map((t) => ({ ...t, assigneeIds: [] })),
      }));
      setGroups(groupsWithAssignees);
      setExpandedGroups(new Set(groupsWithAssignees.map((_: unknown, i: number) => i)));
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName || goal.slice(0, 60),
          description: `AI-generated plan: ${goal}`,
          category: "CAMPAIGN",
          estimatedDays: Math.ceil(totalHours / 8),
          groups: groups.map((g, gi) => ({
            name: g.name,
            position: gi,
            tasks: g.tasks.map((t, ti) => ({
              title: t.title,
              assignedRole: t.assignedRole || null,
              priority: t.priority,
              estimatedHours: t.estimatedHours || null,
              position: ti,
            })),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Template saved");
      router.push(`/templates/${json.data.id}/edit`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleCreateTasks() {
    if (!deadline) { toast.error("Select a deadline"); return; }
    setCreating(true);
    let created = 0;
    try {
      for (const group of groups) {
        for (const task of group.tasks) {
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              priority: task.priority,
              estimatedHours: task.estimatedHours || null,
              campaignId: selectedCampaignId || null,
              dueDate: deadline,
              status: "TODO",
              assigneeIds: task.assigneeIds,
            }),
          });
          created++;
        }
      }
      toast.success(`${created} tasks created`);
      onTasksCreated();
      onClose();
    } catch {
      toast.error("Some tasks failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Smart Task Breakdown</h2>
              {step === "review" && (
                <p className="text-[11px] text-muted-foreground">{totalTasks} tasks · ~{totalHours}h estimated</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* INPUT STEP */}
          {step === "input" && (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[12px] font-medium text-foreground block mb-1.5">
                  Describe your project or goal *
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  placeholder="e.g. Launch a Ramadan social media campaign targeting GCC audiences with video content, paid ads, and influencer collaborations"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground block mb-1.5">
                  Project name <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Ramadan 2026"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* GENERATING SKELETON */}
          {generating && (
            <div className="p-6 space-y-4">
              {[5, 4, 3].map((count, gi) => (
                <div key={gi} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                  {Array.from({ length: count }).map((_, ti) => (
                    <div key={ti} className="h-8 bg-muted/60 rounded-lg animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* REVIEW STEP */}
          {step === "review" && !generating && (
            <div className="p-6 space-y-3">
              {groups.map((group, gi) => (
                <div key={gi} className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.has(gi) ? next.delete(gi) : next.add(gi);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(gi)
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-[13px] font-semibold text-foreground">{group.name}</span>
                      <span className="text-[11px] text-muted-foreground">{group.tasks.length} tasks</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {group.tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0)}h
                    </span>
                  </button>
                  {expandedGroups.has(gi) && (
                    <div className="divide-y divide-border">
                      {group.tasks.map((task, ti) => (
                        <div key={ti} className="flex items-center gap-2 px-4 py-2 group/task">
                          <span className="text-[13px] text-foreground flex-1 min-w-0 truncate">{task.title}</span>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0", PRIORITY_COLOR[task.priority])}>
                            {task.priority}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0 w-7 text-right">
                            {task.estimatedHours}h
                          </span>
                          <AssigneeDropdown
                            users={users}
                            assigneeIds={task.assigneeIds}
                            onChange={(ids) => updateTaskAssignees(gi, ti, ids)}
                          />
                          <button
                            type="button"
                            onClick={() => setGroups((prev) =>
                              prev.map((g, i) =>
                                i !== gi ? g : { ...g, tasks: g.tasks.filter((_, j) => j !== ti) }
                              ).filter((g) => g.tasks.length > 0)
                            )}
                            className="opacity-0 group-hover/task:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* Add task row */}
                      <button
                        type="button"
                        onClick={() => setGroups((prev) =>
                          prev.map((g, i) =>
                            i !== gi ? g : {
                              ...g,
                              tasks: [...g.tasks, { title: "New task", assignedRole: null, priority: "MEDIUM", estimatedHours: 2, assigneeIds: [] }],
                            }
                          )
                        )}
                        className="w-full flex items-center gap-2 px-4 py-2 text-[12px] text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add task
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CREATE TASKS STEP */}
          {step === "create" && (
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Creating <span className="font-semibold text-foreground">{totalTasks} tasks</span>. Choose a project and deadline.
              </p>
              <div>
                <label className="text-[12px] font-medium text-foreground block mb-1.5">Project</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                >
                  <option value="">No project</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground block mb-1.5">Deadline *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center gap-2">
          {step === "input" && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-[13px] border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !goal.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Plan
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                onClick={() => setStep("input")}
                className="px-4 py-2 text-[13px] border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="flex-1 py-2 text-[13px] font-medium border border-violet-300 dark:border-violet-700 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {savingTemplate ? "Saving…" : "Save as Template"}
              </button>
              <button
                onClick={() => setStep("create")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white text-[13px] font-medium rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Tasks
              </button>
            </>
          )}

          {step === "create" && (
            <>
              <button
                onClick={() => setStep("review")}
                className="px-4 py-2 text-[13px] border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateTasks}
                disabled={creating || !deadline}
                className="flex-1 py-2 bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-[13px] font-medium rounded-xl transition-colors"
              >
                {creating ? `Creating tasks…` : `Create ${totalTasks} Tasks`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
