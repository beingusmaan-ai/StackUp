"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Send, CheckCircle, RotateCcw, ChevronDown, Calendar, Paperclip, FileText, Download, XCircle, Cloud, Trash2, Pencil } from "lucide-react";
import { CloudFilePicker } from "@/components/tasks/CloudFilePicker";
import { HoursEditor } from "@/components/tasks/HoursEditor";
import { LogTimeModal } from "@/components/tasks/LogTimeModal";
import { TaskForm } from "@/components/tasks/TaskForm";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { UserAvatar, AvatarGroup } from "@/components/shared/UserAvatar";
import { formatDate, formatRelative } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetail({ taskId, onClose, onUpdate }: TaskDetailProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "activity">("details");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [showApprovalInput, setShowApprovalInput] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [showLogTime, setShowLogTime] = useState(false);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const { data } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      return res.json();
    },
  });

  const task = data?.data;

  const { data: adminDeptsData } = useQuery({
    queryKey: ["myAdminDepts"],
    queryFn: async () => {
      const res = await fetch("/api/departments?myAdmin=true");
      return res.json();
    },
    enabled: session?.user?.role !== "ADMIN",
    staleTime: 60_000,
  });
  const adminDeptIds: string[] = adminDeptsData?.data?.map((d: { id: string }) => d.id) ?? [];
  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const isDeptAdmin = !isGlobalAdmin && !!task?.campaign?.departmentId && adminDeptIds.includes(task.campaign.departmentId);

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      onUpdate();
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (attachmentFiles.length > 0) {
        const fd = new FormData();
        attachmentFiles.forEach((f) => fd.append("files", f));
        const uploadRes = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Upload failed");
      }
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, message: approvalMessage }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Submitted for approval");
      setShowApprovalInput(false);
      setAttachmentFiles([]);
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      onUpdate();
    },
    onError: () => toast.error("Failed to submit"),
  });

  const approveAction = useMutation({
    mutationFn: async ({ action, note }: { action: string; note?: string | undefined }) => {
      const approval = task?.approvalRequests?.[0];
      if (!approval) throw new Error("No pending approval");
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, decisionNote: note }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: (_: unknown, { action }: { action: string; note?: string | undefined }) => {
      toast.success(action === "approve" ? "Task approved!" : "Revision requested");
      setShowRejectionInput(false);
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      onUpdate();
    },
    onError: () => toast.error("Action failed"),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onUpdate();
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });


  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-end">
        <div className="bg-background border-l border-border w-full md:w-[600px] h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const pendingApproval = task.approvalRequests?.[0]?.status === "PENDING" ? task.approvalRequests[0] : null;
  const canApprove = task.createdBy?.id === session?.user.id;
  const isAssignee = task.assignees?.some((a: { user: { id: string } }) => a.user.id === session?.user.id);
  const canChangeStatus = isAssignee || isGlobalAdmin || isDeptAdmin;
  const canDelete = isGlobalAdmin || isDeptAdmin || session?.user?.role === "TEAM_LEAD";

  async function handleDelete() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Task deleted");
      onClose();
      onUpdate();
    } else {
      toast.error("Failed to delete task");
    }
  }

  const ASSIGNEE_STATUSES = ["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "COMPLETED"];
  const ALL_STATUSES = ["TODO", "ASSIGNED", "IN_PROGRESS", "WAITING_APPROVAL", "REVISION_REQUIRED", "COMPLETED", "BLOCKED"];

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-background border-l border-border w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="flex items-center gap-1">
            {canDelete && (
              <button
                onClick={() => setShowEditForm(true)}
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center transition-colors"
                title="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground flex items-center justify-center transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">{task.title}</h2>
          {task.campaign && (
            <span className="text-xs bg-[#e8170b]/10 text-[#e8170b] px-2 py-0.5 rounded-full ">
              {task.campaign.name}
            </span>
          )}

          {/* Status change */}
          {canChangeStatus && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Change status:</span>
              <div className="relative">
                <select
                  value={task.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    statusMutation.mutate(newStatus);
                    if (newStatus === "COMPLETED") setShowLogTime(true);
                  }}
                  disabled={statusMutation.isPending}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] cursor-pointer disabled:opacity-50"
                >
                  {(canApprove || isGlobalAdmin || isDeptAdmin ? ALL_STATUSES : ASSIGNEE_STATUSES).map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Assignees</p>
              {task.assignees?.length > 0 ? (
                <div className="flex items-center gap-2">
                  <AvatarGroup users={task.assignees.map((a: { user: { name: string; image?: string | null } }) => a.user)} />
                  <span className="text-sm text-foreground">
                    {task.assignees.map((a: { user: { name: string } }) => a.user.name).join(", ")}
                  </span>
                </div>
              ) : <span className="text-muted-foreground">Unassigned</span>}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Created by</p>
              <span>{task.createdBy?.name}</span>
            </div>
            {task.dueDate && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Estimated Hours</p>
              <HoursEditor
                taskId={taskId}
                initialHours={task.estimatedHours ?? null}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["task", taskId] });
                  queryClient.invalidateQueries({ queryKey: ["tasks"] });
                }}
              />
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}


          {/* Approval actions */}
          {isAssignee && task.status === "WAITING_APPROVAL" && !pendingApproval && (
            <div className="mt-4">
              {showApprovalInput ? (
                <div className="space-y-2">
                  <textarea
                    value={approvalMessage}
                    onChange={(e) => setApprovalMessage(e.target.value)}
                    placeholder="Optional message for the reviewer..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
                  />

                  {/* File attachment */}
                  <div>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-[#e8170b]/50 cursor-pointer transition-colors text-sm text-muted-foreground hover:text-[#e8170b]">
                      <Paperclip className="w-4 h-4" />
                      Attach files
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const picked = Array.from(e.target.files ?? []);
                          setAttachmentFiles((prev) => [...prev, ...picked]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {attachmentFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachmentFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1 bg-muted rounded-lg text-xs">
                            <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate text-foreground">{f.name}</span>
                            <span className="text-muted-foreground flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                            <button onClick={() => setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                              <XCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setShowApprovalInput(false); setAttachmentFiles([]); }} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => approvalMutation.mutate()} disabled={approvalMutation.isPending} className="flex-1 py-2 rounded-xl bg-[#e8170b] text-white text-sm hover:bg-[#c91409] transition-colors disabled:opacity-50">
                      {approvalMutation.isPending ? "Uploading..." : "Submit for Approval"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowApprovalInput(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Submit for Approval
                </button>
              )}
            </div>
          )}

          {canApprove && pendingApproval && (
            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">Pending Approval Request</p>
              {pendingApproval.message && <p className="text-sm text-muted-foreground mb-3">{pendingApproval.message}</p>}
              {showRejectionInput ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Describe what needs to be revised..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRejectionInput(false)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => approveAction.mutate({ action: "reject", note: rejectionNote })} disabled={approveAction.isPending} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors disabled:opacity-50">
                      Request Revision
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowRejectionInput(true)} className="flex-1 py-2 rounded-xl border border-orange-300 text-orange-700 text-sm hover:bg-orange-50 transition-colors">
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    Request Revision
                  </button>
                  <button onClick={() => approveAction.mutate({ action: "approve" })} disabled={approveAction.isPending} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-6 mb-4 border-b border-border">
            {([["details", "Details"], ["comments", "Comments"], ["activity", "Activity"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === id ? "border-[#e8170b] text-[#e8170b]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              {task.comments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
              )}
              {task.comments?.map((c: { id: string; content: string; createdAt: string; author: { name: string; image?: string | null } }) => (
                <div key={c.id} className="flex gap-3">
                  <UserAvatar name={c.author.name} image={c.author.image} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 mt-4 sticky bottom-0 bg-background pt-2">
                <UserAvatar name={session?.user.name || "U"} size="sm" />
                <div className="flex-1 flex items-end gap-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b] resize-none"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && comment.trim()) { e.preventDefault(); commentMutation.mutate(comment); } }}
                  />
                  <button
                    onClick={() => comment.trim() && commentMutation.mutate(comment)}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="p-2 rounded-xl bg-[#e8170b] hover:bg-[#c91409] disabled:opacity-50 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3">
              {task.activityLog?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No activity recorded</p>
              )}
              {task.activityLog?.map((a: { id: string; action: string; fromValue?: string | null; toValue?: string | null; createdAt: string; actor: { name: string } }) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{a.actor.name}</span>{" "}
                      {a.action === "status_changed"
                        ? `changed status from ${a.fromValue?.replace(/_/g, " ")} to ${a.toValue?.replace(/_/g, " ")}`
                        : a.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-4">
              {task.subTasks?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Subtasks ({task.subTasks.length})</p>
                  <div className="space-y-2">
                    {task.subTasks.map((sub: { id: string; title: string; status: string }) => (
                      <div key={sub.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted">
                        <div className={`w-2 h-2 rounded-full ${sub.status === "COMPLETED" ? "bg-green-500" : "bg-slate-400"}`} />
                        {sub.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Attachments{task.attachments?.length > 0 ? ` (${task.attachments.length})` : ""}
                  </p>
                  <button
                    onClick={() => setShowCloudPicker((v) => !v)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    title="Attach from Google Drive or OneDrive"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Cloud
                  </button>
                </div>

                {showCloudPicker && (
                  <CloudFilePicker
                    taskId={taskId}
                    onClose={() => setShowCloudPicker(false)}
                    onAdded={() => {
                      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
                      onUpdate();
                    }}
                  />
                )}

                {task.attachments?.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {task.attachments.map((att: { id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2 bg-muted rounded-xl hover:bg-accent transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 text-sm text-foreground truncate">{att.fileName}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{att.fileSize > 0 ? `${(att.fileSize / 1024).toFixed(0)} KB` : "Cloud"}</span>
                        <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#e8170b] transition-colors flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Created {formatRelative(task.createdAt)}</p>
                {task.completedAt && <p>Completed {formatRelative(task.completedAt)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showLogTime && (
      <LogTimeModal
        taskId={taskId}
        taskTitle={task.title}
        estimatedHours={task.estimatedHours}
        onClose={() => setShowLogTime(false)}
      />
    )}
    {showEditForm && (
      <TaskForm
        editTask={{
          id: task.id,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
          startDate: task.startDate,
          estimatedHours: task.estimatedHours,
          campaignId: task.campaign?.id ?? null,
          listId: task.list?.id ?? null,
          assignees: task.assignees ?? [],
        }}
        onClose={() => setShowEditForm(false)}
        onSuccess={() => {
          setShowEditForm(false);
          queryClient.invalidateQueries({ queryKey: ["task", taskId] });
          onUpdate();
        }}
      />
    )}
    </>
  );
}

