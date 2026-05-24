import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveTeamId } from "@/lib/teamContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { CalendarView } from "@/components/tasks/CalendarView";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await auth();
  const activeTeamId = await getActiveTeamId();

  let teamFilter = {};
  if (activeTeamId) {
    const memberships = await db.departmentMember.findMany({
      where: { departmentId: activeTeamId },
      select: { userId: true },
    });
    const memberIds = memberships.map((m) => m.userId);
    teamFilter = {
      OR: [
        { assignedDepartmentId: activeTeamId },
        { assignees: { some: { userId: { in: memberIds } } } },
      ],
    };
  }

  const tasks = await db.task.findMany({
    where: { ...teamFilter, dueDate: { not: null }, status: { not: "COMPLETED" } },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      startDate: true,
      assignees: { include: { user: { select: { id: true, name: true } } } },
      campaign: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Task timeline view" />
      <CalendarView tasks={tasks} />
    </div>
  );
}
