import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveTeamId } from "@/lib/teamContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TaskStatusChart } from "@/components/dashboard/TaskStatusChart";
import { CampaignProgressChart } from "@/components/dashboard/CampaignProgressChart";
import { TeamPerformanceTable } from "@/components/dashboard/TeamPerformanceTable";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp, Megaphone, ChevronRight,
} from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const now = new Date();
  const activeTeamId = await getActiveTeamId();

  // Resolve team members for scoped queries
  let teamMemberIds: string[] | null = null;
  if (activeTeamId) {
    const memberships = await db.departmentMember.findMany({
      where: { departmentId: activeTeamId },
      select: { userId: true },
    });
    teamMemberIds = memberships.map((m) => m.userId);
  }

  const taskWhere = teamMemberIds
    ? { OR: [{ assignedDepartmentId: activeTeamId }, { assignees: { some: { userId: { in: teamMemberIds } } } }] }
    : {};
  const campaignWhere = activeTeamId ? { departmentId: activeTeamId } : {};

  const [
    totalTasks,
    tasksDueToday,
    overdueTasks,
    completedThisWeek,
    activeCampaigns,
    tasksByStatus,
    teamMembers,
    recentActivity,
    campaigns,
  ] = await Promise.all([
    db.task.count({ where: { ...taskWhere, status: { not: "COMPLETED" }, parentTaskId: null } }),
    db.task.count({ where: { ...taskWhere, dueDate: { gte: startOfDay(now), lte: endOfDay(now) }, status: { not: "COMPLETED" } } }),
    db.task.count({ where: { ...taskWhere, dueDate: { lt: startOfDay(now) }, status: { notIn: ["COMPLETED", "BLOCKED"] } } }),
    db.task.count({ where: { ...taskWhere, completedAt: { gte: startOfWeek(now), lte: endOfWeek(now) }, status: "COMPLETED" } }),
    db.campaign.count({ where: { ...campaignWhere, status: "ACTIVE" } }),
    db.task.groupBy({ by: ["status"], where: taskWhere, _count: { status: true } }),
    db.user.findMany({
      where: teamMemberIds ? { isActive: true, id: { in: teamMemberIds } } : { isActive: true },
      include: { assignedTasks: { include: { task: { select: { status: true, dueDate: true } } } } },
      take: 8,
      orderBy: { name: "asc" },
    }),
    db.taskActivity.findMany({
      where: teamMemberIds ? { actorId: { in: teamMemberIds } } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { id: true, name: true, image: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    db.campaign.findMany({
      where: { ...campaignWhere, status: { in: ["ACTIVE", "DRAFT", "PAUSED"] } },
      include: { owner: { select: { id: true, name: true } }, tasks: { select: { status: true } } },
      take: 6,
      orderBy: { endDate: "asc" },
    }),
  ]);

  const teamPerformance = teamMembers.map((u) => {
    const assigned = u.assignedTasks.length;
    const completed = u.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
    const delayed = u.assignedTasks.filter(
      (a) => a.task.dueDate && a.task.dueDate < now && a.task.status !== "COMPLETED"
    ).length;
    return {
      user: { id: u.id, name: u.name, image: u.image, marketingRole: u.marketingRole },
      assigned,
      completed,
      delayed,
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    };
  });

  const campaignProgress = campaigns.map((c) => {
    const total = c.tasks.length;
    const done = c.tasks.filter((t) => t.status === "COMPLETED").length;
    return {
      campaign: { id: c.id, name: c.name, endDate: c.endDate, owner: c.owner, status: c.status },
      totalTasks: total,
      completedTasks: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const greeting = getGreeting();
  const firstName = session?.user.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const heroSubtext = overdueTasks > 0
    ? `${overdueTasks} overdue · let's get caught up`
    : tasksDueToday > 0
    ? `${tasksDueToday} due today · you've got this`
    : `Good ${greeting}, ${firstName}!`;

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Overview</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Here is the summary of your marketing data</p>
        </div>
        <span className="hidden md:block text-[12px] text-muted-foreground bg-card border border-border rounded-xl px-3 py-1.5 font-medium">
          {today}
        </span>
      </div>

      {/* 5 equal-width cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Active Tasks — sky blue pastel */}
        <Link href="/tasks" className="group h-full">
          <div
            className="relative rounded-2xl overflow-hidden p-5 h-full flex flex-col border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #e0f2fe, #bae6fd)", borderColor: "#0284c722" }}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "#0284c718" }}>
                <CheckSquare className="w-[18px] h-[18px]" style={{ color: "#0284c7" }} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#0284c7" }}>Active Tasks</p>
              <p className="text-[28px] font-bold leading-none mb-1" style={{ color: "#0c4a6e" }}>{totalTasks}</p>
              <p className="text-[11px]" style={{ color: "#0c4a6e99" }}>open tasks</p>
              <div className="flex items-center justify-between pt-3 mt-auto border-t" style={{ borderColor: "#0284c722" }}>
                <span className="text-[10px]" style={{ color: "#0c4a6e70" }}>overview</span>
                <span className="text-[11px] font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all" style={{ color: "#0284c7" }}>
                  View all <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </Link>

        <MetricCard title="Due Today"      value={tasksDueToday}     subtitle="Need attention" icon={Clock}        color="yellow" link="/tasks?filter=today" />
        <MetricCard title="Overdue"        value={overdueTasks}      subtitle="Past deadline"  icon={AlertTriangle} color="red"   link="/tasks?filter=overdue" />
        <MetricCard title="Done This Week" value={completedThisWeek} subtitle="Completed"      icon={TrendingUp}   color="green"  link="/tasks?filter=completed" />
        <MetricCard title="Projects"       value={activeCampaigns}   subtitle="Active now"     icon={Megaphone}    color="purple" link="/campaigns" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        <CampaignProgressChart data={campaignProgress} />
        <TaskStatusChart data={tasksByStatus.map((s) => ({ status: s.status, count: s._count.status }))} />
      </div>

      {/* Team + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <TeamPerformanceTable data={teamPerformance} />
        </div>
        <RecentActivity data={recentActivity as Parameters<typeof RecentActivity>[0]["data"]} />
      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
