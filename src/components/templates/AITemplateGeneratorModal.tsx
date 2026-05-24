"use client";

import { useState } from "react";
import { X, Sparkles, ChevronDown, CheckCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BuilderMeta, BuilderGroup } from "@/store/template-store";

const CATEGORIES = [
  { value: "CAMPAIGN", label: "Project Template" },
  { value: "TASK", label: "Task Bundle" },
  { value: "DEPARTMENT", label: "Department Template" },
  { value: "CUSTOM", label: "Custom" },
];

const ROLE_LABELS: Record<string, string> = {
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SOCIAL_MEDIA_MANAGER: "Social Media",
  SEO_SPECIALIST: "SEO",
  PERFORMANCE_MARKETER: "Performance",
  CRM_EMAIL_MARKETER: "CRM/Email",
  MARKETING_MANAGER: "Manager",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const uid = () => Math.random().toString(36).slice(2, 10);

interface Props {
  onClose: () => void;
  onLoad: (meta: BuilderMeta, groups: BuilderGroup[]) => void;
}

export function AITemplateGeneratorModal({ onClose, onLoad }: Props) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("CAMPAIGN");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ meta: BuilderMeta; groups: BuilderGroup[] } | null>(null);

  async function generate() {
    if (!description.trim()) { toast.error("Describe your template first"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/template-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          category,
          estimatedDays: estimatedDays ? parseInt(estimatedDays) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      const d = json.data;
      const meta: BuilderMeta = {
        name: d.name || "",
        description: d.description || "",
        category: d.category || category,
        departmentId: "",
        defaultPriority: d.defaultPriority || "MEDIUM",
        estimatedDays: d.estimatedDays?.toString() || estimatedDays || "",
        tags: d.tags || "",
      };

      const groups: BuilderGroup[] = (d.groups || []).map((g: {
        name?: string; color?: string;
        tasks?: { title?: string; description?: string; taskType?: string; assignedRole?: string; priority?: string; estimatedHours?: number; dayOffset?: number }[]
      }) => ({
        id: uid(),
        name: g.name || "Group",
        color: g.color || "#6366f1",
        tasks: (g.tasks || []).map((t) => ({
          id: uid(),
          title: t.title || "",
          description: t.description || "",
          taskType: t.taskType || "",
          assignedRole: t.assignedRole || "",
          priority: t.priority || "MEDIUM",
          estimatedHours: t.estimatedHours?.toString() || "",
          dayOffset: t.dayOffset?.toString() || "",
          checklist: [],
        })),
      }));

      setPreview({ meta, groups });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  const totalTasks = preview?.groups.reduce((s, g) => s + g.tasks.length, 0) ?? 0;
  const totalHours = preview?.groups.reduce(
    (s, g) => s + g.tasks.reduce((ts, t) => ts + (parseFloat(t.estimatedHours) || 0), 0), 0
  ) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold">AI Template Generator</h2>
              <p className="text-[11px] text-muted-foreground">Describe your campaign — AI builds the full task structure</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Describe your campaign or workflow *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Ramadan social media campaign — 3 weeks, focus on Instagram Reels and TikTok, influencer collaboration, performance tracking on Meta Ads"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Duration (days)</label>
              <input
                type="number"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
                placeholder="e.g. 21"
                min="1"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !description.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "Generating template…" : preview ? "Regenerate" : "Generate Template"}
          </button>

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {/* Summary card */}
              <div className="flex items-start gap-3 p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
                <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{preview.meta.name}</p>
                  {preview.meta.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{preview.meta.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-violet-600 font-medium">
                    <span>{preview.groups.length} groups</span>
                    <span>{totalTasks} tasks</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{totalHours}h total</span>
                    {preview.meta.estimatedDays && <span>{preview.meta.estimatedDays} days</span>}
                  </div>
                </div>
              </div>

              {/* Groups + tasks */}
              <div className="space-y-2">
                {preview.groups.map((group) => (
                  <div key={group.id} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                      <span className="text-[13px] font-semibold flex-1">{group.name}</span>
                      <span className="text-[11px] text-muted-foreground">{group.tasks.length} tasks</span>
                    </div>
                    <div className="divide-y divide-border">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 px-3 py-2">
                          <span className="flex-1 text-[12px] text-foreground truncate">{task.title}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {task.assignedRole && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <User className="w-2.5 h-2.5" />
                                {ROLE_LABELS[task.assignedRole] ?? task.assignedRole}
                              </span>
                            )}
                            {task.estimatedHours && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" />
                                {task.estimatedHours}h
                              </span>
                            )}
                            <span className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                              PRIORITY_COLORS[task.priority] ?? "bg-slate-100 text-slate-600"
                            )}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          {preview && (
            <button
              onClick={() => onLoad(preview.meta, preview.groups)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Load into Builder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
