"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { DocEditor } from "@/components/docs/DocEditor";
import { DocTree } from "@/components/docs/DocTree";

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
  content?: unknown;
  isPublic?: boolean;
  updatedAt: string;
  createdBy: { name: string };
};

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: docsData } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => { const r = await fetch("/api/docs"); return r.json(); },
  });

  const { data: docData, isLoading } = useQuery({
    queryKey: ["doc", id],
    queryFn: async () => { const r = await fetch(`/api/docs/${id}`); return r.json(); },
    enabled: !!id,
  });

  const docs: Doc[] = docsData?.data || [];
  const doc: Doc | null = docData?.data || null;

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left tree panel */}
      <div className="w-[200px] flex-shrink-0 bg-[#f7f7f7] dark:bg-[#0a1628] border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col overflow-hidden">
        <button
          onClick={() => router.push("/docs")}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground border-b border-black/[0.06] dark:border-white/[0.06] transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> All Docs
        </button>
        <DocTree docs={docs} activeId={id} onSelect={(newId) => router.push(`/docs/${newId}`)} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : doc ? (
          <DocEditor key={id} doc={doc} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Document not found or access denied</p>
          </div>
        )}
      </div>
    </div>
  );
}
