"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Repeat, Plus, Pause, Play, Trash2, RefreshCw,
  Calendar, Clock, AlertCircle, CheckCircle2,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { formatFrequency, Frequency } from "@/lib/recurring";
import { TaskForm } from "@/components/tasks/TaskForm";

interface RecurringTemplate {
  id: string;
  title: string;
  description: string | null;
  taskType: string | null;
  priority: string;
  estimatedHours: number | null;
  campaignId: string | null;
  frequency: string;
  interval: number;
  weekDays: string | null;
  monthDay: number | null;
  assigneeIds: string | null;
  startDate: string;
  endType: string;
  endDate: string | null;
  endCount: number | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  generatedCount: number;
  createdAt: string;
  createdBy: { id: string; name: string };
  campaign: { id: string; name: string } | null;
  _count: { tasks: number };
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-orange-50 text-orange-600",
  URGENT: "bg-red-50 text-red-600",
};

function fetchTemplates(): Promise<{ data: RecurringTemplate[] }> {
  return fetch("/api/recurring").then((r) => r.json());
}

export default function RecurringPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: fetchTemplates,
  });

  const templates = data?.data ?? [];

  // Stats
  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter((t) => t.isActive).length;
    const paused = templates.filter((t) => !t.isActive).length;
    const thisMonth = templates.reduce((sum, t) => sum + t._count.tasks, 0);
    return { total, active, paused, thisMonth };
  }, [templates]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] });
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/recurring/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Recurring task deleted");
      qc.invalidateQueries({ queryKey: ["recurring"] });
    },
    onError: () => toast.error("Failed to delete template"),
  });

  async function handleGenerateNow(id: string) {
    setGenerating(id);
    try {
      const res = await fetch("/api/recurring/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: id, force: true }),
      });
      const data = await res.json();
      const result = data.results?.find(
        (r: { templateId: string; success: boolean; error?: string }) => r.templateId === id
      );
      if (result?.success) {
        toast.success("Task generated successfully");
        qc.invalidateQueries({ queryKey: ["recurring"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
      } else if (!result) {
        toast.error("Template not found");
      } else {
        toast.error(result.error ?? "Generation failed");
      }
    } catch {
      toast.error("Failed to generate task");
    } finally {
      setGenerating(null);
    }
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete recurring task "${title}"? Generated tasks will remain.`)) return;
    deleteMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Recurring Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Automate repetitive tasks — they generate on schedule and land in the team&apos;s task list.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Recurring Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Templates", value: stats.total, icon: Repeat, color: "text-gray-600 bg-gray-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "Paused", value: stats.paused, icon: Pause, color: "text-amber-600 bg-amber-50" },
          { label: "Tasks Generated", value: stats.thisMonth, icon: Calendar, color: "text-blue-600 bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Repeat className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">No recurring tasks yet</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs">
            Create a recurring task and it will automatically generate in your team&apos;s task list.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl bg-[#e8170b] text-white text-sm font-medium hover:bg-[#c91409] transition-colors"
          >
            Create your first recurring task
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Template
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Schedule
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Next Run
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Generated
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => {
                const nextRun = t.nextRunAt ? new Date(t.nextRunAt) : null;
                const isOverdue = nextRun && isPast(nextRun) && t.isActive;

                return (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Template */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#e8170b]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Repeat className="w-3.5 h-3.5 text-[#e8170b]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", PRIORITY_COLORS[t.priority])}>
                              {t.priority}
                            </span>
                            {t.taskType && (
                              <span className="text-[11px] text-gray-400">{t.taskType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium text-[13px]">
                        {formatFrequency(
                          t.frequency as Frequency,
                          t.interval,
                          t.weekDays,
                          t.monthDay
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Started {format(new Date(t.startDate), "MMM d, yyyy")}
                      </p>
                    </td>

                    {/* Campaign */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {t.campaign ? (
                        <span className="text-[13px] text-gray-600">{t.campaign.name}</span>
                      ) : (
                        <span className="text-[13px] text-gray-300">—</span>
                      )}
                    </td>

                    {/* Next run */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {nextRun ? (
                        <div className="flex items-center gap-1.5">
                          {isOverdue ? (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          )}
                          <span className={cn("text-[13px]", isOverdue ? "text-amber-600 font-medium" : "text-gray-600")}>
                            {format(nextRun, "MMM d, yyyy")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-gray-300">
                          {t.isActive ? "—" : "Ended"}
                        </span>
                      )}
                    </td>

                    {/* Generated count */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[13px] text-gray-600 font-medium">{t._count.tasks}</span>
                      <span className="text-[11px] text-gray-400 ml-1">tasks</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                          t.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {t.isActive ? (
                          <><Play className="w-2.5 h-2.5" />Active</>
                        ) : (
                          <><Pause className="w-2.5 h-2.5" />Paused</>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Generate now */}
                        <button
                          onClick={() => handleGenerateNow(t.id)}
                          disabled={generating === t.id}
                          title="Generate task now"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5", generating === t.id && "animate-spin")} />
                        </button>

                        {/* Pause / Resume */}
                        <button
                          onClick={() => {
                            toggleMutation.mutate({ id: t.id, isActive: !t.isActive });
                            toast.success(t.isActive ? "Template paused" : "Template resumed");
                          }}
                          title={t.isActive ? "Pause" : "Resume"}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          {t.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          title="Delete"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* How it works — only shown when there are templates */}
      {templates.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[13px] font-semibold text-blue-700 mb-1">How recurring tasks work</p>
          <p className="text-[12px] text-blue-600 leading-relaxed">
            Tasks are generated automatically each day via a scheduled job. You can also click the{" "}
            <RefreshCw className="w-3 h-3 inline" /> button to generate a task immediately regardless of schedule.
            Generated tasks appear in the main Tasks board with the same assignees and priority as the template.
          </p>
        </div>
      )}

      {/* Task form modal — pre-set to recurring mode */}
      {showForm && (
        <TaskForm
          defaultRecurring
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["recurring"] });
          }}
        />
      )}
    </div>
  );
}
