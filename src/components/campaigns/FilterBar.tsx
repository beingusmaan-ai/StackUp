"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Trash2, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterField = "status" | "priority" | "assignee" | "assignedBy" | "dueDate";
export type FilterOperator = "is" | "is_not" | "is_empty" | "is_not_empty" | "before" | "after";
export type FilterConnector = "AND" | "OR";

export interface ActiveFilter {
  id: string;
  connector: FilterConnector;
  field: FilterField | null;
  operator: FilterOperator;
  values: string[];
}

interface FilterBarProps {
  filters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
  assignees: { id: string; name: string; image?: string | null }[];
}

const STATUS_OPTIONS = [
  { value: "TODO",               label: "To Do" },
  { value: "ASSIGNED",           label: "Assigned" },
  { value: "IN_PROGRESS",        label: "In Progress" },
  { value: "WAITING_APPROVAL",   label: "Waiting Approval" },
  { value: "REVISION_REQUIRED",  label: "Revision Required" },
  { value: "COMPLETED",          label: "Completed" },
  { value: "BLOCKED",            label: "Blocked" },
  { value: "CANCELLED",          label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH",   label: "High" },
  { value: "URGENT", label: "Urgent" },
];

type FieldDef = {
  key: FilterField;
  label: string;
  operators: { key: FilterOperator; label: string }[];
  valueType: "select" | "date" | "none";
};

const FIELD_DEFS: FieldDef[] = [
  {
    key: "status",
    label: "Status",
    operators: [
      { key: "is",           label: "Is" },
      { key: "is_not",       label: "Is not" },
      { key: "is_empty",     label: "Is empty" },
      { key: "is_not_empty", label: "Is not empty" },
    ],
    valueType: "select",
  },
  {
    key: "priority",
    label: "Priority",
    operators: [
      { key: "is",           label: "Is" },
      { key: "is_not",       label: "Is not" },
      { key: "is_empty",     label: "Is empty" },
      { key: "is_not_empty", label: "Is not empty" },
    ],
    valueType: "select",
  },
  {
    key: "assignee",
    label: "Assignee",
    operators: [
      { key: "is",           label: "Is" },
      { key: "is_not",       label: "Is not" },
      { key: "is_empty",     label: "Is empty" },
      { key: "is_not_empty", label: "Is not empty" },
    ],
    valueType: "select",
  },
  {
    key: "assignedBy",
    label: "Assigned by",
    operators: [
      { key: "is",           label: "Is" },
      { key: "is_not",       label: "Is not" },
      { key: "is_empty",     label: "Is empty" },
      { key: "is_not_empty", label: "Is not empty" },
    ],
    valueType: "select",
  },
  {
    key: "dueDate",
    label: "Due date",
    operators: [
      { key: "is",           label: "Is" },
      { key: "before",       label: "Before" },
      { key: "after",        label: "After" },
      { key: "is_empty",     label: "Is empty" },
      { key: "is_not_empty", label: "Is not empty" },
    ],
    valueType: "date",
  },
];

function newFilter(connector: FilterConnector = "AND"): ActiveFilter {
  return {
    id: Math.random().toString(36).slice(2),
    connector,
    field: null,
    operator: "is",
    values: [],
  };
}

// ── Click-outside hook ───────────────────────────────────────────────────────
function useClickOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

// ── AND / OR connector dropdown ──────────────────────────────────────────────
function ConnectorDropdown({
  value,
  onChange,
}: {
  value: FilterConnector;
  onChange: (v: FilterConnector) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:border-[#e8170b]/40 transition-colors w-16"
      >
        <span className="flex-1 text-left">{value}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-20 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
          {(["AND", "OR"] as FilterConnector[]).map((v) => (
            <button
              key={v}
              onClick={() => { onChange(v); setOpen(false); }}
              className={cn(
                "w-full px-3 py-2 text-xs font-semibold text-left hover:bg-muted/60 transition-colors",
                v === value && "text-[#e8170b]"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field dropdown with search ───────────────────────────────────────────────
function FieldDropdown({
  value,
  onChange,
  autoOpen,
}: {
  value: FilterField | null;
  onChange: (f: FilterField) => void;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen ?? false);
  const [search, setSearch] = useState("");
  const ref = useClickOutside(() => { setOpen(false); setSearch(""); });

  const filtered = FIELD_DEFS.filter((d) =>
    d.label.toLowerCase().includes(search.toLowerCase())
  );
  const current = FIELD_DEFS.find((d) => d.key === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:border-[#e8170b]/40 transition-colors min-w-[140px]",
          !current && "text-muted-foreground"
        )}
      >
        <span className="flex-1 text-left">{current?.label ?? "Select filter"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map((d) => (
              <button
                key={d.key}
                onClick={() => { onChange(d.key); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/60 transition-colors",
                  d.key === value && "text-[#e8170b]"
                )}
              >
                {d.label}
                {d.key === value && <span className="text-[#e8170b] text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Value multi-select ───────────────────────────────────────────────────────
function ValueSelect({
  field,
  values,
  onChange,
  assignees,
}: {
  field: FilterField;
  values: string[];
  onChange: (v: string[]) => void;
  assignees: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const options =
    field === "status"
      ? STATUS_OPTIONS
      : field === "priority"
      ? PRIORITY_OPTIONS
      : assignees.map((a) => ({ value: a.id, label: a.name }));

  const label =
    values.length === 0
      ? "Select option"
      : values.length === 1
      ? options.find((o) => o.value === values[0])?.label ?? values[0]
      : `${values.length} selected`;

  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm hover:border-[#e8170b]/40 transition-colors min-w-[160px]",
          values.length === 0 && "text-muted-foreground"
        )}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  values.includes(opt.value) ? "bg-[#e8170b] border-[#e8170b]" : "border-border"
                )}>
                  {values.includes(opt.value) && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single filter row ────────────────────────────────────────────────────────
function FilterRow({
  filter,
  isFirst,
  assignees,
  onUpdate,
  onDelete,
}: {
  filter: ActiveFilter;
  isFirst: boolean;
  assignees: { id: string; name: string; image?: string | null }[];
  onUpdate: (f: ActiveFilter) => void;
  onDelete: () => void;
}) {
  const def = filter.field ? FIELD_DEFS.find((d) => d.key === filter.field) : null;
  const showValue =
    def && (filter.operator === "is" || filter.operator === "is_not" ||
    filter.operator === "before" || filter.operator === "after");

  function changeField(field: FilterField) {
    const newDef = FIELD_DEFS.find((d) => d.key === field)!;
    onUpdate({ ...filter, field, operator: newDef.operators[0].key, values: [] });
  }

  function changeOperator(op: FilterOperator) {
    const clearValues = op === "is_empty" || op === "is_not_empty";
    onUpdate({ ...filter, operator: op, values: clearValues ? [] : filter.values });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Connector / Where label */}
      {isFirst ? (
        <span className="text-xs text-muted-foreground w-16 text-right pr-1 flex-shrink-0">Where</span>
      ) : (
        <ConnectorDropdown
          value={filter.connector}
          onChange={(v) => onUpdate({ ...filter, connector: v })}
        />
      )}

      {/* Field */}
      <FieldDropdown value={filter.field} onChange={changeField} />

      {/* Operator */}
      {def && (
        <select
          value={filter.operator}
          onChange={(e) => changeOperator(e.target.value as FilterOperator)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none hover:border-[#e8170b]/40 transition-colors cursor-pointer"
        >
          {def.operators.map((op) => (
            <option key={op.key} value={op.key}>{op.label}</option>
          ))}
        </select>
      )}

      {/* Value */}
      {showValue && def!.valueType === "select" && (
        <ValueSelect
          field={filter.field!}
          values={filter.values}
          onChange={(v) => onUpdate({ ...filter, values: v })}
          assignees={assignees}
        />
      )}
      {showValue && def!.valueType === "date" && (
        <input
          type="date"
          value={filter.values[0] ?? ""}
          onChange={(e) => onUpdate({ ...filter, values: e.target.value ? [e.target.value] : [] })}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none hover:border-[#e8170b]/40 focus:border-[#e8170b]/60 transition-colors"
        />
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors ml-auto"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Add nested filter row ────────────────────────────────────────────────────
function AddNestedFilter({ onAdd }: { onAdd: (connector: FilterConnector) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useClickOutside(() => { setOpen(false); setSearch(""); });

  const filtered = FIELD_DEFS.filter((d) =>
    d.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#e8170b] transition-colors pl-[72px]"
      >
        <Plus className="w-3.5 h-3.5" />
        Add nested filter
      </button>
      {open && (
        <div className="absolute bottom-full left-[72px] mb-1 z-50 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  // Add with AND connector by default; user can change it
                  const f = newFilter("AND");
                  const def = FIELD_DEFS.find((fd) => fd.key === d.key)!;
                  onAdd("AND");
                  setOpen(false);
                  setSearch("");
                  void def; void f;
                }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FilterBar ───────────────────────────────────────────────────────────
export function FilterBar({ filters, onChange, assignees }: FilterBarProps) {
  function addFilter() {
    onChange([...filters, newFilter(filters.length === 0 ? "AND" : "AND")]);
  }

  function updateFilter(id: string, updated: ActiveFilter) {
    onChange(filters.map((f) => (f.id === id ? updated : f)));
  }

  function removeFilter(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="px-5 py-3 border-b border-border bg-muted/20 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          Filters
          {filters.length > 0 && (
            <span className="bg-[#e8170b] text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold">
              {filters.length}
            </span>
          )}
        </span>
        {filters.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {filters.map((f, i) => (
        <FilterRow
          key={f.id}
          filter={f}
          isFirst={i === 0}
          assignees={assignees}
          onUpdate={(updated) => updateFilter(f.id, updated)}
          onDelete={() => removeFilter(f.id)}
        />
      ))}

      <AddNestedFilter onAdd={addFilter} />
    </div>
  );
}

// ── Filter application helper ────────────────────────────────────────────────
export function applyFilters<T extends {
  status: string;
  priority: string;
  dueDate?: string | null;
  assignees: { user: { id: string } }[];
  createdBy?: { id: string } | null;
}>(tasks: T[], filters: ActiveFilter[]): T[] {
  const active = filters.filter((f) => f.field);
  if (active.length === 0) return tasks;

  return tasks.filter((task) => {
    let result = matchFilter(task, active[0]);
    for (let i = 1; i < active.length; i++) {
      const m = matchFilter(task, active[i]);
      result = active[i].connector === "AND" ? result && m : result || m;
    }
    return result;
  });
}

function matchFilter<T extends {
  status: string;
  priority: string;
  dueDate?: string | null;
  assignees: { user: { id: string } }[];
  createdBy?: { id: string } | null;
}>(task: T, f: ActiveFilter): boolean {
  if (f.field === "status") {
    if (f.operator === "is")           return f.values.includes(task.status);
    if (f.operator === "is_not")       return !f.values.includes(task.status);
    if (f.operator === "is_empty")     return !task.status;
    if (f.operator === "is_not_empty") return !!task.status;
  }
  if (f.field === "priority") {
    if (f.operator === "is")           return f.values.includes(task.priority);
    if (f.operator === "is_not")       return !f.values.includes(task.priority);
    if (f.operator === "is_empty")     return !task.priority;
    if (f.operator === "is_not_empty") return !!task.priority;
  }
  if (f.field === "assignee") {
    const ids = task.assignees.map((a) => a.user.id);
    if (f.operator === "is")           return f.values.some((v) => ids.includes(v));
    if (f.operator === "is_not")       return !f.values.some((v) => ids.includes(v));
    if (f.operator === "is_empty")     return ids.length === 0;
    if (f.operator === "is_not_empty") return ids.length > 0;
  }
  if (f.field === "assignedBy") {
    const cid = task.createdBy?.id ?? null;
    if (f.operator === "is")           return !!cid && f.values.includes(cid);
    if (f.operator === "is_not")       return !cid || !f.values.includes(cid);
    if (f.operator === "is_empty")     return !cid;
    if (f.operator === "is_not_empty") return !!cid;
  }
  if (f.field === "dueDate") {
    if (f.operator === "is_empty")     return !task.dueDate;
    if (f.operator === "is_not_empty") return !!task.dueDate;
    if (!task.dueDate || !f.values[0]) return false;
    const td = new Date(task.dueDate).toDateString();
    const fd = new Date(f.values[0]).toDateString();
    const tdMs = new Date(task.dueDate).getTime();
    const fdMs = new Date(f.values[0]).getTime();
    if (f.operator === "is")     return td === fd;
    if (f.operator === "before") return tdMs < fdMs;
    if (f.operator === "after")  return tdMs > fdMs;
  }
  return true;
}
