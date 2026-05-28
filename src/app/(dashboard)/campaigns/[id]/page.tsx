"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Target, Calendar, TrendingUp, Plus,
  BookTemplate, Edit2, List, LayoutGrid, GanttChart, Trash2, FileText,
  ChevronRight, ChevronDown, Folder as FolderIcon, Hash, Check, X as XIcon, Pencil,
  Sparkles, Loader2, Users, Table2, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { PriorityBadge, CampaignStatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar, AvatarGroup } from "@/components/shared/UserAvatar";
import { formatDate, cn } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { CampaignTemplateForm } from "@/components/campaigns/CampaignTemplateForm";
import { CampaignHealthScore } from "@/components/campaigns/CampaignHealthScore";
import { WrapUpReportModal } from "@/components/campaigns/WrapUpReportModal";
import { GanttView } from "@/components/campaigns/GanttView";
import { CalendarView } from "@/components/campaigns/CalendarView";
import { TeamView } from "@/components/campaigns/TeamView";
import { TableView } from "@/components/campaigns/TableView";
import { AddEmbedModal } from "@/components/campaigns/AddEmbedModal";
import { TaskListGrouped } from "@/components/tasks/TaskListGrouped";
import { useUIStore } from "@/store/ui-store";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface TaskUser {
  id: string;
  name: string;
  image?: string | null;
}

interface ListTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  assignees: { user: TaskUser }[];
  _count: { subTasks: number; comments: number };
}

interface TaskListItem {
  id: string;
  name: string;
  color: string;
  position: number;
  _count: { tasks: number };
}

interface Folder {
  id: string;
  name: string;
  color: string;
  lists: TaskListItem[];
}

interface ListDetail {
  id: string;
  name: string;
  color: string;
  tasks: ListTask[];
}

interface CampaignTask {
  id: string;
  title: string;
  description?: string | null;
  taskType?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  assignees: { user: TaskUser }[];
  createdBy: { id: string; name: string };
}

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  budget?: number | null;
  goals?: string | null;
  ownerId: string;
  owner: { id: string; name: string; image?: string | null };
  department?: { id: string; name: string; color: string } | null;
  tasks: CampaignTask[];
  completedTasks: number;
  progress: number;
}

const KANBAN_COLUMNS = [
  { key: "TODO",              label: "To Do",             color: "bg-slate-100 dark:bg-slate-800" },
  { key: "ASSIGNED",         label: "Assigned",           color: "bg-purple-50 dark:bg-purple-950/30" },
  { key: "IN_PROGRESS",      label: "In Progress",        color: "bg-yellow-50 dark:bg-yellow-950/30" },
  { key: "WAITING_APPROVAL", label: "Waiting Approval",   color: "bg-blue-50 dark:bg-blue-950/30" },
  { key: "REVISION_REQUIRED",label: "Revision Required",  color: "bg-orange-50 dark:bg-orange-950/30" },
  { key: "COMPLETED",        label: "Completed",          color: "bg-green-50 dark:bg-green-950/30" },
  { key: "BLOCKED",          label: "Blocked",            color: "bg-red-50 dark:bg-red-950/30" },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { campaignView, setCampaignView } = useUIStore();

  const [selectedListId, setSelectedListId] = useState<string | null>(
    searchParams.get("list")
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingListInFolder, setCreatingListInFolder] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [generatingUpdate, setGeneratingUpdate] = useState(false);
  const [campaignUpdate, setCampaignUpdate] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEmbedId, setSelectedEmbedId] = useState<string | null>(null);
  const [showAddEmbed, setShowAddEmbed] = useState(false);

  const didAutoSelect = useRef(false);

  const { data: adminDeptsData } = useQuery({
    queryKey: ["myAdminDepts"],
    queryFn: async () => {
      const res = await fetch("/api/departments?myAdmin=true");
      return res.json();
    },
    enabled: session?.user?.role !== "ADMIN",
    staleTime: 60_000,
  });

  const { data: campaignData, isLoading: campaignLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });
  const campaign: Campaign | undefined = campaignData?.data;
  const adminDeptIds: string[] = adminDeptsData?.data?.map((d: { id: string }) => d.id) ?? [];
  const canManage =
    session?.user?.role === "ADMIN" ||
    (!!campaign?.department?.id && adminDeptIds.includes(campaign.department.id));

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/folders`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });
  const folders: Folder[] = foldersData?.data ?? [];

  const { data: embedsData, refetch: refetchEmbeds } = useQuery({
    queryKey: ["embeds", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/embeds`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });
  const embeds: { id: string; name: string; url: string; icon: string | null }[] = embedsData?.data ?? [];

  useEffect(() => {
    if (folders.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        folders.forEach((f) => next.add(f.id));
        return next;
      });
      if (!didAutoSelect.current && !searchParams.get("list")) {
        const firstFolder = folders[0];
        if (firstFolder) {
          setSelectedFolderId(firstFolder.id);
          setSelectedListId(null);
          didAutoSelect.current = true;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldersData]);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["list", selectedListId],
    queryFn: async () => {
      const res = await fetch(`/api/lists/${selectedListId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!selectedListId,
  });
  const currentList: ListDetail | undefined = listData?.data;

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const folderListQueries = useQueries({
    queries: (selectedFolderId && !selectedListId ? selectedFolder?.lists ?? [] : []).map((list) => ({
      queryKey: ["list", list.id],
      queryFn: async () => {
        const res = await fetch(`/api/lists/${list.id}`);
        if (!res.ok) throw new Error();
        return res.json();
      },
    })),
  });
  const folderLists: ListDetail[] = folderListQueries
    .map((q) => q.data?.data)
    .filter(Boolean) as ListDetail[];
  const folderListsLoading = folderListQueries.some((q) => q.isLoading);

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`/api/campaigns/${id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
      }
      const { data } = await res.json();
      setNewFolderName("");
      setShowNewFolder(false);
      setExpandedFolders((prev) => new Set([...prev, data.id]));
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      toast.success("Folder created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    }
  }

  async function createList(folderId: string) {
    if (!newListName.trim()) return;
    try {
      const res = await fetch(`/api/folders/${folderId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setNewListName("");
      setCreatingListInFolder(null);
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      setSelectedListId(data.id);
      toast.success("List created");
    } catch {
      toast.error("Failed to create list");
    }
  }

  async function renameFolder(folderId: string) {
    if (!renameValue.trim()) { setRenamingFolderId(null); return; }
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      setRenamingFolderId(null);
    } catch {
      toast.error("Failed to rename folder");
    }
  }

  async function renameList(listId: string) {
    if (!renameValue.trim()) { setRenamingListId(null); return; }
    try {
      await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      if (selectedListId === listId) queryClient.invalidateQueries({ queryKey: ["list", listId] });
      setRenamingListId(null);
    } catch {
      toast.error("Failed to rename list");
    }
  }

  async function deleteFolder(folderId: string) {
    if (!confirm("Delete this folder and all its lists and tasks? This cannot be undone.")) return;
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      const folderBeingDeleted = folders.find((f) => f.id === folderId);
      if (folderBeingDeleted?.lists.some((l) => l.id === selectedListId)) {
        setSelectedListId(null);
      }
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  async function deleteList(listId: string) {
    if (!confirm("Delete this list and all its tasks? This cannot be undone.")) return;
    try {
      await fetch(`/api/lists/${listId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      if (selectedListId === listId) setSelectedListId(null);
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  }

  async function deleteTask(taskId: string) {
    setDeletingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Task deleted");
      if (selectedListId) queryClient.invalidateQueries({ queryKey: ["list", selectedListId] });
      if (selectedFolderId && !selectedListId) {
        selectedFolder?.lists.forEach((l) => queryClient.invalidateQueries({ queryKey: ["list", l.id] }));
      }
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["folders", id] });
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Project not found.</p>
        <Link href="/campaigns" className="text-[#e8170b] hover:underline text-sm mt-2 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const statusCounts = {
    TODO:              campaign.tasks.filter((t) => t.status === "TODO").length,
    ASSIGNED:          campaign.tasks.filter((t) => t.status === "ASSIGNED").length,
    IN_PROGRESS:       campaign.tasks.filter((t) => t.status === "IN_PROGRESS").length,
    WAITING_APPROVAL:  campaign.tasks.filter((t) => t.status === "WAITING_APPROVAL").length,
    REVISION_REQUIRED: campaign.tasks.filter((t) => t.status === "REVISION_REQUIRED").length,
    COMPLETED:         campaign.completedTasks,
    BLOCKED:           campaign.tasks.filter((t) => t.status === "BLOCKED").length,
  };

  const templateTasks = campaign.tasks.map((t) => ({
    title: t.title,
    description: t.description,
    taskType: t.taskType,
    priority: t.priority,
    estimatedHours: t.estimatedHours,
  }));

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Campaign header card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <CampaignStatusBadge status={campaign.status} />
              {campaign.department && (
                <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border border-border">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: campaign.department.color }} />
                  {campaign.department.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            {campaign.description && (
              <p className="text-muted-foreground mt-1.5 text-sm">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <UserAvatar name={campaign.owner.name} image={campaign.owner.image} size="md" />
            {canManage && (
              <>
                {campaign.status === "COMPLETED" && (
                  <button
                    onClick={() => setShowWrapUp(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-600 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Wrap-Up
                  </button>
                )}
                <button
                  onClick={async () => {
                    setGeneratingUpdate(true);
                    setCampaignUpdate(null);
                    try {
                      const res = await fetch("/api/ai/campaign-update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ campaignId: campaign.id }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error ?? "Failed");
                      setCampaignUpdate(data.update);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "AI update failed");
                    } finally {
                      setGeneratingUpdate(false);
                    }
                  }}
                  disabled={generatingUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8170b]/30 text-[#e8170b] text-xs font-medium hover:bg-[#e8170b]/5 transition-colors disabled:opacity-50"
                >
                  {generatingUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Update
                </button>
                <button
                  onClick={() => setShowTemplateForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <BookTemplate className="w-3.5 h-3.5" />
                  Template
                </button>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* AI Project Update panel */}
        {campaignUpdate && (
          <div className="p-4 bg-[#e8170b]/5 border border-[#e8170b]/20 rounded-xl mb-4 relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-[#e8170b] uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> AI Project Update
              </p>
              <button
                onClick={() => setCampaignUpdate(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{campaignUpdate}</p>
          </div>
        )}

        {campaign.goals && (
          <div className="p-3.5 bg-muted/50 rounded-xl mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> GOALS & KPIs
            </p>
            <p className="text-sm">{campaign.goals}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Start
            </p>
            <p className="text-sm font-medium">{formatDate(campaign.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> End
            </p>
            <p className="text-sm font-medium">{formatDate(campaign.endDate)}</p>
          </div>
          {campaign.budget != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Budget
              </p>
              <p className="text-sm font-medium">${Number(campaign.budget).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Owner</p>
            <p className="text-sm font-medium">{campaign.owner.name}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">
              {campaign.completedTasks} of {campaign.tasks.length} tasks completed
            </span>
            <span className={cn(
              "font-bold",
              campaign.progress >= 80 ? "text-[#10b981]" : campaign.progress >= 40 ? "text-[#f59e0b]" : "text-[#e8170b]"
            )}>
              {campaign.progress}%
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                campaign.progress >= 80 ? "bg-[#10b981]" : campaign.progress >= 40 ? "bg-[#f59e0b]" : "bg-[#e8170b]"
              )}
              style={{ width: `${campaign.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          <CampaignHealthScore campaign={campaign} />
        </div>

        <div className="grid grid-cols-7 gap-2 mt-4">
          {[
            { label: "To Do",    count: statusCounts.TODO,              color: "text-slate-600 bg-slate-50 dark:bg-slate-900" },
            { label: "Assigned", count: statusCounts.ASSIGNED,          color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
            { label: "In Prog.", count: statusCounts.IN_PROGRESS,       color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
            { label: "Approval", count: statusCounts.WAITING_APPROVAL,  color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
            { label: "Revision", count: statusCounts.REVISION_REQUIRED, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
            { label: "Done",     count: statusCounts.COMPLETED,         color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
            { label: "Blocked",  count: statusCounts.BLOCKED,           color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl p-2.5 text-center", s.color)}>
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace: sidebar + content */}
      <div
        className="flex bg-card border border-border rounded-2xl overflow-hidden"
        style={{ height: "calc(100vh - 320px)", minHeight: 520 }}
      >
        {/* Sidebar */}
        <div className="w-56 border-r border-border flex flex-col flex-shrink-0">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</p>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
            {foldersLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            ) : folders.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No folders yet.{canManage && " Create one below."}
              </div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id}>
                  {/* Folder row */}
                  <div className={cn(
                    "group flex items-center gap-1 px-2 py-1 rounded-lg mx-1",
                    selectedFolderId === folder.id && !selectedListId
                      ? "bg-[#e8170b]/10 text-[#e8170b]"
                      : "hover:bg-muted/60"
                  )}>
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex-shrink-0 p-0.5"
                    >
                      {expandedFolders.has(folder.id)
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setSelectedListId(null);
                        if (!expandedFolders.has(folder.id)) toggleFolder(folder.id);
                      }}
                      className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                    >
                      <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: folder.color }} />
                      {renamingFolderId === folder.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => renameFolder(folder.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameFolder(folder.id);
                            if (e.key === "Escape") setRenamingFolderId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none"
                        />
                      ) : (
                        <span className="text-sm font-medium truncate">{folder.name}</span>
                      )}
                    </button>
                    {canManage && renamingFolderId !== folder.id && (
                      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                        <button
                          title="New list"
                          onClick={(e) => { e.stopPropagation(); setCreatingListInFolder(folder.id); setNewListName(""); if (!expandedFolders.has(folder.id)) toggleFolder(folder.id); }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          title="Rename"
                          onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenameValue(folder.name); }}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          title="Delete folder"
                          onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                          className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lists under folder */}
                  {expandedFolders.has(folder.id) && (
                    <div className="ml-5">
                      {folder.lists.map((list) => (
                        <div
                          key={list.id}
                          onClick={() => { setSelectedListId(list.id); setSelectedFolderId(folder.id); }}
                          className={cn(
                            "group flex items-center gap-1 px-2 py-1 rounded-lg mx-1 cursor-pointer",
                            selectedListId === list.id
                              ? "bg-[#e8170b]/10 text-[#e8170b]"
                              : "hover:bg-muted/60 text-foreground"
                          )}
                        >
                          <Hash className="w-3 h-3 flex-shrink-0 opacity-50" />
                          {renamingListId === list.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => renameList(list.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameList(list.id);
                                if (e.key === "Escape") setRenamingListId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 min-w-0 text-sm bg-transparent border-b border-primary outline-none"
                            />
                          ) : (
                            <span className="flex-1 min-w-0 text-sm truncate">{list.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground flex-shrink-0">{list._count.tasks}</span>
                          {canManage && renamingListId !== list.id && (
                            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0 ml-0.5">
                              <button
                                title="Rename"
                                onClick={(e) => { e.stopPropagation(); setRenamingListId(list.id); setRenameValue(list.name); }}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                title="Delete list"
                                onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                                className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* New list inline input */}
                      {creatingListInFolder === folder.id && (
                        <div className="flex items-center gap-1 px-2 mx-1 mb-1 mt-0.5">
                          <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <input
                            autoFocus
                            placeholder="List name…"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") createList(folder.id);
                              if (e.key === "Escape") { setCreatingListInFolder(null); setNewListName(""); }
                            }}
                            className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0.5"
                          />
                          <button onClick={() => createList(folder.id)} className="p-0.5 rounded hover:bg-green-50 text-green-600">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setCreatingListInFolder(null); setNewListName(""); }} className="p-0.5 rounded hover:bg-red-50 text-red-500">
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* New folder inline input */}
            {showNewFolder && (
              <div className="flex items-center gap-1.5 px-2 mx-1 mt-1">
                <FolderIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  placeholder="Folder name…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createFolder();
                    if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                  }}
                  className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0.5"
                />
                <button onClick={createFolder} className="p-0.5 rounded hover:bg-green-50 text-green-600">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="p-0.5 rounded hover:bg-red-50 text-red-500">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {canManage && !showNewFolder && (
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setShowNewFolder(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Folder
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* ── Folder view: show all lists grouped ── */}
          {!selectedListId && selectedFolderId ? (
            folderListsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {/* Folder header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-semibold">{selectedFolder?.name}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {selectedFolder?.lists.length ?? 0} lists
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 p-1 bg-muted rounded-xl flex-wrap">
                    {([
                      { key: "list",     icon: List,        label: "List" },
                      { key: "kanban",   icon: LayoutGrid,  label: "Kanban" },
                      { key: "gantt",    icon: GanttChart,  label: "Gantt" },
                      { key: "calendar", icon: Calendar,    label: "Calendar" },
                      { key: "team",     icon: Users,       label: "Team" },
                      { key: "table",    icon: Table2,      label: "Table" },
                    ] as const).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => { setCampaignView(key); setSelectedEmbedId(null); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                          campaignView === key && !selectedEmbedId
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                    {embeds.map((embed) => (
                      <button
                        key={embed.id}
                        onClick={() => { setSelectedEmbedId(embed.id); setCampaignView("list"); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group/embed",
                          selectedEmbedId === embed.id
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="text-sm leading-none">{embed.icon ?? "🌐"}</span>
                        <span>{embed.name}</span>
                        <span
                          onClick={async (e) => {
                            e.stopPropagation();
                            await fetch(`/api/campaigns/${id}/embeds/${embed.id}`, { method: "DELETE" });
                            if (selectedEmbedId === embed.id) setSelectedEmbedId(null);
                            refetchEmbeds();
                          }}
                          className="opacity-0 group-hover/embed:opacity-100 ml-0.5 hover:text-red-500 transition-all"
                        >
                          ×
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => setShowAddEmbed(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
                      title="Add embed"
                    >
                      <Plus className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>

                {selectedEmbedId ? (
                  (() => {
                    const embed = embeds.find((e) => e.id === selectedEmbedId);
                    return embed ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
                          <span className="text-base">{embed.icon ?? "🌐"}</span>
                          <span className="text-sm font-medium">{embed.name}</span>
                          <a href={embed.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-muted-foreground hover:text-[#e8170b] flex items-center gap-1 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Open in new tab
                          </a>
                        </div>
                        <iframe src={embed.url} className="w-full border-0" style={{ flex: 1, minHeight: 0, height: "100%" }} allow="fullscreen" title={embed.name} />
                      </div>
                    ) : null;
                  })()
                ) : folderLists.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
                    <Hash className="w-10 h-10 mb-3 opacity-20" />
                    <p>No lists in this folder yet.</p>
                    {canManage && (
                      <button
                        onClick={() => { setCreatingListInFolder(selectedFolderId); if (!expandedFolders.has(selectedFolderId)) toggleFolder(selectedFolderId); }}
                        className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add List
                      </button>
                    )}
                  </div>
                ) : campaignView === "list" ? (
                  <div className="divide-y divide-border/60">
                    {folderLists.map((list) => (
                      <div key={list.id}>
                        {/* List section header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">{list.name}</span>
                            <span className="text-xs text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-full">{list.tasks.length}</span>
                          </div>
                          {canManage && (
                            <button
                              onClick={() => { setSelectedListId(list.id); setShowTaskForm(true); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-[#e8170b] hover:bg-[#e8170b]/5 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add Task
                            </button>
                          )}
                        </div>
                        <TaskListGrouped
                          tasks={list.tasks.map((t) => ({ ...t, listName: list.name }))}
                          canManage={canManage}
                          onTaskClick={setSelectedTaskId}
                          onDeleteTask={deleteTask}
                          onAddTask={() => { setSelectedListId(list.id); setShowTaskForm(true); }}
                          deletingTaskId={deletingTaskId}
                        />
                      </div>
                    ))}
                  </div>
                ) : campaignView === "gantt" ? (
                  <GanttView
                    tasks={folderLists.flatMap((l) => l.tasks)}
                    campaignStart={campaign.startDate}
                    campaignEnd={campaign.endDate}
                  />
                ) : campaignView === "calendar" ? (
                  <CalendarView
                    tasks={folderLists.flatMap((l) => l.tasks.map((t) => ({ ...t, listName: l.name })))}
                    onTaskClick={setSelectedTaskId}
                  />
                ) : campaignView === "team" ? (
                  <TeamView
                    tasks={folderLists.flatMap((l) => l.tasks.map((t) => ({ ...t, listName: l.name })))}
                    onTaskClick={setSelectedTaskId}
                  />
                ) : campaignView === "table" ? (
                  <TableView
                    tasks={folderLists.flatMap((l) => l.tasks.map((t) => ({ ...t, listName: l.name })))}
                    canManage={canManage}
                    onTaskClick={setSelectedTaskId}
                    onDeleteTask={deleteTask}
                    deletingTaskId={deletingTaskId}
                  />
                ) : (
                  /* Kanban in folder view — all tasks from all lists combined */
                  <div className="p-4 overflow-auto flex-1">
                    <div className="flex gap-3 min-w-max">
                      {KANBAN_COLUMNS.map((col) => {
                        const allTasks = folderLists.flatMap((l) => l.tasks.map((t) => ({ ...t, listName: l.name })));
                        const colTasks = allTasks.filter((t) => t.status === col.key);
                        return (
                          <div key={col.key} className="w-64 flex-shrink-0">
                            <div className={cn("rounded-xl p-3 mb-2 flex items-center justify-between", col.color)}>
                              <span className="text-xs font-semibold">{col.label}</span>
                              <span className="text-xs font-bold opacity-60">{colTasks.length}</span>
                            </div>
                            <div className="space-y-2">
                              {colTasks.map((task) => (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className="bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-shadow group cursor-pointer"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{task.listName}</p>
                                    </div>
                                    {canManage && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                        disabled={deletingTaskId === task.id}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground flex-shrink-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <PriorityBadge priority={task.priority} />
                                    {task.assignees.length > 0 && (
                                      <AvatarGroup users={task.assignees.map((a) => a.user)} max={2} />
                                    )}
                                  </div>
                                  {task.dueDate && (
                                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(task.dueDate)}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {colTasks.length === 0 && (
                                <div className="h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">Empty</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : !selectedListId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Hash className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Select a list to view its tasks</p>
              <p className="text-xs mt-1 opacity-70">
                {folders.length === 0
                  ? "Create a folder first, then add lists inside it."
                  : "Choose a list from the sidebar on the left."}
              </p>
              {folders.length === 0 && canManage && (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Folder
                </button>
              )}
            </div>
          ) : listLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentList ? (
            <>
              {/* List header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">{currentList.name}</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {currentList.tasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5 p-1 bg-muted rounded-xl flex-wrap">
                    {([
                      { key: "list",     icon: List,        label: "List" },
                      { key: "kanban",   icon: LayoutGrid,  label: "Kanban" },
                      { key: "gantt",    icon: GanttChart,  label: "Gantt" },
                      { key: "calendar", icon: Calendar,    label: "Calendar" },
                      { key: "team",     icon: Users,       label: "Team" },
                      { key: "table",    icon: Table2,      label: "Table" },
                    ] as const).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => { setCampaignView(key); setSelectedEmbedId(null); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                          campaignView === key && !selectedEmbedId
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                    {/* Embed tabs */}
                    {embeds.map((embed) => (
                      <button
                        key={embed.id}
                        onClick={() => { setSelectedEmbedId(embed.id); setCampaignView("list"); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group/embed",
                          selectedEmbedId === embed.id
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="text-sm leading-none">{embed.icon ?? "🌐"}</span>
                        <span>{embed.name}</span>
                        <span
                          onClick={async (e) => {
                            e.stopPropagation();
                            await fetch(`/api/campaigns/${id}/embeds/${embed.id}`, { method: "DELETE" });
                            if (selectedEmbedId === embed.id) setSelectedEmbedId(null);
                            refetchEmbeds();
                          }}
                          className="opacity-0 group-hover/embed:opacity-100 ml-0.5 hover:text-red-500 transition-all"
                        >
                          ×
                        </span>
                      </button>
                    ))}
                    {/* Add embed button */}
                    <button
                      onClick={() => setShowAddEmbed(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
                      title="Add embed"
                    >
                      <Plus className="w-3 h-3" /> View
                    </button>
                  </div>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Task
                  </button>
                </div>
              </div>

              {/* Tasks */}
              {selectedEmbedId ? (
                (() => {
                  const embed = embeds.find((e) => e.id === selectedEmbedId);
                  return embed ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
                        <span className="text-base">{embed.icon ?? "🌐"}</span>
                        <span className="text-sm font-medium">{embed.name}</span>
                        <a href={embed.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-muted-foreground hover:text-[#e8170b] flex items-center gap-1 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Open in new tab
                        </a>
                      </div>
                      <iframe
                        src={embed.url}
                        className="flex-1 w-full border-0"
                        allow="fullscreen"
                        title={embed.name}
                      />
                    </div>
                  ) : null;
                })()
              ) : currentList.tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
                  <Target className="w-10 h-10 mb-3 opacity-20" />
                  <p>No tasks yet in this list.</p>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8170b] hover:bg-[#c91409] text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>
              ) : campaignView === "gantt" ? (
                <GanttView
                  tasks={currentList.tasks}
                  campaignStart={campaign.startDate}
                  campaignEnd={campaign.endDate}
                />
              ) : campaignView === "calendar" ? (
                <CalendarView tasks={currentList.tasks} onTaskClick={setSelectedTaskId} />
              ) : campaignView === "team" ? (
                <TeamView tasks={currentList.tasks} onTaskClick={setSelectedTaskId} />
              ) : campaignView === "table" ? (
                <TableView
                  tasks={currentList.tasks}
                  canManage={canManage}
                  onTaskClick={setSelectedTaskId}
                  onDeleteTask={deleteTask}
                  deletingTaskId={deletingTaskId}
                />
              ) : campaignView === "list" ? (
                <TaskListGrouped
                  tasks={currentList.tasks}
                  canManage={canManage}
                  onTaskClick={setSelectedTaskId}
                  onDeleteTask={deleteTask}
                  onAddTask={() => setShowTaskForm(true)}
                  deletingTaskId={deletingTaskId}
                />
              ) : (
                <div className="p-4 overflow-auto flex-1">
                  <div className="flex gap-3 min-w-max">
                    {KANBAN_COLUMNS.map((col) => {
                      const colTasks = currentList.tasks.filter((t) => t.status === col.key);
                      return (
                        <div key={col.key} className="w-64 flex-shrink-0">
                          <div className={cn("rounded-xl p-3 mb-2 flex items-center justify-between", col.color)}>
                            <span className="text-xs font-semibold">{col.label}</span>
                            <span className="text-xs font-bold opacity-60">{colTasks.length}</span>
                          </div>
                          <div className="space-y-2">
                            {colTasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                className="bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-shadow group cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                                  {canManage && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                      disabled={deletingTaskId === task.id}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground flex-shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <PriorityBadge priority={task.priority} />
                                  {task.assignees.length > 0 && (
                                    <AvatarGroup users={task.assignees.map((a) => a.user)} max={2} />
                                  )}
                                </div>
                                {task.dueDate && (
                                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(task.dueDate)}
                                  </p>
                                )}
                              </div>
                            ))}
                            {colTasks.length === 0 && (
                              <div className="h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">Empty</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {showAddEmbed && (
        <AddEmbedModal
          campaignId={id}
          onClose={() => setShowAddEmbed(false)}
          onSuccess={(embed) => {
            setShowAddEmbed(false);
            setSelectedEmbedId(embed.id);
            refetchEmbeds();
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["list", selectedListId] });
            queryClient.invalidateQueries({ queryKey: ["campaign", id] });
          }}
        />
      )}

      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          defaultCampaignId={id}
          defaultListId={selectedListId}
          onSuccess={() => {
            setShowTaskForm(false);
            queryClient.invalidateQueries({ queryKey: ["list", selectedListId] });
            queryClient.invalidateQueries({ queryKey: ["campaign", id] });
            queryClient.invalidateQueries({ queryKey: ["folders", id] });
          }}
        />
      )}

      {showWrapUp && campaign && (
        <WrapUpReportModal campaign={campaign} onClose={() => setShowWrapUp(false)} />
      )}

      {showEditForm && campaign && (
        <CampaignForm
          onClose={() => setShowEditForm(false)}
          editCampaign={{
            id: campaign.id,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            budget: campaign.budget,
            goals: campaign.goals,
            ownerId: campaign.ownerId,
            departmentId: campaign.department?.id ?? null,
          }}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({ queryKey: ["campaign", id] });
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          }}
        />
      )}

      {showTemplateForm && campaign && (
        <CampaignTemplateForm
          onClose={() => setShowTemplateForm(false)}
          defaultName={campaign.name}
          defaultDepartmentId={campaign.department?.id ?? null}
          tasks={templateTasks}
          onSuccess={() => setShowTemplateForm(false)}
        />
      )}
    </div>
  );
}
