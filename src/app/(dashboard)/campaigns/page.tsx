"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { Plus, Target, Calendar, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { CampaignStatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDate, cn } from "@/lib/utils";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  startDate: string;
  endDate: string;
  budget?: number | null;
  goals?: string | null;
  owner: { id: string; name: string; image?: string | null };
  department?: { id: string; name: string; color: string } | null;
  _count: { tasks: number };
  completedTasks: number;
  progress: number;
}

export default function CampaignsPage() {
  const [showForm, setShowForm] = useState(false);
  const { activeTeamId, activeWorkspaceId } = useUIStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", activeWorkspaceId, activeTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeWorkspaceId) params.set("workspaceId", activeWorkspaceId);
      if (activeTeamId) params.set("departmentId", activeTeamId);
      const res = await fetch(`/api/campaigns?${params}`);
      return res.json();
    },
  });

  const campaigns: Campaign[] = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${campaigns.length} project${campaigns.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#e8170b] hover:bg-[#c91409] text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
          {campaigns.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started.</p>
            </div>
          ) : (
              campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <CampaignStatusBadge status={campaign.status} />
                    <UserAvatar name={campaign.owner.name} image={campaign.owner.image} size="sm" />
                  </div>

                  <h3 className="font-semibold text-foreground group-hover:text-[#e8170b] transition-colors mb-1">
                    {campaign.name}
                  </h3>

                  {campaign.department && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: campaign.department.color }}
                      />
                      <span className="text-xs text-muted-foreground">{campaign.department.name}</span>
                    </div>
                  )}

                  {campaign.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{campaign.description}</p>
                  )}

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{campaign.completedTasks} / {campaign._count.tasks} tasks</span>
                      <span className="font-medium text-[#e8170b]">{campaign.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          campaign.progress >= 80 ? "bg-[#10b981]" : campaign.progress >= 40 ? "bg-[#f59e0b]" : "bg-[#e8170b]"
                        )}
                        style={{ width: `${campaign.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                    </span>
                    {campaign.budget && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        ${Number(campaign.budget).toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

      {showForm && (
        <CampaignForm
          onClose={() => setShowForm(false)}
          defaultDepartmentId={activeTeamId}
          onSuccess={(_id?: string) => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          }}
        />
      )}
    </div>
  );
}
