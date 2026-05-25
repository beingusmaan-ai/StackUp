"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

interface User { id: string; name: string }
interface Department { id: string; name: string; color: string }

interface CampaignFormProps {
  onClose: () => void;
  onSuccess: (id?: string) => void;
  defaultDepartmentId?: string | null;
  editCampaign?: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    startDate: string | Date;
    endDate: string | Date;
    budget?: number | null;
    goals?: string | null;
    ownerId: string;
    departmentId?: string | null;
  } | null;
}

export function CampaignForm({ onClose, onSuccess, editCampaign, defaultDepartmentId }: CampaignFormProps) {
  const { activeWorkspaceId } = useUIStore();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  const [form, setForm] = useState({
    name: editCampaign?.name || "",
    description: editCampaign?.description || "",
    status: editCampaign?.status || "DRAFT",
    startDate: editCampaign?.startDate ? new Date(editCampaign.startDate).toISOString().split("T")[0] : "",
    endDate: editCampaign?.endDate ? new Date(editCampaign.endDate).toISOString().split("T")[0] : "",
    budget: editCampaign?.budget?.toString() || "",
    goals: editCampaign?.goals || "",
    ownerId: editCampaign?.ownerId || "",
    departmentId: editCampaign?.departmentId || defaultDepartmentId || "",
  });

  const { activeTeamId } = useUIStore();

  useEffect(() => {
    const usersUrl = activeTeamId ? `/api/users?departmentId=${activeTeamId}` : "/api/users";
    Promise.all([
      fetch(usersUrl).then((r) => r.json()),
      fetch("/api/departments?myTeams=true").then((r) => r.json()),
    ]).then(([u, d]) => {
      setUsers(u.data || []);
      setDepartments(d.data || []);
    });
  }, [activeTeamId]);

  async function generateBrief() {
    if (!form.name.trim()) { toast.error("Enter a project name first"); return; }
    setBriefLoading(true);
    try {
      const dept = departments.find((d) => d.id === form.departmentId)?.name;
      const res = await fetch("/api/ai/campaign-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          goal: form.goals || undefined,
          budget: form.budget ? parseFloat(form.budget) : undefined,
          department: dept,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setForm((f) => ({
        ...f,
        description: json.data.description || f.description,
        goals: json.data.goals || f.goals,
      }));
      toast.success("Brief generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        ownerId: form.ownerId || undefined,
        departmentId: form.departmentId || null,
        workspaceId: editCampaign ? undefined : (activeWorkspaceId ?? null),
      };
      const url = editCampaign ? `/api/campaigns/${editCampaign.id}` : "/api/campaigns";
      const method = editCampaign ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to save project");
      toast.success(editCampaign ? "Project updated" : "Project created");
      onSuccess(json.data?.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">{editCampaign ? "Edit Project" : "New Project"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Project Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Q3 Sales Drive 2026"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>

          {/* Description + AI brief */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Description</label>
              <button
                type="button"
                onClick={generateBrief}
                disabled={briefLoading || !form.name.trim()}
                className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {briefLoading ? "Generating…" : "✨ AI Brief"}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Project overview…"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Goals / KPIs</label>
            <textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              rows={2}
              placeholder="Key objectives and KPIs…"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Department</label>
              <div className="relative">
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]">
                  <option value="">No Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <div className="relative">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]">
                  {["DRAFT","ACTIVE","PAUSED","COMPLETED","ARCHIVED"].map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Budget ($)</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="0" min="0"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Project Owner</label>
              <div className="relative">
                <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                  className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]">
                  <option value="">You (default)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {!editCampaign && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border text-[12px]",
              "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 text-violet-600 dark:text-violet-400"
            )}>
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              After creating, you can auto-generate tasks with AI Breakdown.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? "Saving…" : editCampaign ? "Update" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
