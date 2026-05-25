"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Megaphone, List } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { useUIStore } from "@/store/ui-store";

interface Folder {
  id: string;
  name: string;
  color: string;
  campaign: { id: string; name: string };
  _count: { lists: number };
}

export default function FoldersPage() {
  const { activeTeamId } = useUIStore();
  const { data, isLoading } = useQuery<{ data: Folder[] }>({
    queryKey: ["all-folders", activeTeamId],
    queryFn: () => {
      const url = activeTeamId ? `/api/folders?departmentId=${activeTeamId}` : "/api/folders";
      return fetch(url).then((r) => r.json());
    },
  });

  const folders = data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader title="Folders" subtitle="All folders across your projects" />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : folders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-gray-400">
          <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No folders yet</p>
          <p className="text-xs mt-1">Create folders inside a project to organize your lists.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/campaigns/${folder.campaign.id}`}
              className="group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: folder.color + "20" }}
                >
                  <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#e8170b] transition-colors">
                    {folder.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Megaphone className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400 truncate">{folder.campaign.name}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <List className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{folder._count.lists} list{folder._count.lists !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
