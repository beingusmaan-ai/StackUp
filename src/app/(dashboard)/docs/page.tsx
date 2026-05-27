"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FilePlus, Search, Globe, Lock, MoreHorizontal, Trash2,
  ChevronDown, FileText, Megaphone, CheckSquare,
  Pencil, Copy, Link2, FolderInput, X, Share2,
  SlidersHorizontal, ArrowUpDown, User, Calendar, MapPin, Type, Upload,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import { ShareModal } from "@/components/docs/ShareModal";

type FilterField = "title" | "location" | "createdBy" | "dateUpdated";
interface FilterRow { id: string; field: FilterField | ""; value: string }

type SortField = "title" | "updatedAt";
type SortDir = "asc" | "desc";

const FIELD_LABELS: Record<FilterField, string> = {
  title: "Title", location: "Projects", createdBy: "Created by", dateUpdated: "Date updated",
};
const DATE_OPTIONS = [
  { value: "7",   label: "Last 7 days" },
  { value: "30",  label: "Last 30 days" },
  { value: "90",  label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
  isPublic?: boolean;
  updatedAt: string;
  createdAt: string;
  createdById: string;
  createdBy: { id: string; name: string };
  campaign?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
};

const PROJECT_OVERVIEW_CONTENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
    { type: "paragraph", content: [{ type: "text", text: "Describe the main goals of this project..." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Scope" }] },
    { type: "paragraph", content: [{ type: "text", text: "What is included and excluded..." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Milestones" }] },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Milestone 1 — description" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Milestone 2 — description" }] }] },
    ]},
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Team" }] },
    { type: "paragraph", content: [{ type: "text", text: "List team members and their roles..." }] },
  ],
};

const MEETING_NOTES_CONTENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Agenda" }] },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 1" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 2" }] }] },
    ]},
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
    { type: "paragraph", content: [{ type: "text", text: "Meeting notes go here..." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Action Items" }] },
    { type: "taskList", content: [
      { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 1 — Owner" }] }] },
      { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 2 — Owner" }] }] },
    ]},
  ],
};

const GUIDELINES_CONTENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Purpose" }] },
    { type: "paragraph", content: [{ type: "text", text: "Explain the purpose of these guidelines..." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Standards" }] },
    { type: "orderedList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 1" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 2" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Standard 3" }] }] },
    ]},
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Do's and Don'ts" }] },
    { type: "paragraph", content: [{ type: "text", text: "List key do's and don'ts..." }] },
  ],
};

const TEMPLATES = [
  {
    id: "project-overview",
    icon: "🎯",
    title: "Project Overview",
    desc: "Summarize goals, scope, and milestones",
    bg: "from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30",
    content: PROJECT_OVERVIEW_CONTENT,
  },
  {
    id: "meeting-notes",
    icon: "📝",
    title: "Meeting Notes",
    desc: "Capture an agenda, notes, and action items",
    bg: "from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30",
    content: MEETING_NOTES_CONTENT,
  },
  {
    id: "guidelines",
    icon: "📋",
    title: "Guidelines",
    desc: "Outline standards and best practices",
    bg: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
    content: GUIDELINES_CONTENT,
  },
];

export default function DocsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showTemplates, setShowTemplates] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<{ id: string; title: string } | null>(null);
  const [moveCampaigns, setMoveCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [moveTasks, setMoveTasks] = useState<{ id: string; title: string }[]>([]);
  const [moveTab, setMoveTab] = useState<"campaign" | "task">("campaign");
  const [moveSearch, setMoveSearch] = useState("");

  // Filter & sort state
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filterCampaigns, setFilterCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => { const r = await fetch("/api/docs"); return r.json(); },
  });
  const docs: Doc[] = data?.data || [];

  const createDoc = useMutation({
    mutationFn: async (opts: { title: string; content?: object; icon?: string }) => {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      return res.json();
    },
    onSuccess: ({ data: newDoc }) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      router.push(`/docs/${newDoc.id}`);
    },
    onError: () => toast.error("Failed to create doc"),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const renameDoc = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs"] }),
    onError: () => toast.error("Failed to rename"),
  });

  const duplicateDoc = useMutation({
    mutationFn: async (doc: Doc) => {
      const full = await fetch(`/api/docs/${doc.id}`).then((r) => r.json());
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${doc.title} (Copy)`,
          icon: doc.icon,
          content: full.data?.content,
        }),
      });
      return res.json();
    },
    onSuccess: ({ data: newDoc }) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc duplicated");
      router.push(`/docs/${newDoc.id}`);
    },
    onError: () => toast.error("Failed to duplicate"),
  });

  const moveDoc = useMutation({
    mutationFn: async ({ id, campaignId, taskId }: { id: string; campaignId?: string; taskId?: string }) => {
      await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaignId ?? "", taskId: taskId ?? "" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      toast.success("Doc moved");
      setShowMoveModal(null);
    },
    onError: () => toast.error("Failed to move"),
  });

  const openMoveModal = (doc: Doc) => {
    setShowMoveModal({ id: doc.id, title: doc.title });
    setMoveTab("campaign");
    setMoveSearch("");
    fetch("/api/campaigns?picker=1").then((r) => r.json()).then((d) =>
      setMoveCampaigns((d.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    );
    fetch("/api/tasks?picker=1").then((r) => r.json()).then((d) =>
      setMoveTasks((d.data || []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
    );
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    if (showSortMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  useEffect(() => {
    if (showFiltersPanel && filterCampaigns.length === 0) {
      fetch("/api/campaigns?picker=1")
        .then((r) => r.json())
        .then((d) => setFilterCampaigns((d.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))));
    }
  }, [showFiltersPanel, filterCampaigns.length]);

  const addFilterRow = () =>
    setFilterRows((prev) => [...prev, { id: Math.random().toString(36).slice(2), field: "", value: "" }]);

  const updateRow = (id: string, patch: Partial<FilterRow>) =>
    setFilterRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) => setFilterRows((prev) => prev.filter((r) => r.id !== id));

  const uniqueCreators = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    docs.forEach((d) => { if (!seen.has(d.createdById)) seen.set(d.createdById, d.createdBy); });
    return Array.from(seen.values());
  }, [docs]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const content = {
        type: "doc",
        content: paragraphs.length > 0
          ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p.replace(/\n/g, " ") }] }))
          : [{ type: "paragraph" }],
      };
      const title = file.name.replace(/\.[^.]+$/, "");
      createDoc.mutate({ title, content, icon: "📄" });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const childCount = (id: string) => docs.filter((d) => d.parentId === id).length;
  const rootDocs = docs.filter((d) => !d.parentId);

  const activeRowCount = filterRows.filter((r) => r.field && r.value).length;

  let filtered = (search
    ? docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : rootDocs
  ).filter((doc) =>
    filterRows.every((row) => {
      if (!row.field || !row.value) return true;
      if (row.field === "title")       return doc.title.toLowerCase().includes(row.value.toLowerCase());
      if (row.field === "location") {
        return doc.campaign?.id === row.value;
      }
      if (row.field === "createdBy")   return doc.createdById === row.value;
      if (row.field === "dateUpdated") {
        const days = parseInt(row.value, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          return new Date(doc.updatedAt) >= cutoff;
        }
      }
      return true;
    })
  );

  filtered = [...filtered].sort((a, b) => {
    const cmp = sortField === "title"
      ? a.title.localeCompare(b.title)
      : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">All Docs</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNewMenu((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New Doc
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showNewMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setShowNewMenu(false); createDoc.mutate({ title: "Untitled", icon: "📄" }); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#e8170b]" /> Blank page
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setShowNewMenu(false); createDoc.mutate({ title: t.title, content: t.content, icon: t.icon }); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="text-base">{t.icon}</span> {t.title}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setShowNewMenu(false); importInputRef.current?.click(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#e8170b]" /> Import doc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Templates
          </button>
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTemplates ? "Hide" : "Show"}
          </button>
        </div>

        {showTemplates && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => createDoc.mutate({ title: t.title, content: t.content, icon: t.icon })}
                disabled={createDoc.isPending}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border border-border bg-gradient-to-br text-left hover:shadow-md transition-all hover:scale-[1.01] disabled:opacity-60",
                  t.bg
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setShowFiltersPanel((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            showFiltersPanel || activeRowCount > 0
              ? "border-[#e8170b] text-[#e8170b] bg-[#e8170b]/5"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeRowCount > 0 && (
            <span className="ml-0.5 min-w-[16px] h-[16px] bg-[#e8170b] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {activeRowCount}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort
            {sortField === "title" ? " (A–Z)" : ""}
            {sortDir === "asc" ? " ↑" : " ↓"}
          </button>
          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-background border border-border rounded-xl shadow-xl z-50 py-1">
              {([
                { field: "updatedAt" as SortField, label: "Date updated" },
                { field: "title"     as SortField, label: "Title (A–Z)" },
              ] as const).map((o) => (
                <button
                  key={o.field}
                  onClick={() => {
                    if (sortField === o.field) setSortDir((d) => d === "asc" ? "desc" : "asc");
                    else { setSortField(o.field); setSortDir("asc"); }
                    setShowSortMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                    sortField === o.field ? "text-[#e8170b] font-medium" : "text-foreground"
                  )}
                >
                  {o.label}
                  {sortField === o.field && <span className="text-[10px] text-muted-foreground">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count + search (right) */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {filtered.length} doc{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs…"
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted text-xs focus:outline-none focus:ring-2 focus:ring-[#e8170b] w-48"
            />
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFiltersPanel && (
        <div className="mb-4 bg-background border border-border rounded-xl shadow-sm p-4">
          <p className="text-sm font-bold text-foreground mb-3">Filters</p>

          {filterRows.length === 0 && (
            <p className="text-xs text-muted-foreground mb-3">No filters yet. Click "+ Add filter" to start.</p>
          )}

          <div className="space-y-2">
            {filterRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">

                {/* Field */}
                <select
                  value={row.field}
                  onChange={(e) => updateRow(row.id, { field: e.target.value as FilterField | "", value: "" })}
                  className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] w-36 cursor-pointer"
                >
                  <option value="">Select field…</option>
                  {(Object.keys(FIELD_LABELS) as FilterField[]).map((f) => (
                    <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] w-16 cursor-pointer"
                  defaultValue="is"
                >
                  <option value="is">Is</option>
                </select>

                {/* Value */}
                {(!row.field) && (
                  <select disabled className="flex-1 px-2.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed">
                    <option>Select value…</option>
                  </select>
                )}
                {row.field === "title" && (
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    placeholder="Enter title…"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b]"
                  />
                )}
                {row.field === "location" && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select project…</option>
                    {filterCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {row.field === "createdBy" && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select person…</option>
                    {uniqueCreators.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
                {row.field === "dateUpdated" && (
                  <select
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#e8170b] cursor-pointer"
                  >
                    <option value="">Select period…</option>
                    {DATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}

                {/* Delete row */}
                <button
                  onClick={() => removeRow(row.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addFilterRow}
            className="mt-3 text-xs text-[#e8170b] font-medium hover:underline"
          >
            + Add filter
          </button>
        </div>
      )}

      {/* Docs table */}
      <div className="bg-card border border-border rounded-2xl">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_140px_110px_36px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 rounded-t-2xl">
          <span className="text-xs font-semibold text-muted-foreground">Name</span>
          <span className="text-xs font-semibold text-muted-foreground">Location</span>
          <span className="text-xs font-semibold text-muted-foreground">Date updated</span>
          <span className="text-xs font-semibold text-muted-foreground">Sharing</span>
          <span />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No docs match your search" : "No docs yet"}
            </p>
            {!search && (
              <button
                onClick={() => createDoc.mutate({ title: "Untitled", icon: "📄" })}
                className="mt-3 text-sm text-[#e8170b] hover:underline"
              >
                Create your first doc
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((doc) => {
              const children = childCount(doc.id);
              const isOwn = doc.createdById === session?.user?.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/docs/${doc.id}`)}
                  className="grid grid-cols-[1fr_160px_140px_110px_36px] gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group relative items-center"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg flex-shrink-0">{doc.icon || "📄"}</span>
                    <span className="text-sm font-medium text-foreground truncate">{doc.title || "Untitled"}</span>
                    {children > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md flex-shrink-0">
                        <FileText className="w-2.5 h-2.5" />{children}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <div className="min-w-0">
                    {doc.campaign ? (
                      <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 truncate">
                        <Megaphone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{doc.campaign.name}</span>
                      </span>
                    ) : doc.task ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 truncate">
                        <CheckSquare className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{doc.task.title}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Date updated */}
                  <span className="text-xs text-muted-foreground">{formatRelative(doc.updatedAt)}</span>

                  {/* Sharing */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShareDoc(doc)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors group/share"
                      title={doc.isPublic ? "Public — click to manage sharing" : "Private — click to share"}
                    >
                      {doc.isPublic ? (
                        <Globe className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/share:text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground group-hover/share:text-foreground transition-colors">
                        {doc.isPublic ? "Public" : "Share"}
                      </span>
                    </button>
                  </div>

                  {/* ⋯ menu — own column */}
                  <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === doc.id ? null : doc.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpenId === doc.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-xl shadow-xl z-50 py-1">
                        <button
                          onClick={() => { router.push(`/docs/${doc.id}`); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Open
                        </button>
                        <button
                          onClick={() => {
                            const newTitle = window.prompt("Rename doc:", doc.title);
                            if (newTitle && newTitle.trim() && newTitle !== doc.title) {
                              renameDoc.mutate({ id: doc.id, title: newTitle.trim() });
                            }
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Rename
                        </button>
                        <button
                          onClick={() => { openMoveModal(doc); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <FolderInput className="w-3.5 h-3.5 text-muted-foreground" /> Move to Project/Task
                        </button>
                        <button
                          onClick={() => { duplicateDoc.mutate(doc); setMenuOpenId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Duplicate
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/docs/${doc.id}`);
                            toast.success("Link copied");
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground" /> Copy Link
                        </button>
                        {isOwn && (
                          <>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => { if (confirm("Delete this doc?")) { deleteDoc.mutate(doc.id); setMenuOpenId(null); } }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareDoc && (
        <ShareModal
          docId={shareDoc.id}
          docTitle={shareDoc.title}
          isPublic={shareDoc.isPublic ?? false}
          createdBy={shareDoc.createdBy}
          onClose={() => { setShareDoc(null); queryClient.invalidateQueries({ queryKey: ["docs"] }); }}
          onPublicToggle={() => queryClient.invalidateQueries({ queryKey: ["docs"] })}
        />
      )}

      {/* Hidden import file input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleImport}
      />

      {/* Move to Project/Task modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMoveModal(null)}>
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate pr-2">Move "{showMoveModal.title}"</p>
              <button onClick={() => setShowMoveModal(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setMoveTab("campaign"); setMoveSearch(""); }}
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  moveTab === "campaign" ? "text-[#e8170b] border-b-2 border-[#e8170b]" : "text-muted-foreground hover:text-foreground")}
              >
                <Megaphone className="w-3.5 h-3.5" /> Projects
              </button>
              <button
                onClick={() => { setMoveTab("task"); setMoveSearch(""); }}
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                  moveTab === "task" ? "text-[#e8170b] border-b-2 border-[#e8170b]" : "text-muted-foreground hover:text-foreground")}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Tasks
              </button>
            </div>

            {/* Search */}
            <div className="p-2">
              <input
                value={moveSearch}
                onChange={(e) => setMoveSearch(e.target.value)}
                placeholder={`Search ${moveTab === "campaign" ? "projects" : "tasks"}…`}
                className="w-full px-3 py-1.5 text-xs bg-muted rounded-lg outline-none"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-52 overflow-y-auto pb-2">
              {moveTab === "campaign"
                ? moveCampaigns
                    .filter((c) => c.name.toLowerCase().includes(moveSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => moveDoc.mutate({ id: showMoveModal.id, campaignId: c.id, taskId: "" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        {c.name}
                      </button>
                    ))
                : moveTasks
                    .filter((t) => t.title.toLowerCase().includes(moveSearch.toLowerCase()))
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => moveDoc.mutate({ id: showMoveModal.id, taskId: t.id, campaignId: "" })}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        {t.title}
                      </button>
                    ))
              }
            </div>

            {/* Remove link footer */}
            <div className="border-t border-border p-2">
              <button
                onClick={() => moveDoc.mutate({ id: showMoveModal.id, campaignId: "", taskId: "" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-lg transition-colors text-left"
              >
                Remove link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
