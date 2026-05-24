"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  GripVertical, Layers, CheckSquare, Clock, User,
  Save, ArrowLeft, Tag, Building2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplateStore, BuilderGroup, BuilderTask } from "@/store/template-store";
import { AITemplateGeneratorModal } from "@/components/templates/AITemplateGeneratorModal";

const ROLE_OPTIONS = [
  { value: "", label: "No role" },
  { value: "CONTENT_WRITER", label: "Content Writer" },
  { value: "GRAPHIC_DESIGNER", label: "Graphic Designer" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "SOCIAL_MEDIA_MANAGER", label: "Social Media Manager" },
  { value: "SEO_SPECIALIST", label: "SEO Specialist" },
  { value: "PERFORMANCE_MARKETER", label: "Performance Marketer" },
  { value: "CRM_EMAIL_MARKETER", label: "CRM/Email Marketer" },
  { value: "MARKETING_MANAGER", label: "Marketing Manager" },
];

const ROLE_COLORS: Record<string, string> = {
  CONTENT_WRITER: "bg-blue-100 text-blue-700",
  GRAPHIC_DESIGNER: "bg-purple-100 text-purple-700",
  VIDEO_EDITOR: "bg-pink-100 text-pink-700",
  SOCIAL_MEDIA_MANAGER: "bg-green-100 text-green-700",
  SEO_SPECIALIST: "bg-teal-100 text-teal-700",
  PERFORMANCE_MARKETER: "bg-orange-100 text-orange-700",
  CRM_EMAIL_MARKETER: "bg-indigo-100 text-indigo-700",
  MARKETING_MANAGER: "bg-red-100 text-red-700",
};

const GROUP_COLORS = ["#6366f1", "#e8170b", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

const CATEGORIES = [
  { value: "CAMPAIGN", label: "Project Template" },
  { value: "TASK", label: "Task Bundle" },
  { value: "DEPARTMENT", label: "Department Template" },
  { value: "CUSTOM", label: "Custom" },
];

interface Department {
  id: string;
  name: string;
  color: string;
}

interface TemplateBuilderProps {
  templateId?: string;
}

function TaskEditor({ group, task }: { group: BuilderGroup; task: BuilderTask }) {
  const { expandedTaskIds, toggleTaskExpand, updateTask, removeTask, moveTask, addChecklistItem, updateChecklistItem, removeChecklistItem } =
    useTemplateStore();
  const isExpanded = expandedTaskIds.has(task.id);

  return (
    <div className={cn(
      "border border-border rounded-xl overflow-hidden transition-all",
      isExpanded ? "shadow-sm" : ""
    )}>
      {/* Task header row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-background hover:bg-muted/30 cursor-pointer"
        onClick={() => toggleTaskExpand(task.id)}
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 cursor-grab" />
        <input
          value={task.title}
          onChange={(e) => { e.stopPropagation(); updateTask(group.id, task.id, { title: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Task title…"
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-300"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {task.assignedRole && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", ROLE_COLORS[task.assignedRole] ?? "bg-gray-100 text-gray-600")}>
              {ROLE_OPTIONS.find((r) => r.value === task.assignedRole)?.label ?? task.assignedRole}
            </span>
          )}
          {task.estimatedHours && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{task.estimatedHours}h
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); moveTask(group.id, task.id, "up"); }}
            className="p-1 rounded hover:bg-muted text-gray-300 hover:text-gray-600"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); moveTask(group.id, task.id, "down"); }}
            className="p-1 rounded hover:bg-muted text-gray-300 hover:text-gray-600"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeTask(group.id, task.id); }}
            className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-gray-300"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <ChevronRight className={cn("w-3.5 h-3.5 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <textarea
            value={task.description}
            onChange={(e) => updateTask(group.id, task.id, { description: e.target.value })}
            placeholder="Description / SOP notes…"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <User className="w-3 h-3" /> Role
              </label>
              <select
                value={task.assignedRole}
                onChange={(e) => updateTask(group.id, task.id, { assignedRole: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <select
                value={task.priority}
                onChange={(e) => updateTask(group.id, task.id, { priority: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Est. Hours
              </label>
              <input
                type="number"
                value={task.estimatedHours}
                onChange={(e) => updateTask(group.id, task.id, { estimatedHours: e.target.value })}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Days before deadline</label>
              <input
                type="number"
                value={task.dayOffset}
                onChange={(e) => updateTask(group.id, task.id, { dayOffset: e.target.value })}
                placeholder="Auto"
                min="0"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Task Type</label>
              <input
                value={task.taskType}
                onChange={(e) => updateTask(group.id, task.id, { taskType: e.target.value })}
                placeholder="e.g. Content, Design…"
                className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Checklist / SOP
              </label>
              <button
                onClick={() => addChecklistItem(group.id, task.id)}
                className="text-xs text-[#e8170b] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            {task.checklist.length === 0 ? (
              <p className="text-xs text-gray-300 italic">No checklist items yet</p>
            ) : (
              <div className="space-y-1">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0" />
                    <input
                      value={item.text}
                      onChange={(e) => updateChecklistItem(group.id, task.id, item.id, e.target.value)}
                      placeholder="Checklist item…"
                      className="flex-1 bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-gray-300"
                    />
                    <button
                      onClick={() => removeChecklistItem(group.id, task.id, item.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupEditor({ group }: { group: BuilderGroup }) {
  const { removeGroup, updateGroup, moveGroup, addTask } = useTemplateStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <button onClick={() => setCollapsed((v) => !v)} className="text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn("w-4 h-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <input
          value={group.name}
          onChange={(e) => updateGroup(group.id, { name: e.target.value })}
          className="flex-1 bg-transparent font-semibold text-sm focus:outline-none"
          placeholder="Group name…"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground">{group.tasks.length} tasks</span>
          {/* Color picker */}
          <div className="flex gap-1 ml-1">
            {GROUP_COLORS.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => updateGroup(group.id, { color: c })}
                className={cn("w-4 h-4 rounded-full border-2 transition-all", group.color === c ? "border-gray-900 scale-125" : "border-transparent")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button onClick={() => moveGroup(group.id, "up")} className="p-1 rounded hover:bg-muted text-gray-300 hover:text-gray-600">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => moveGroup(group.id, "down")} className="p-1 rounded hover:bg-muted text-gray-300 hover:text-gray-600">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeGroup(group.id)}
            className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-gray-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {group.tasks.map((task) => (
            <TaskEditor key={task.id} group={group} task={task} />
          ))}
          <button
            onClick={() => addTask(group.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-muted-foreground hover:border-[#e8170b] hover:text-[#e8170b] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>
      )}
    </div>
  );
}

export function TemplateBuilder({ templateId }: TemplateBuilderProps) {
  const router = useRouter();
  const { meta, groups, isDirty, setMeta, addGroup, load, reset } = useTemplateStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const isEdit = !!templateId;

  useEffect(() => {
    fetch("/api/departments?myTeams=true").then((r) => r.json()).then((d) => setDepartments(d.data || []));
  }, []);

  useEffect(() => {
    if (templateId) {
      fetch(`/api/templates/${templateId}`)
        .then((r) => r.json())
        .then(({ data }) => {
          if (!data) return;
          load(
            {
              name: data.name,
              description: data.description ?? "",
              category: data.category,
              departmentId: data.departmentId ?? "",
              defaultPriority: data.defaultPriority,
              estimatedDays: data.estimatedDays?.toString() ?? "",
              tags: data.tags ?? "",
            },
            data.groups.map((g: any) => ({
              id: g.id,
              name: g.name,
              color: g.color,
              tasks: g.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description ?? "",
                taskType: t.taskType ?? "",
                assignedRole: t.assignedRole ?? "",
                priority: t.priority,
                estimatedHours: t.estimatedHours?.toString() ?? "",
                dayOffset: t.dayOffset?.toString() ?? "",
                checklist: t.checklist.map((c: any) => ({ id: c.id, text: c.text })),
              })),
            }))
          );
        });
    } else {
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const totalTasks = groups.reduce((s, g) => s + g.tasks.length, 0);

  async function handleSave() {
    if (!meta.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (totalTasks === 0) {
      toast.error("Add at least one task");
      return;
    }
    setSaving(true);

    const payload = {
      name: meta.name,
      description: meta.description || null,
      category: meta.category,
      departmentId: meta.departmentId || null,
      defaultPriority: meta.defaultPriority,
      estimatedDays: meta.estimatedDays ? parseInt(meta.estimatedDays) : null,
      tags: meta.tags || null,
      groups: groups.map((g, gi) => ({
        name: g.name,
        color: g.color,
        position: gi,
        tasks: g.tasks.map((t, ti) => ({
          title: t.title,
          description: t.description || null,
          taskType: t.taskType || null,
          assignedRole: t.assignedRole || null,
          priority: t.priority,
          estimatedHours: t.estimatedHours ? parseFloat(t.estimatedHours) : null,
          dayOffset: t.dayOffset ? parseInt(t.dayOffset) : null,
          position: ti,
          checklist: t.checklist
            .filter((c) => c.text.trim())
            .map((c, ci) => ({ text: c.text, position: ci })),
        })),
      })),
    };

    try {
      const url = isEdit ? `/api/templates/${templateId}` : "/api/templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? "Template updated" : "Template created");
      router.push("/templates");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="flex gap-6 min-h-0">
      {/* Left: metadata panel */}
      <aside className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 sticky top-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Template Name *</label>
            <input
              value={meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              placeholder="e.g. Meta Ads Campaign"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta({ description: e.target.value })}
              rows={2}
              placeholder="What is this template for?"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
            <select
              value={meta.category}
              onChange={(e) => setMeta({ category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Department
            </label>
            <select
              value={meta.departmentId}
              onChange={(e) => setMeta({ departmentId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Default Priority</label>
              <select
                value={meta.defaultPriority}
                onChange={(e) => setMeta({ defaultPriority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Est. Days
              </label>
              <input
                type="number"
                value={meta.estimatedDays}
                onChange={(e) => setMeta({ estimatedDays: e.target.value })}
                placeholder="30"
                min="1"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </label>
            <input
              value={meta.tags}
              onChange={(e) => setMeta({ tags: e.target.value })}
              placeholder="ads, content, social…"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>

          {/* Stats summary */}
          <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Groups</span>
              <span className="font-semibold text-foreground">{groups.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total tasks</span>
              <span className="font-semibold text-foreground">{totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span>Total hours</span>
              <span className="font-semibold text-foreground">
                {groups.reduce((s, g) => s + g.tasks.reduce((ts, t) => ts + (parseFloat(t.estimatedHours) || 0), 0), 0)}h
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right: group builder */}
      <div className="flex-1 min-w-0 space-y-4">
        {!isEdit && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 text-violet-600 text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-950/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate with AI
            </button>
          </div>
        )}

        {groups.map((group) => (
          <GroupEditor key={group.id} group={group} />
        ))}

        <button
          onClick={addGroup}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-[#e8170b] hover:text-[#e8170b] transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Task Group
        </button>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/templates")}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !meta.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : isEdit ? "Update Template" : "Save Template"}
          </button>
        </div>
      </div>
    </div>

    {showAIGenerator && (
      <AITemplateGeneratorModal
        onClose={() => setShowAIGenerator(false)}
        onLoad={(generatedMeta, generatedGroups) => {
          load(generatedMeta, generatedGroups);
          setShowAIGenerator(false);
        }}
      />
    )}
    </>
  );
}
