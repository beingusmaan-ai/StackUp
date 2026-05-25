"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { useSession } from "next-auth/react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { TeamMemberActions } from "@/components/team/TeamMemberActions";
import { TeamAIPanel, type TeamMemberStat } from "@/components/team/TeamAIPanel";
import { EditUserButton } from "@/components/team/EditUserButton";
import { Users } from "lucide-react";
import { toast } from "sonner";

const ROLE_DOT: Record<string, string> = {
  ADMIN:       "bg-[#e8170b]",
  TEAM_LEAD:   "bg-[#8b5cf6]",
  TEAM_MEMBER: "bg-[#4169e1]",
};

const ROLE_TEXT: Record<string, string> = {
  ADMIN:       "text-[#e8170b]",
  TEAM_LEAD:   "text-[#8b5cf6]",
  TEAM_MEMBER: "text-[#4169e1]",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:       "Admin",
  TEAM_LEAD:   "Team Lead",
  TEAM_MEMBER: "Team Member",
};

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  marketingRole: string | null;
  image: string | null;
  assigned: number;
  completed: number;
  delayed: number;
  rate: number;
}

interface TeamData {
  id: string;
  name: string;
  color: string;
  _count: { members: number };
}

interface TeamResponse {
  users: TeamUser[];
  teams: TeamData[];
  activeTeamName: string | null;
  adminDeptIds: string[];
  deptAdminUserIds: string[];
}

export default function TeamPage() {
  const { data: session } = useSession();
  const { activeTeamId, setActiveTeamId } = useUIStore();

  function selectTeam(id: string | null) {
    setActiveTeamId(id);
    if (id) {
      document.cookie = `activeTeamId=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `activeTeamId=; path=/; max-age=0; SameSite=Lax`;
    }
  }
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["team", activeTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTeamId) params.set("teamId", activeTeamId);
      const res = await fetch(`/api/team?${params}`);
      if (!res.ok) throw new Error("Failed to load team");
      return res.json() as Promise<TeamResponse>;
    },
  });

  const users: TeamUser[]          = data?.users ?? [];
  const teams: TeamData[]          = data?.teams ?? [];
  const activeTeamName             = data?.activeTeamName ?? null;
  const adminDeptIds: string[]     = data?.adminDeptIds ?? [];
  const deptAdminUserIds: string[] = data?.deptAdminUserIds ?? [];

  const isGlobalAdmin     = session?.user.role === "ADMIN";
  const isActiveDeptAdmin = !isGlobalAdmin && !!activeTeamId && adminDeptIds.includes(activeTeamId);
  const canManageDeptAdmin = (isGlobalAdmin || isActiveDeptAdmin) && !!activeTeamId;

  async function toggleDeptAdmin(userId: string, isCurrentAdmin: boolean) {
    const newRole = isCurrentAdmin ? "MEMBER" : "ADMIN";
    try {
      const res = await fetch(`/api/departments/${activeTeamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(isCurrentAdmin ? "Dept admin removed" : "Promoted to dept admin");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const memberStats: TeamMemberStat[] = users.map((u) => ({
    id: u.id, name: u.name, role: u.role, marketingRole: u.marketingRole,
    assigned: u.assigned, completed: u.completed, delayed: u.delayed, rate: u.rate,
  }));

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-6 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 h-14 animate-pulse" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 border-b border-border animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Team</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {activeTeamName ? `${activeTeamName} · ` : ""}{users.length} active member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        {(isGlobalAdmin || isActiveDeptAdmin) && (
          <TeamMemberActions
            isGlobalAdmin={isGlobalAdmin && !activeTeamId}
            isDeptAdmin={isActiveDeptAdmin}
            adminDeptIds={adminDeptIds}
            onMutate={() => queryClient.invalidateQueries({ queryKey: ["team"] })}
          />
        )}
      </div>

      {/* Teams overview — global admin only, always visible */}
      {isGlobalAdmin && teams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
          {teams.map((team) => {
            const isActive = activeTeamId === team.id;
            return (
              <button
                key={team.id}
                onClick={() => isActive ? selectTeam(null) : selectTeam(team.id)}
                className={cn(
                  "border rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-all",
                  isActive
                    ? "bg-[#e8170b]/5 border-[#e8170b]/40 shadow-sm"
                    : "bg-card border-border hover:border-[#e8170b]/40 hover:shadow-sm"
                )}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color ?? "#6366f1" }} />
                <div className="min-w-0">
                  <p className={cn("text-[13px] font-semibold truncate", isActive ? "text-[#e8170b]" : "text-foreground")}>{team.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {team._count.members} {team._count.members === 1 ? "member" : "members"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TeamAIPanel members={memberStats} />

      {/* Members table heading */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-foreground">
          {activeTeamName ? `${activeTeamName} Members` : "All Members"}
        </h2>
        <span className="text-[12px] text-muted-foreground">
          {users.length} {users.length === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
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
            {users.map((user) => (
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
                  {canManageDeptAdmin ? (
                    <button
                      onClick={() => toggleDeptAdmin(user.id, deptAdminUserIds.includes(user.id))}
                      className={cn(
                        "block text-[10px] font-medium mt-0.5 hover:underline transition-colors",
                        deptAdminUserIds.includes(user.id) ? "text-violet-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {deptAdminUserIds.includes(user.id) ? "Dept Admin ×" : "Make Dept Admin"}
                    </button>
                  ) : deptAdminUserIds.includes(user.id) ? (
                    <span className="block text-[10px] font-medium text-violet-500 mt-0.5">Dept Admin</span>
                  ) : null}
                </div>

                {/* Job Title */}
                <div className="px-3 py-3">
                  <span className="text-[12px] text-muted-foreground">
                    {user.marketingRole ?? "—"}
                  </span>
                </div>

                {/* Assigned */}
                <div className="px-3 py-3 text-center">
                  <span className="text-[13px] font-semibold text-foreground">{user.assigned}</span>
                  {user.delayed > 0 && (
                    <span className="block text-[10px] text-red-500 font-medium">{user.delayed} delayed</span>
                  )}
                </div>

                {/* Completed */}
                <div className="px-3 py-3 text-center">
                  <span className="text-[13px] font-semibold text-[#10b981]">{user.completed}</span>
                </div>

                {/* Completion rate */}
                <div className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          user.rate >= 80 ? "bg-[#10b981]" : user.rate >= 50 ? "bg-[#f59e0b]" : "bg-[#e8170b]"
                        )}
                        style={{ width: `${user.rate}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-8 text-right">{user.rate}%</span>
                  </div>
                </div>

                {/* Edit */}
                <div className="pr-2 flex items-center justify-center">
                  {(isGlobalAdmin || isActiveDeptAdmin || session?.user.email === user.email) && (
                    <EditUserButton
                      user={{ id: user.id, name: user.name, email: user.email, role: user.role, marketingRole: user.marketingRole, isActive: true }}
                      isDeptAdmin={isActiveDeptAdmin && session?.user.email !== user.email}
                      isSelf={session?.user.email === user.email}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ["team"] })}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
