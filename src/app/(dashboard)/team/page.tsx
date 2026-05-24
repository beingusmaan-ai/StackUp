import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveTeamId } from "@/lib/teamContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { TeamMemberActions } from "@/components/team/TeamMemberActions";
import { TeamAIPanel } from "@/components/team/TeamAIPanel";
import { EditUserButton } from "@/components/team/EditUserButton";
import { Users } from "lucide-react";

export const metadata = { title: "Team" };

const ROLE_DOT: Record<string, string> = {
  ADMIN: "bg-[#e8170b]",
  TEAM_LEAD: "bg-[#8b5cf6]",
  TEAM_MEMBER: "bg-[#4169e1]",
};

const ROLE_TEXT: Record<string, string> = {
  ADMIN: "text-[#e8170b]",
  TEAM_LEAD: "text-[#8b5cf6]",
  TEAM_MEMBER: "text-[#4169e1]",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  TEAM_LEAD: "Team Lead",
  TEAM_MEMBER: "Team Member",
};

const MARKETING_ROLE_LABELS: Record<string, string> = {
  CONTENT_WRITER: "Content Writer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  VIDEO_EDITOR: "Video Editor",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  SEO_SPECIALIST: "SEO Specialist",
  PERFORMANCE_MARKETER: "Performance Marketer",
  CRM_EMAIL_MARKETER: "CRM / Email Marketer",
  MARKETING_MANAGER: "Marketing Manager",
};

export default async function TeamPage() {
  const session = await auth();
  const activeTeamId = await getActiveTeamId();

  // All teams overview (always shown)
  const allTeams = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  // Restrict to team members when a team is active
  let memberIdFilter: { id: { in: string[] } } | undefined;
  let activeTeamName: string | undefined;
  if (activeTeamId) {
    const memberships = await db.departmentMember.findMany({
      where: { departmentId: activeTeamId },
      select: { userId: true, department: { select: { name: true } } },
    });
    memberIdFilter = { id: { in: memberships.map((m) => m.userId) } };
    activeTeamName = memberships[0]?.department?.name;
  }

  const users = await db.user.findMany({
    where: { isActive: true, ...memberIdFilter },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      assignedTasks: {
        include: { task: { select: { status: true, dueDate: true } } },
      },
    },
  });

  const now = new Date();

  const memberStats = users.map((user) => {
    const assigned = user.assignedTasks.length;
    const completed = user.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
    const delayed = user.assignedTasks.filter(
      (a) => a.task.dueDate && new Date(a.task.dueDate) < now && a.task.status !== "COMPLETED"
    ).length;
    const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { id: user.id, name: user.name, role: user.role, marketingRole: user.marketingRole ?? null, assigned, completed, delayed, rate };
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {activeTeamName ? `${activeTeamName} · ` : ""}{users.length} active members
          </p>
        </div>
        {session?.user.role === "ADMIN" && <TeamMemberActions />}
      </div>

      {/* Teams overview */}
      {allTeams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
          {allTeams.map((team) => (
            <div
              key={team.id}
              className={cn(
                "bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors",
                activeTeamId === team.id ? "border-border shadow-sm" : "border-border"
              )}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: team.color ?? "#6366f1" }}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{team.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {team._count.members} {team._count.members === 1 ? "member" : "members"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamAIPanel members={memberStats} />

      {/* Members table heading */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-foreground">
          {activeTeamName ? `${activeTeamName} Members` : "All Members"}
        </h2>
        <span className="text-[12px] text-muted-foreground">{users.length} {users.length === 1 ? "person" : "people"}</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Column headers */}
        <div
          className="grid text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.4fr 2rem" }}
        >
          <div className="px-4 py-2.5">Member</div>
          <div className="px-3 py-2.5">Role</div>
          <div className="px-3 py-2.5">Job Title</div>
          <div className="px-3 py-2.5 text-center">Assigned</div>
          <div className="px-3 py-2.5 text-center">Completed</div>
          <div className="px-3 py-2.5">Completion Rate</div>
          <div />
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-[13px] text-muted-foreground">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => {
              const assigned = user.assignedTasks.length;
              const completed = user.assignedTasks.filter((a) => a.task.status === "COMPLETED").length;
              const delayed = user.assignedTasks.filter(
                (a) => a.task.dueDate && new Date(a.task.dueDate) < now && a.task.status !== "COMPLETED"
              ).length;
              const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

              return (
                <div
                  key={user.id}
                  className="grid items-center hover:bg-muted/30 transition-colors group"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.4fr 2rem" }}
                >
                  {/* Member */}
                  <div className="px-4 py-3 flex items-center gap-3 min-w-0">
                    <UserAvatar name={user.name} image={user.image} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="px-3 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", ROLE_TEXT[user.role] ?? "text-muted-foreground")}>
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", ROLE_DOT[user.role] ?? "bg-slate-400")} />
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>

                  {/* Job Title */}
                  <div className="px-3 py-3">
                    <span className="text-[12px] text-muted-foreground">
                      {user.marketingRole ? MARKETING_ROLE_LABELS[user.marketingRole] ?? user.marketingRole : "—"}
                    </span>
                  </div>

                  {/* Assigned */}
                  <div className="px-3 py-3 text-center">
                    <span className="text-[13px] font-semibold text-foreground">{assigned}</span>
                    {delayed > 0 && (
                      <span className="block text-[10px] text-red-500 font-medium">{delayed} delayed</span>
                    )}
                  </div>

                  {/* Completed */}
                  <div className="px-3 py-3 text-center">
                    <span className="text-[13px] font-semibold text-[#10b981]">{completed}</span>
                  </div>

                  {/* Completion rate */}
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            rate >= 80 ? "bg-[#10b981]" : rate >= 50 ? "bg-[#f59e0b]" : "bg-[#e8170b]"
                          )}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8 text-right">{rate}%</span>
                    </div>
                  </div>

                  {/* Edit */}
                  <div className="pr-2 flex items-center justify-center">
                    {(session?.user.role === "ADMIN" || session?.user.id === user.id) && (
                      <EditUserButton user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        marketingRole: user.marketingRole,
                        isActive: true,
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
