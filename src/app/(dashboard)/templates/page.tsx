"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { UseTemplateModal } from "@/components/templates/UseTemplateModal";
import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "TASK", label: "Task Bundles" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "CUSTOM", label: "Custom" },
];

interface TemplateTask {
  id: string;
  title: string;
  assignedRole?: string | null;
  priority: string;
  estimatedHours?: number | null;
  dayOffset?: number | null;
}

interface Template {
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
  groups: { name: string; tasks: TemplateTask[] }[];
  createdBy: { name: string };
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { activeTeamId } = useUIStore();
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates", category, search, activeTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "ALL") params.set("category", category);
      if (search) params.set("search", search);
      if (activeTeamId) params.set("departmentId", activeTeamId);
      const res = await fetch(`/api/templates?${params}`);
      return res.json();
    },
  });

  const templates: Template[] = data?.data || [];

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Template duplicated");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch {
      toast.error("Failed to duplicate");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div>
      <PageHeader
        title="Template Library"
        subtitle="Reusable workflows — one click to generate a full task structure"
        actions={
          <Link
            href="/templates/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mt-5 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                category === c.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-background border border-border rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Layers className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">No templates yet</p>
          <p className="text-sm mt-1">Create your first template or use a prebuilt one.</p>
          <Link
            href="/templates/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#e8170b] text-white rounded-xl text-sm font-medium hover:bg-[#c91409] transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Template
          </Link>
        </div>
      ) : (
        <>
          {/* Built-in section */}
          {templates.some((t) => t.isBuiltIn) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Built-in Templates</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {templates.filter((t) => t.isBuiltIn).map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onUse={() => setActiveTemplate(t)}
                    onDuplicate={() => handleDuplicate(t.id)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom section */}
          {templates.some((t) => !t.isBuiltIn) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Custom Templates</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {templates.filter((t) => !t.isBuiltIn).map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onUse={() => setActiveTemplate(t)}
                    onDuplicate={() => handleDuplicate(t.id)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTemplate && (
        <UseTemplateModal
          template={activeTemplate}
          onClose={() => setActiveTemplate(null)}
          onSuccess={() => setActiveTemplate(null)}
        />
      )}
    </div>
  );
}
