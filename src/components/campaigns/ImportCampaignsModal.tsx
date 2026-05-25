"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];

interface ParsedCampaign {
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  budget?: number;
  goals?: string;
  error?: string;
}

interface ImportCampaignsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function parseDate(val: unknown): string {
  if (!val && val !== 0) return "";
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

export function ImportCampaignsModal({ onClose, onSuccess }: ImportCampaignsModalProps) {
  const { activeTeamId, activeWorkspaceId } = useUIStore();
  const [rows, setRows] = useState<ParsedCampaign[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Description", "Status", "Start Date", "End Date", "Budget", "Goals"],
      ["Q3 Brand Campaign", "Summer awareness push across all channels", "ACTIVE", today, future, "5000", "Increase brand awareness by 20%"],
      ["Product Launch", "Launch new product line", "DRAFT", today, future, "", ""],
    ]);
    ws["!cols"] = [{ wch: 26 }, { wch: 36 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "project_import_template.xlsx");
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

        const parsed: ParsedCampaign[] = raw.map((row) => {
          const name = String(normalize(row, "Name")).trim();
          const statusRaw = String(normalize(row, "Status")).trim().toUpperCase();
          const status = STATUSES.includes(statusRaw) ? statusRaw : "DRAFT";
          const startDate = parseDate(normalize(row, "Start Date"));
          const endDate = parseDate(normalize(row, "End Date"));
          const budgetRaw = normalize(row, "Budget");
          const budget = budgetRaw !== "" ? parseFloat(String(budgetRaw)) : undefined;

          let error: string | undefined;
          if (!name) error = "Name is required";
          else if (!startDate) error = "Invalid Start Date";
          else if (!endDate) error = "Invalid End Date";

          return {
            name,
            description: String(normalize(row, "Description")).trim() || undefined,
            status,
            startDate,
            endDate,
            budget: budget && !isNaN(budget) ? budget : undefined,
            goals: String(normalize(row, "Goals")).trim() || undefined,
            error,
          };
        }).filter((r) => r.name || r.error);

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
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: r.name,
            description: r.description ?? null,
            status: r.status,
            startDate: r.startDate,
            endDate: r.endDate,
            budget: r.budget ?? null,
            goals: r.goals ?? null,
            departmentId: activeTeamId ?? null,
            workspaceId: activeWorkspaceId ?? null,
          }),
        });
        if (res.ok) succeeded++;
      } catch { /* continue */ }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setImporting(false);
    toast.success(`Imported ${succeeded} project${succeeded !== 1 ? "s" : ""}`);
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
            <h2 className="text-[15px] font-semibold">Import Projects</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Upload a CSV or Excel file to bulk-create projects</p>
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
              <p className="text-[11px] text-muted-foreground">Columns: Name, Description, Status, Start Date, End Date, Budget, Goals</p>
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
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Start Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">End Date</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Budget</th>
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
                            {r.name || <span className="text-red-500 italic">Missing</span>}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.status}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.startDate || <span className="text-red-500">Invalid</span>}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.endDate || <span className="text-red-500">Invalid</span>}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.budget ? `$${r.budget.toLocaleString()}` : "—"}</td>
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
              Import {validCount} Project{validCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
