"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FilePlus, Search, Globe, Lock, MoreHorizontal, Trash2,
  ChevronDown, FileText, Users,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";

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

  const childCount = (id: string) => docs.filter((d) => d.parentId === id).length;
  const rootDocs = docs.filter((d) => !d.parentId);
  const filtered = search
    ? docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : rootDocs;

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

      {/* Search + filter bar */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {filtered.length} doc{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs…"
            className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] w-56"
          />
        </div>
      </div>

      {/* Docs table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_100px_80px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
          <span className="text-xs font-semibold text-muted-foreground">Name</span>
          <span className="text-xs font-semibold text-muted-foreground">Date updated</span>
          <span className="text-xs font-semibold text-muted-foreground">Created by</span>
          <span className="text-xs font-semibold text-muted-foreground">Sharing</span>
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
                  className="grid grid-cols-[1fr_140px_100px_80px] gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group relative items-center"
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

                  {/* Date updated */}
                  <span className="text-xs text-muted-foreground">{formatRelative(doc.updatedAt)}</span>

                  {/* Created by */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserAvatar name={doc.createdBy.name} size="xs" />
                    <span className="text-xs text-muted-foreground truncate">{doc.createdBy.name.split(" ")[0]}</span>
                  </div>

                  {/* Sharing */}
                  <div className="flex items-center gap-2">
                    {doc.isPublic ? (
                      <span title="Public link enabled"><Globe className="w-3.5 h-3.5 text-green-500" /></span>
                    ) : (
                      <span title="Private"><Lock className="w-3.5 h-3.5 text-muted-foreground/40" /></span>
                    )}

                    {/* ⋯ menu */}
                    <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === doc.id ? null : doc.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpenId === doc.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-background border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                          <button
                            onClick={() => { router.push(`/docs/${doc.id}`); setMenuOpenId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> Open
                          </button>
                          {isOwn && (
                            <button
                              onClick={() => { if (confirm("Delete this doc?")) { deleteDoc.mutate(doc.id); setMenuOpenId(null); } }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
