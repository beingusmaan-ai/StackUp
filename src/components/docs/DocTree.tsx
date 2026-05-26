"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Trash2, FileText, MoreHorizontal, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
};

type TreeDoc = Doc & { children: TreeDoc[] };

interface DocTreeProps {
  docs: Doc[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function buildTree(docs: Doc[]): TreeDoc[] {
  const map = new Map<string, TreeDoc>();
  docs.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: TreeDoc[] = [];
  docs.forEach((d) => {
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children.push(map.get(d.id)!);
    } else {
      roots.push(map.get(d.id)!);
    }
  });
  return roots;
}

interface TreeNodeProps {
  node: TreeDoc;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}

function TreeNode({ node, activeId, onSelect, onCreateChild, onDelete, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === activeId;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer text-sm transition-colors relative",
          isActive
            ? "bg-[#e8170b]/10 text-[#e8170b]"
            : "text-gray-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className={cn("w-4 h-4 flex items-center justify-center flex-shrink-0 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors", !hasChildren && "invisible")}
        >
          <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && hasChildren && "rotate-90")} />
        </button>

        {/* Icon + title */}
        <span className="text-sm flex-shrink-0">{node.icon || <FileText className="w-3.5 h-3.5" />}</span>
        <span className="flex-1 truncate text-[13px]">{node.title || "Untitled"}</span>

        {/* Actions (hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onCreateChild(node.id)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Add sub-page"
          >
            <Plus className="w-3 h-3" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1e293b] border border-black/10 dark:border-white/10 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <button
                  onClick={() => { onCreateChild(node.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <FilePlus className="w-3.5 h-3.5" /> Add sub-page
                </button>
                <button
                  onClick={() => { onDelete(node.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              activeId={activeId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocTree({ docs, activeId, onSelect }: DocTreeProps) {
  const queryClient = useQueryClient();

  const createDoc = useMutation({
    mutationFn: async (parentId?: string) => {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", parentId: parentId ?? null }),
      });
      return res.json();
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["docs"] });
      onSelect(data.id);
    },
    onError: () => toast.error("Failed to create page"),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs"] }),
    onError: () => toast.error("Failed to delete page"),
  });

  function handleDelete(id: string) {
    if (!confirm("Delete this page? Sub-pages will become top-level pages.")) return;
    if (activeId === id) onSelect("");
    deleteDoc.mutate(id);
  }

  const tree = buildTree(docs);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest">Docs</span>
        <button
          onClick={() => createDoc.mutate(undefined)}
          disabled={createDoc.isPending}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          title="New page"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5 scrollbar-none">
        {docs.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-white/20" />
            <p className="text-[12px] text-gray-400 dark:text-white/30 mb-2">No pages yet</p>
            <button
              onClick={() => createDoc.mutate(undefined)}
              className="text-[11px] text-[#e8170b] hover:underline"
            >
              Create your first page
            </button>
          </div>
        ) : (
          tree.map((node: TreeDoc) => (
            <TreeNode
              key={node.id}
              node={node}
              activeId={activeId}
              onSelect={onSelect}
              onCreateChild={(parentId) => createDoc.mutate(parentId)}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* New page button */}
      {docs.length > 0 && (
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-2 flex-shrink-0">
          <button
            onClick={() => createDoc.mutate(undefined)}
            disabled={createDoc.isPending}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] text-gray-400 dark:text-white/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New page
          </button>
        </div>
      )}
    </div>
  );
}
