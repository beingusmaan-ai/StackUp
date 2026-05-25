"use client";

import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { PageHeader } from "@/components/shared/PageHeader";
import { CalendarView } from "@/components/tasks/CalendarView";

export default function CalendarPage() {
  const { activeTeamId } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", activeTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTeamId) params.set("teamId", activeTeamId);
      const res = await fetch(`/api/calendar?${params}`);
      if (!res.ok) throw new Error("Failed to load calendar");
      return res.json();
    },
  });

  const tasks = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Task timeline view" />
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#e8170b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <CalendarView tasks={tasks} />
      )}
    </div>
  );
}
