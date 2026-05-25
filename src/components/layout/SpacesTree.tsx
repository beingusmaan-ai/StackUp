"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Plus, Folder as FolderIcon, Hash,
} from "lucide-react";
import Link from "next/link";

interface TaskList { id: string; name: string; color: string; _count: { tasks: number } }
interface Folder   { id: string; name: string; color: string; lists: TaskList[] }
interface Campaign { id: string; name: string; color?: string; _count: { tasks: number } }

function ListRow({ list, campaignId, active }: { list: TaskList; campaignId: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/campaigns/${campaignId}?list=${list.id}`)}
      className={cn(
        "w-full flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] transition-all text-left group",
        active
          ? "text-[#e8170b] font-semibold bg-[#e8170b]/5"
          : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/65 hover:bg-black/[0.04]"
      )}
    >
      <Hash className={cn("w-3 h-3 flex-shrink-0", active ? "text-[#e8170b]" : "text-gray-300")} />
      <span className="flex-1 truncate">{list.name}</span>
      <span className="text-[9px] text-gray-300 group-hover:text-gray-400 flex-shrink-0">{list._count.tasks}</span>
    </button>
  );
}

function FolderRow({
  folder, campaignId, activeListId,
}: { folder: Folder; campaignId: string; activeListId: string | null }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] text-gray-500 dark:text-white/40 hover:bg-black/[0.04] transition-colors text-left"
      >
        {open
          ? <ChevronDown className="w-3 h-3 flex-shrink-0 text-gray-400" />
          : <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
        }
        <FolderIcon className="w-3 h-3 flex-shrink-0" style={{ color: folder.color }} />
        <span className="flex-1 truncate font-medium">{folder.name}</span>
      </button>
      {open && folder.lists.length > 0 && (
        <div className="ml-3 pl-2 border-l border-gray-200 dark:border-white/10 space-y-0.5">
          {folder.lists.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              campaignId={campaignId}
              active={activeListId === list.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignRow({
  campaign, activeListId, defaultOpen,
}: { campaign: Campaign; activeListId: string | null; defaultOpen: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isOnCampaign = pathname === `/campaigns/${campaign.id}` || pathname.startsWith(`/campaigns/${campaign.id}/`);

  useEffect(() => {
    if (open && !loaded) {
      setLoading(true);
      fetch(`/api/campaigns/${campaign.id}/folders`)
        .then((r) => r.json())
        .then((d) => { setFolders(d.data ?? []); setLoaded(true); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, loaded, campaign.id]);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06] text-gray-400 flex-shrink-0"
        >
          {open
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />
          }
        </button>
        <Link
          href={`/campaigns/${campaign.id}`}
          className={cn(
            "flex-1 flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-[12px] font-medium transition-all truncate",
            isOnCampaign
              ? "bg-white dark:bg-white/[0.07] text-[#e8170b] shadow-sm"
              : "text-gray-500 dark:text-white/45 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:text-gray-800"
          )}
        >
          <span
            className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: campaign.color ?? "#6366f1" }}
          >
            {campaign.name[0]?.toUpperCase()}
          </span>
          <span className="truncate">{campaign.name}</span>
        </Link>
      </div>

      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {loading && (
            <p className="text-[10px] text-gray-300 px-2 py-1">Loading…</p>
          )}
          {!loading && folders.length === 0 && loaded && (
            <p className="text-[10px] text-gray-300 px-2 py-1">No folders yet</p>
          )}
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              campaignId={campaign.id}
              activeListId={activeListId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpacesTree({ activeListId }: { activeListId: string | null }) {
  const pathname = usePathname();
  const { activeWorkspaceId, activeTeamId } = useUIStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeWorkspaceId) params.set("workspaceId", activeWorkspaceId);
    if (activeTeamId) params.set("departmentId", activeTeamId);
    const query = params.toString();
    fetch(`/api/campaigns${query ? `?${query}` : ""}`)
      .then((r) => r.json())
      .then((d) => setCampaigns(d.data ?? []))
      .catch(() => {});
  }, [activeWorkspaceId, activeTeamId]);

  const activeCampaignId = pathname.match(/\/campaigns\/([^/]+)/)?.[1];

  return (
    <div>
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-4 h-4 rounded hover:bg-black/[0.06] transition-colors flex-shrink-0"
        >
          {open
            ? <ChevronDown className="w-3 h-3 text-gray-400" />
            : <ChevronRight className="w-3 h-3 text-gray-400" />
          }
        </button>
        <Link
          href="/campaigns"
          className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest hover:text-gray-600 dark:hover:text-white/50 transition-colors"
        >
          Projects
        </Link>
      </div>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              activeListId={activeListId}
              defaultOpen={campaign.id === activeCampaignId}
            />
          ))}
          <Link
            href="/campaigns"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-[#e8170b] hover:bg-[#e8170b]/5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span className="font-medium">New Project</span>
          </Link>
        </div>
      )}
    </div>
  );
}
