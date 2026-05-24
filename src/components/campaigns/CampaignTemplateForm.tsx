"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, BookTemplate } from "lucide-react";

interface Task {
  title: string;
  description?: string | null;
  taskType?: string | null;
  priority: string;
  estimatedHours?: number | null;
}

interface CampaignTemplateFormProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultName?: string;
  defaultDepartmentId?: string | null;
  tasks?: Task[];
}

export function CampaignTemplateForm({
  onClose, onSuccess, defaultName = "", defaultDepartmentId, tasks = [],
}: CampaignTemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/campaign-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          departmentId: defaultDepartmentId ?? null,
          templateTasks: tasks.length > 0 ? JSON.stringify(tasks) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Template saved");
      onSuccess();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <BookTemplate className="w-4 h-4 text-[#e8170b]" />
            <h2 className="text-base font-semibold">Save as Template</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Template Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ramadan Campaign Template…"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this template for?"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
            />
          </div>

          {tasks.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Will include {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {tasks.map((t, i) => (
                  <p key={i} className="text-xs text-foreground truncate">• {t.title}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? "Saving…" : "Save Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
