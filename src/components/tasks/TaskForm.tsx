"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Repeat, Sparkles, Cloud, XCircle, ChevronDown, Upload } from "lucide-react";
import { RecurringBuilder, RecurringConfig, getDefaultRecurringConfig } from "./RecurringBuilder";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { ImportTasksModal } from "./ImportTasksModal";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { gapi: any; google: any; OneDrive: any; } }
/* eslint-enable @typescript-eslint/no-explicit-any */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_API_KEY   = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

interface PendingFile {
  name: string; url: string; mimeType: string;
  size: number; source: "google_drive" | "onedrive"; externalId?: string;
}

interface User {
  id: string;
  name: string;
  marketingRole?: string | null;
  departmentMemberships?: { departmentId: string }[];
}

interface Campaign {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface TaskPrefill {
  title?: string;
  taskType?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: string;
  campaignId?: string;
  assigneeIds?: string[];
}

interface TaskFormProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultRecurring?: boolean;
  defaultCampaignId?: string | null;
  defaultListId?: string | null;
  prefill?: TaskPrefill | null;
  editTask?: {
    id: string;
    title: string;
    description?: string | null;
    taskType?: string | null;
    priority: string;
    status: string;
    dueDate?: Date | string | null;
    startDate?: Date | string | null;
    estimatedHours?: number | null;
    campaignId?: string | null;
    listId?: string | null;
    assignees: { user: { id: string; name: string } }[];
  } | null;
}

export function TaskForm({ onClose, onSuccess, editTask, defaultRecurring, defaultCampaignId, defaultListId, prefill }: TaskFormProps) {
  const { activeTeamId, activeWorkspaceId } = useUIStore();
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myDepartments, setMyDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChecklist, setAiChecklist] = useState<string[]>([]);
  const [estimating, setEstimating] = useState(false);
  const [isRecurring, setIsRecurring] = useState(defaultRecurring ?? false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>(getDefaultRecurringConfig);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pickingCloud, setPickingCloud] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    title: editTask?.title || prefill?.title || "",
    description: editTask?.description || "",
    taskType: editTask?.taskType || prefill?.taskType || "",
    priority: editTask?.priority || prefill?.priority || "MEDIUM",
    status: editTask?.status || "TODO",
    dueDate: editTask?.dueDate ? new Date(editTask.dueDate).toISOString().split("T")[0] : (prefill?.dueDate || ""),
    startDate: editTask?.startDate ? new Date(editTask.startDate).toISOString().split("T")[0] : "",
    estimatedHours: editTask?.estimatedHours?.toString() || prefill?.estimatedHours || "",
    campaignId: editTask?.campaignId || prefill?.campaignId || defaultCampaignId || "",
    listId: editTask?.listId || defaultListId || "",
    assigneeIds: editTask?.assignees.map((a) => a.user.id) || prefill?.assigneeIds || [] as string[],
    requestingDepartmentId: editTask ? "" : (activeTeamId ?? ""),
    assignedDepartmentId: "",
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeWorkspaceId) params.set("workspaceId", activeWorkspaceId);
    if (activeTeamId) params.set("departmentId", activeTeamId);
    const campaignUrl = `/api/campaigns?${params}`;
    const usersUrl = activeTeamId ? `/api/users?departmentId=${activeTeamId}` : "/api/users";
    Promise.all([
      fetch(usersUrl).then((r) => r.json()),
      fetch(campaignUrl).then((r) => r.json()),
      fetch("/api/departments?myTeams=true").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([u, c, myD, allD]) => {
      setUsers(u.data || []);
      setCampaigns(c.data || []);
      setMyDepartments(myD.data || []);
      setAllDepartments(allD.data || []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  const { data: foldersData } = useQuery({
    queryKey: ["folders", form.campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${form.campaignId}/folders`);
      return res.json();
    },
    enabled: !!form.campaignId,
  });
  const folders: { id: string; name: string; lists: { id: string; name: string }[] }[] = foldersData?.data ?? [];

  function toggleAssignee(id: string) {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((x) => x !== id)
        : [...f.assigneeIds, id],
    }));
  }

  async function pickGoogleDrive() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) { toast.error("Google Drive not configured"); return; }
    setPickingCloud(true);
    try {
      await Promise.all([
        loadScript("https://accounts.google.com/gsi/client"),
        loadScript("https://apis.google.com/js/api.js"),
      ]);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (resp: { error?: string; access_token: string }) => {
          if (resp.error) { toast.error("Google sign-in failed"); setPickingCloud(false); return; }
          window.gapi.load("picker", () => {
            new window.google.picker.PickerBuilder()
              .addView(window.google.picker.ViewId.DOCS)
              .setOAuthToken(resp.access_token)
              .setDeveloperKey(GOOGLE_API_KEY!)
              .setCallback((data: { action: string; docs: Array<{ id: string; name: string; url?: string; mimeType: string; sizeBytes?: number }> }) => {
                if (data.action === window.google.picker.Action.PICKED) {
                  const doc = data.docs[0];
                  const fileUrl = doc.url || `https://drive.google.com/file/d/${doc.id}/view`;
                  setPendingFiles((f) => [...f, { name: doc.name, url: fileUrl, mimeType: doc.mimeType, size: doc.sizeBytes ?? 0, source: "google_drive", externalId: doc.id }]);
                }
                setPickingCloud(false);
              })
              .build()
              .setVisible(true);
          });
        },
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      console.error("Google Drive picker error", err);
      toast.error("Google Drive picker failed");
      setPickingCloud(false);
    }
  }

  async function pickOneDrive() {
    if (!ONEDRIVE_CLIENT_ID) { toast.error("OneDrive not configured"); return; }
    setPickingCloud(true);
    try {
      await loadScript("https://js.live.net/v7.2/OneDrive.js");
      window.OneDrive.open({
        clientId: ONEDRIVE_CLIENT_ID, action: "share", multiSelect: false,
        success(files: { value: Array<{ id: string; name: string; webUrl: string; "@microsoft.graph.downloadUrl"?: string; file?: { mimeType: string }; size?: number }> }) {
          const f = files.value[0];
          setPendingFiles((prev) => [...prev, { name: f.name, url: f["@microsoft.graph.downloadUrl"] ?? f.webUrl, mimeType: f.file?.mimeType ?? "application/octet-stream", size: f.size ?? 0, source: "onedrive", externalId: f.id }]);
          setPickingCloud(false);
        },
        cancel() { setPickingCloud(false); },
        error() { toast.error("OneDrive picker error"); setPickingCloud(false); },
      });
    } catch (err) {
      console.error("OneDrive picker error", err);
      toast.error("OneDrive picker failed");
      setPickingCloud(false);
    }
  }

  async function generateDescription() {
    if (!form.title.trim()) { toast.error("Enter a task title first"); return; }
    setAiLoading(true);
    try {
      const campaignName = campaigns.find((c) => c.id === form.campaignId)?.name;
      const res = await fetch("/api/ai/task-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, taskType: form.taskType || undefined, campaignName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setForm((f) => ({ ...f, description: json.data.description }));
      setAiChecklist(json.data.checklist ?? []);
      toast.success("Description generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function estimateHours() {
    if (!form.title.trim()) { toast.error("Enter a task title first"); return; }
    setEstimating(true);
    try {
      const res = await fetch("/api/ai/estimate-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, taskType: form.taskType || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setForm((f) => ({ ...f, estimatedHours: String(json.data.hours) }));
      toast.success(`Estimated ${json.data.hours}h`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      if (!editTask && isRecurring) {
        // Create a recurring template instead of a one-off task
        const payload = {
          title: form.title,
          description: form.description || null,
          taskType: form.taskType || null,
          priority: form.priority,
          estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
          campaignId: form.campaignId || null,
          assigneeIds: form.assigneeIds,
          frequency: recurringConfig.frequency,
          interval: recurringConfig.interval,
          weekDays: recurringConfig.frequency === "WEEKLY" ? recurringConfig.weekDays : null,
          monthDay: recurringConfig.frequency === "MONTHLY" ? recurringConfig.monthDay : null,
          startDate: recurringConfig.startDate,
          endType: recurringConfig.endType,
          endDate: recurringConfig.endType === "ON_DATE" ? recurringConfig.endDate || null : null,
          endCount: recurringConfig.endType === "AFTER_COUNT" ? recurringConfig.endCount : null,
        };

        const res = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(typeof errData.error === "string" ? errData.error : "Failed to create recurring task");
        }

        const { data: template } = await res.json();

        // Immediately generate the first task so it appears in the task board
        await fetch("/api/recurring/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: template.id, force: true }),
        });

        toast.success("Recurring task created and assigned");
        onSuccess();
        return;
      }

      const payload = {
        ...form,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
        campaignId: form.campaignId || null,
        listId: form.listId || null,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        requestingDepartmentId: form.requestingDepartmentId || null,
        assignedDepartmentId: form.assignedDepartmentId || null,
      };

      const url = editTask ? `/api/tasks/${editTask.id}` : "/api/tasks";
      const method = editTask ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = typeof errData.error === "string" ? errData.error : "Failed to save task";
        throw new Error(msg);
      }

      const { data: savedTask } = await res.json();

      if (!editTask && pendingFiles.length > 0 && savedTask?.id) {
        await Promise.all(pendingFiles.map((f) =>
          fetch(`/api/tasks/${savedTask.id}/attachments/cloud`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
          })
        ));
      }

      toast.success(editTask ? "Task updated" : "Task created");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save task";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">{editTask ? "Edit Task" : "Create Task"}</h2>
          <div className="flex items-center gap-2">
            {!editTask && (
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV/Excel
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showImport && (
          <ImportTasksModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); onSuccess(); }} />
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Task Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Enter task title..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Description</label>
              <button
                type="button"
                onClick={generateDescription}
                disabled={aiLoading || !form.title.trim()}
                className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {aiLoading ? "Generating…" : "AI Generate"}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Task description..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
            />
            {aiChecklist.length > 0 && (
              <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Suggested checklist
                </p>
                <ul className="space-y-1">
                  {aiChecklist.map((item, i) => (
                    <li key={i} className="text-[12px] text-violet-700 dark:text-violet-300 flex items-start gap-1.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setAiChecklist([])}
                  className="mt-2 text-[11px] text-violet-500 hover:text-violet-700"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Task Type</label>
              <input
                value={form.taskType}
                onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                placeholder="e.g. Content, Design..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Space / Project</label>
              <select
                value={form.campaignId}
                onChange={(e) => setForm({ ...form, campaignId: e.target.value, listId: "" })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              >
                <option value="">No Project</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Folder / List picker — shown when a project is selected */}
          {form.campaignId && (
            <div>
              <label className="block text-sm font-medium mb-1.5">List</label>
              {folders.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">No folders in this project yet</p>
              ) : (
                <div className="relative">
                  <select
                    value={form.listId}
                    onChange={(e) => setForm({ ...form, listId: e.target.value })}
                    className="w-full appearance-none px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                  >
                    <option value="">— No list —</option>
                    {folders.map((folder) => (
                      <optgroup key={folder.id} label={folder.name}>
                        {folder.lists.map((list) => (
                          <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              >
                {["TODO","ASSIGNED","IN_PROGRESS","WAITING_APPROVAL","REVISION_REQUIRED","COMPLETED","BLOCKED"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Est. Hours</label>
                <button
                  type="button"
                  onClick={estimateHours}
                  disabled={estimating || !form.title.trim()}
                  className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {estimating ? "…" : "AI Estimate"}
                </button>
              </div>
              <input
                type="number"
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
              />
            </div>
          </div>

          {/* Team Assignment */}
          {(myDepartments.length > 0 || allDepartments.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Requesting Team</label>
                <select
                  value={form.requestingDepartmentId}
                  onChange={(e) => setForm({ ...form, requestingDepartmentId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                >
                  <option value="">None</option>
                  {myDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Assigned Team</label>
                <select
                  value={form.assignedDepartmentId}
                  onChange={(e) => setForm({ ...form, assignedDepartmentId: e.target.value, assigneeIds: [] })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]"
                >
                  <option value="">None</option>
                  {allDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {form.assignedDepartmentId && (
                  <p className="text-[11px] text-muted-foreground mt-1">Auto-assigned to the team lead</p>
                )}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {form.assignedDepartmentId
                ? `Assign to Specific Person (optional)`
                : "Assign To"}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {(form.assignedDepartmentId
                ? users.filter((u) => u.departmentMemberships?.some((m) => m.departmentId === form.assignedDepartmentId))
                : users
              ).map((u) => (
                <label key={u.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.assigneeIds.includes(u.id)}
                    onChange={() => toggleAssignee(u.id)}
                    className="rounded"
                  />
                  <span className="font-medium text-foreground">{u.name}</span>
                  {u.marketingRole && (
                    <span className="text-xs text-muted-foreground truncate">
                      {u.marketingRole.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                </label>
              ))}
              {form.assignedDepartmentId &&
                users.filter((u) => u.departmentMemberships?.some((m) => m.departmentId === form.assignedDepartmentId)).length === 0 && (
                <p className="col-span-2 text-[12px] text-muted-foreground py-2">No members in this team yet</p>
              )}
            </div>
          </div>

          {/* Recurring toggle — only available when creating a new task */}
          {!editTask && (
            <div>
              <button
                type="button"
                onClick={() => setIsRecurring((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all w-full",
                  isRecurring
                    ? "border-[#e8170b] bg-[#e8170b]/5 text-[#e8170b]"
                    : "border-border text-muted-foreground hover:border-[#e8170b] hover:text-[#e8170b]"
                )}
              >
                <Repeat className="w-4 h-4" />
                {isRecurring ? "Recurring task — click to disable" : "Make this a recurring task"}
              </button>

              {isRecurring && (
                <div className="mt-3">
                  <RecurringBuilder value={recurringConfig} onChange={setRecurringConfig} />
                </div>
              )}
            </div>
          )}

          {/* Cloud file attachments */}
          <div>
            <label className="block text-sm font-medium mb-2">Attach from Cloud</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { void pickGoogleDrive(); }}
                disabled={pickingCloud || !GOOGLE_CLIENT_ID}
                title={!GOOGLE_CLIENT_ID ? "Google Drive not configured" : "Pick from Google Drive"}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 disabled:opacity-40 transition-colors text-[12px] font-medium text-foreground"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                  <path fill="#4285F4" d="M6 2l6 10.4L6 22H0L6 2z"/>
                  <path fill="#0F9D58" d="M18 2l6 20h-6l-6-10.4L18 2z"/>
                  <path fill="#FBBC05" d="M12 12.6L6 22h12l-6-9.4z"/>
                </svg>
                Google Drive
              </button>
              <button
                type="button"
                onClick={() => { void pickOneDrive(); }}
                disabled={pickingCloud || !ONEDRIVE_CLIENT_ID}
                title={!ONEDRIVE_CLIENT_ID ? "OneDrive not configured" : "Pick from OneDrive"}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 disabled:opacity-40 transition-colors text-[12px] font-medium text-foreground"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                  <path fill="#0078D4" d="M12.5 6.5A5.5 5.5 0 0 1 18 12H9A3.5 3.5 0 0 0 5.5 15.5H2.5A5.5 5.5 0 0 1 8 10a5.5 5.5 0 0 1 4.5-3.5z"/>
                  <path fill="#0078D4" d="M9 12h9a3 3 0 0 1 3 3H6a3 3 0 0 1 3-3z" opacity=".6"/>
                </svg>
                OneDrive
              </button>
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded-lg text-[12px]">
                    <Cloud className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 capitalize">{f.source.replace("_", " ")}</span>
                    <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading
                ? "Saving..."
                : editTask
                ? "Update Task"
                : isRecurring
                ? "Create Recurring Task"
                : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

