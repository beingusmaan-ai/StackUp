"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { DocTree } from "@/components/docs/DocTree";
import { DocEditor } from "@/components/docs/DocEditor";

type Doc = {
  id: string;
  title: string;
  icon?: string | null;
  parentId?: string | null;
  content?: unknown;
  updatedAt: string;
  createdBy: { id: string; name: string };
};

function DocsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id") || "";

  const { data, isLoading } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => {
      const res = await fetch("/api/docs");
      return res.json();
    },
  });

  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ["doc", activeId],
    queryFn: async () => {
      const res = await fetch(`/api/docs/${activeId}`);
      return res.json();
    },
    enabled: !!activeId,
  });

  const docs: Doc[] = data?.data || [];
  const activeDoc: Doc | null = docData?.data || null;

  function handleSelect(id: string) {
    if (id) {
      router.push(`/docs?id=${id}`);
    } else {
      router.push("/docs");
    }
  }

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left panel — doc tree */}
      <div className="w-[220px] flex-shrink-0 bg-[#f7f7f7] dark:bg-[#0a1628] border-r border-black/[0.06] dark:border-white/[0.06] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DocTree docs={docs} activeId={activeId} onSelect={handleSelect} />
        )}
      </div>

      {/* Right panel — editor */}
      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        {!activeId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <FileText className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No page selected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a page from the left panel or create a new one
            </p>
          </div>
        ) : docLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeDoc ? (
          <DocEditor key={activeId} doc={activeDoc} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense>
      <DocsContent />
    </Suspense>
  );
}
