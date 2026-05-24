"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Layers, Clock, Users, Copy, Edit2, Archive, Trash2,
  Zap, MoreHorizontal, Sparkles,
} from "lucide-react";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  CAMPAIGN: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  TASK: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  DEPARTMENT: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  CUSTOM: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  CAMPAIGN: "Project",
  TASK: "Task Bundle",
  DEPARTMENT: "Department",
  CUSTOM: "Custom",
};

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description?: string | null;
    category: string;
    taskCount: number;
    estimatedDays?: number | null;
    isBuiltIn: boolean;
    useCount: number;
    lastUsedAt?: string | null;
    department?: { name: string; color: string } | null;
    groups: { name: string; tasks: { assignedRole?: string | null }[] }[];
    createdBy: { name: string };
  };
  onUse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function TemplateCard({ template, onUse, onDuplicate, onDelete }: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const uniqueRoles = Array.from(
    new Set(
      template.groups.flatMap((g) =>
        g.tasks.map((t) => t.assignedRole).filter(Boolean)
      )
    )
  ) as string[];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group flex flex-col">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", CATEGORY_COLORS[template.category])}>
            {CATEGORY_LABELS[template.category]}
          </span>
          {template.isBuiltIn && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              <Sparkles className="w-2.5 h-2.5" />
              Built-in
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 w-40 bg-background border border-border rounded-xl shadow-lg z-10 overflow-hidden"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <Link
                href={`/templates/${template.id}/edit`}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Link>
              <button
                onClick={() => { onDuplicate(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              {!template.isBuiltIn && (
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground mb-1 text-[15px] leading-snug">{template.name}</h3>

      {template.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
      )}

      {/* Groups preview */}
      {template.groups.length > 0 && (
        <div className="mb-3 space-y-0.5">
          {template.groups.slice(0, 3).map((g, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{g.name}</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>{g.tasks.length} tasks</span>
            </div>
          ))}
          {template.groups.length > 3 && (
            <p className="text-xs text-muted-foreground pl-4">+{template.groups.length - 3} more groups</p>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto mb-4">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {template.taskCount} tasks
        </span>
        {template.estimatedDays && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ~{template.estimatedDays}d
          </span>
        )}
        {uniqueRoles.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {uniqueRoles.length} role{uniqueRoles.length !== 1 ? "s" : ""}
          </span>
        )}
        {template.department && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: template.department.color }} />
            {template.department.name}
          </span>
        )}
      </div>

      {/* Use button */}
      <button
        onClick={onUse}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        Use Template
      </button>

      {template.useCount > 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-1.5">
          Used {template.useCount} time{template.useCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
