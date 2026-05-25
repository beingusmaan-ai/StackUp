"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED"];

interface ParsedTask {
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  taskType?: string;
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

export function ImportTasksModal({ onClose, onSuccess }: ImportTasksModalProps) {
  const { activeTeamId } = useUIStore();
  const [rows, setRows] = useState<ParsedTask[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Title", "Description", "Priority", "Status", "Due Date", "Start Date", "Estimated Hours", "Task Type"],
      ["Write a blog post", "SEO article on Q3 trends", "HIGH", "TODO", "2026-06-15", "2026-06-01", "4", "Content"],
      ["Design landing page", "", "MEDIUM", "TODO", "2026-06-20", "", "6", "Design"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "task_import_template.xlsx");
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (raw.length === 0) { toast.error("No data rows found"); return; }

        const normalize = (obj: Record<string, unknown>, key: string): unknown =>
          obj[key] ?? obj[key.toLowerCase()] ?? obj[key.toUpperCase()] ?? "";

        const parsed: ParsedTask[] = raw.map((row) => {
          const title = String(normalize(row, "Title")).trim();
          const priorityRaw = String(normalize(row, "Priority")).trim().toUpperCase();
          const statusRaw = String(normalize(row, "Status")).trim().toUpperCase().replace(/[\s-]/g, "_");
          const estRaw = normalize(row, "Estimated Hours");
          const est = estRaw !== "" ? parseFloat(String(estRaw)) : undefined;
          return {
            title,
            description: String(normalize(row, "Description")).trim() || undefined,
            priority: PRIORITIES.includes(priorityRaw) ? priorityRaw : "MEDIUM",
            status: STATUSES.includes(statusRaw) ? statusRaw : "TODO",
            dueDate: parseDate(normalize(row, "Due Date")),
            startDate: parseDate(normalize(row, "Start Date")),
            estimatedHours: est && !isNaN(est) ? est : undefined,
            taskType: String(normalize(row, "Task Type")).trim() || undefined,
            error: !title ? "Title is required" : undefined,
          };
        }).filter((r) => r.title || r.error);

        setRows(parsed);
      } catch {
        toast.error("Could not parse file — check the format");
      }
    };
    reader.readAsArrayBuffer(file);
  }

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
            description: r.description,
            priority: r.priority,
            status: r.status,
            dueDate: r.dueDate ?? null,
            startDate: r.startDate ?? null,
            estimatedHours: r.estimatedHours ?? null,
            taskType: r.taskType ?? null,
            assigneeIds: [],
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
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
              <p className="text-[11px] text-muted-foreground">Columns: Title, Description, Priority, Status, Due Date, Start Date, Estimated Hours, Task Type</p>
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
                <p className="text-[12px] font-medium">
                  {validCount} ready to import
                  {errorCount > 0 && <span className="text-red-500 ml-1">· {errorCount} with errors (will be skipped)</span>}
                </p>
                <button onClick={() => setRows([])} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  Change file
                </button>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-6"></th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Priority</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Est. Hrs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => (
                        <tr key={i} className={r.error ? "bg-red-50 dark:bg-red-950/20" : ""}>
                          <td className="px-3 py-1.5 text-center">
                            {r.error
                              ? <AlertCircle className="w-3.5 h-3.5 text-red-500 inline" />
                              : <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />}
                          </td>
                          <td className="px-3 py-1.5 font-medium max-w-[160px] truncate">
                            {r.title || <span className="text-red-500 italic">Missing</span>}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.priority}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.status}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.dueDate ?? "—"}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.estimatedHours ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

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
