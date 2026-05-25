"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED"];

interface LookupUser { id: string; name: string; email: string }
interface LookupCampaign { id: string; name: string }
interface LookupList { id: string; name: string; campaignId: string | null }

interface ParsedTask {
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  taskType?: string;
  // raw strings from CSV
  rawAssignees: string;
  rawProject: string;
  rawList: string;
  // resolved IDs
  assigneeIds: string[];
  campaignId?: string;
  listId?: string;
  // warnings for unresolved values
  warnings: string[];
  error?: string;
}

interface ImportTasksModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function parseDate(val: unknown): string | undefined {
  if (!val && val !== 0) return undefined;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString().split("T")[0];
}

function norm(obj: Record<string, unknown>, key: string): unknown {
  return obj[key] ?? obj[key.toLowerCase()] ?? obj[key.toUpperCase()] ??
    obj[key.replace(/ /g, "_")] ?? obj[key.replace(/ /g, "")] ?? "";
}

export function ImportTasksModal({ onClose, onSuccess }: ImportTasksModalProps) {
  const { activeTeamId } = useUIStore();
  const [users, setUsers] = useState<LookupUser[]>([]);
  const [campaigns, setCampaigns] = useState<LookupCampaign[]>([]);
  const [lists, setLists] = useState<LookupList[]>([]);
  const [lookupReady, setLookupReady] = useState(false);
  const [rows, setRows] = useState<ParsedTask[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch lookup tables on mount
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTeamId) params.set("departmentId", activeTeamId);

    Promise.all([
      fetch(`/api/users?activeOnly=true`).then((r) => r.json()),
      fetch(`/api/campaigns?${params}`).then((r) => r.json()),
      fetch(`/api/lists?${params}`).then((r) => r.json()),
    ]).then(([u, c, l]) => {
      setUsers((u.data ?? u ?? []).map((x: LookupUser) => ({ id: x.id, name: x.name, email: x.email })));
      setCampaigns((c.data ?? c ?? []).map((x: LookupCampaign) => ({ id: x.id, name: x.name })));
      setLists((l.data ?? l ?? []).map((x: { id: string; name: string; folder?: { campaign?: { id: string } } }) => ({
        id: x.id,
        name: x.name,
        campaignId: x.folder?.campaign?.id ?? null,
      })));
      setLookupReady(true);
    }).catch(() => setLookupReady(true));
  }, [activeTeamId]);

  function resolve(raw: ParsedTask, userList: LookupUser[], campaignList: LookupCampaign[], listList: LookupList[]): ParsedTask {
    const warnings: string[] = [];

    // Assignees: comma-separated emails or names
    let assigneeIds: string[] = [];
    if (raw.rawAssignees) {
      const parts = raw.rawAssignees.split(",").map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const found = userList.find(
          (u) => u.email.toLowerCase() === part.toLowerCase() || u.name.toLowerCase() === part.toLowerCase()
        );
        if (found) assigneeIds.push(found.id);
        else warnings.push(`Assignee "${part}" not found`);
      }
    }

    // Project
    let campaignId: string | undefined;
    if (raw.rawProject) {
      const found = campaignList.find((c) => c.name.toLowerCase() === raw.rawProject.toLowerCase());
      if (found) campaignId = found.id;
      else warnings.push(`Project "${raw.rawProject}" not found`);
    }

    // List
    let listId: string | undefined;
    if (raw.rawList) {
      const found = listList.find((l) => {
        if (l.name.toLowerCase() !== raw.rawList.toLowerCase()) return false;
        if (campaignId && l.campaignId && l.campaignId !== campaignId) return false;
        return true;
      });
      if (found) listId = found.id;
      else warnings.push(`List "${raw.rawList}" not found`);
    }

    return { ...raw, assigneeIds, campaignId, listId, warnings };
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Title", "Description", "Priority", "Status", "Due Date", "Start Date", "Estimated Hours", "Task Type", "Assignee Email", "Project", "List"],
      ["Write a blog post", "SEO article on Q3 trends", "HIGH", "TODO", "2026-06-15", "2026-06-01", "4", "Content", "ahmed@example.com", "Q3 Campaign", "Content Tasks"],
      ["Design landing page", "", "MEDIUM", "TODO", "2026-06-20", "", "6", "Design", "", "", ""],
    ]);
    ws["!cols"] = [
      { wch: 26 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "task_import_template.xlsx");
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (!raw.length) { toast.error("No data rows found"); return; }

        const parsed: ParsedTask[] = raw.map((row) => {
          const title = String(norm(row, "Title")).trim();
          const priorityRaw = String(norm(row, "Priority")).trim().toUpperCase();
          const statusRaw = String(norm(row, "Status")).trim().toUpperCase().replace(/[\s-]/g, "_");
          const estRaw = norm(row, "Estimated Hours");
          const est = estRaw !== "" ? parseFloat(String(estRaw)) : undefined;

          const base: ParsedTask = {
            title,
            description: String(norm(row, "Description")).trim() || undefined,
            priority: PRIORITIES.includes(priorityRaw) ? priorityRaw : "MEDIUM",
            status: STATUSES.includes(statusRaw) ? statusRaw : "TODO",
            dueDate: parseDate(norm(row, "Due Date")),
            startDate: parseDate(norm(row, "Start Date")),
            estimatedHours: est && !isNaN(est) ? est : undefined,
            taskType: String(norm(row, "Task Type")).trim() || undefined,
            rawAssignees: String(norm(row, "Assignee Email")).trim(),
            rawProject: String(norm(row, "Project")).trim(),
            rawList: String(norm(row, "List")).trim(),
            assigneeIds: [],
            warnings: [],
            error: !title ? "Title is required" : undefined,
          };
          return lookupReady ? resolve(base, users, campaigns, lists) : base;
        }).filter((r) => r.title || r.error);

        setRows(parsed);
      } catch {
        toast.error("Could not parse file — check the format");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Re-resolve if lookups arrive after file was already parsed
  useEffect(() => {
    if (lookupReady && rows.length > 0) {
      setRows((prev) => prev.map((r) => resolve(r, users, campaigns, lists)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupReady]);

  async function handleImport() {
    const valid = rows.filter((r) => !r.error);
    if (!valid.length) return;
    setImporting(true);
    setProgress(0);
    let succeeded = 0;
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: r.title,
            description: r.description ?? null,
            priority: r.priority,
            status: r.status,
            dueDate: r.dueDate ?? null,
            startDate: r.startDate ?? null,
            estimatedHours: r.estimatedHours ?? null,
            taskType: r.taskType ?? null,
            campaignId: r.campaignId ?? null,
            listId: r.listId ?? null,
            assigneeIds: r.assigneeIds,
            requestingDepartmentId: activeTeamId ?? null,
          }),
        });
        if (res.ok) succeeded++;
      } catch { /* continue */ }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setImporting(false);
    toast.success(`Imported ${succeeded} task${succeeded !== 1 ? "s" : ""}`);
    onSuccess();
    onClose();
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => !!r.error).length;
  const warnCount = rows.filter((r) => !r.error && r.warnings.length > 0).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold">Import Tasks</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Upload a CSV or Excel file to bulk-create tasks</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-xl border border-border">
            <div>
              <p className="text-[12px] font-medium">Download template</p>
              <p className="text-[11px] text-muted-foreground">
                Title, Description, Priority, Status, Due Date, Start Date, Est. Hours, Task Type, <span className="font-medium text-foreground">Assignee Email, Project, List</span>
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-[12px] font-medium transition-colors flex-shrink-0 ml-4"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 && (
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-[#e8170b]/50 hover:bg-[#e8170b]/[0.02] transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-[13px] font-medium">Drop your file here or click to browse</p>
              <p className="text-[11px] text-muted-foreground mt-1">Supports .csv, .xlsx, .xls</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium flex items-center gap-2">
                  <span>{validCount} ready to import</span>
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Info className="w-3 h-3" />{warnCount} with warnings
                    </span>
                  )}
                  {errorCount > 0 && <span className="text-red-500">· {errorCount} errors (skipped)</span>}
                </p>
                <button onClick={() => setRows([])} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  Change file
                </button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-6"></th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Priority</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Assignees</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Project</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">List</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => {
                        const hasWarning = !r.error && r.warnings.length > 0;
                        return (
                          <tr key={i} className={r.error ? "bg-red-50 dark:bg-red-950/20" : hasWarning ? "bg-amber-50 dark:bg-amber-950/10" : ""}>
                            <td className="px-3 py-1.5 text-center">
                              {r.error
                                ? <span title={r.error}><AlertCircle className="w-3.5 h-3.5 text-red-500 inline" /></span>
                                : hasWarning
                                ? <span title={r.warnings.join(", ")}><Info className="w-3.5 h-3.5 text-amber-500 inline" /></span>
                                : <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />}
                            </td>
                            <td className="px-3 py-1.5 font-medium max-w-[140px] truncate">
                              {r.title || <span className="text-red-500 italic">Missing</span>}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.priority}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.dueDate ?? "—"}</td>
                            <td className="px-3 py-1.5 max-w-[120px] truncate">
                              {r.assigneeIds.length > 0
                                ? <span className="text-green-600 dark:text-green-400">{r.assigneeIds.map(id => users.find(u => u.id === id)?.name ?? id).join(", ")}</span>
                                : r.rawAssignees
                                ? <span className="text-amber-500">{r.rawAssignees} (not found)</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-1.5 max-w-[110px] truncate">
                              {r.campaignId
                                ? <span className="text-green-600 dark:text-green-400">{campaigns.find(c => c.id === r.campaignId)?.name}</span>
                                : r.rawProject
                                ? <span className="text-amber-500">{r.rawProject} (not found)</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-1.5 max-w-[100px] truncate">
                              {r.listId
                                ? <span className="text-green-600 dark:text-green-400">{lists.find(l => l.id === r.listId)?.name}</span>
                                : r.rawList
                                ? <span className="text-amber-500">{r.rawList} (not found)</span>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {warnCount > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  Amber rows will still import — assignee/project/list will be left blank for unresolved values. Hover the icon for details.
                </p>
              )}

              {importing && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#e8170b] transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">{progress}% complete…</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[13px] border border-border hover:bg-muted transition-colors">
            Cancel
          </button>
          {rows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] bg-[#e8170b] text-white font-semibold hover:bg-[#c71209] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Import {validCount} Task{validCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
