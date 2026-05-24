import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { UserAvatar, AvatarGroup } from "@/components/shared/UserAvatar";
import { formatDate, formatRelative } from "@/lib/utils";
import { HoursEditor } from "@/components/tasks/HoursEditor";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await auth();
  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, image: true, marketingRole: true } } } },
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      activityLog: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
      createdBy: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      subTasks: true,
      approvalRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { requester: { select: { name: true } }, decider: { select: { name: true } } },
      },
    },
  });

  if (!task) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks
      </Link>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.campaign && (
            <Link href={`/campaigns/${task.campaign.id}`} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400">
              {task.campaign.name}
            </Link>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>

        {task.description && (
          <p className="mt-3 text-muted-foreground whitespace-pre-wrap">{task.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Assignees</p>
            <AvatarGroup users={task.assignees.map((a) => a.user)} max={4} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Created by</p>
            <p className="text-sm font-medium">{task.createdBy.name}</p>
          </div>
          {task.dueDate && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due Date</p>
              <p className="text-sm font-medium">{formatDate(task.dueDate)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estimated Hours</p>
            <HoursEditor taskId={task.id} initialHours={task.estimatedHours} />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Comments ({task.comments.length})</h2>
        <div className="space-y-4">
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <UserAvatar name={c.author.name} image={c.author.image} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{c.author.name}</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          {task.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Activity</h2>
        <div className="space-y-3">
          {task.activityLog.map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium">{a.actor.name}</span>{" "}
                {a.action === "status_changed"
                  ? `changed status from ${a.fromValue?.replace(/_/g, " ")} to ${a.toValue?.replace(/_/g, " ")}`
                  : a.action.replace(/_/g, " ")}
                <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
