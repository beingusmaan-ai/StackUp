import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cols: (string | number | null | undefined)[]): string {
  return cols.map(escapeCsv).join(",");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const requestedUserId = searchParams.get("userId");

  if (!from || !to) return new Response("Missing from/to params", { status: 400 });

  const isAdmin = session.user.role !== "TEAM_MEMBER";

  // Members can only export their own data
  const targetUserId = isAdmin ? (requestedUserId || null) : session.user.id;
  if (!isAdmin && requestedUserId && requestedUserId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(23, 59, 59, 999);

  const entries = await db.timeEntry.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(targetUserId ? { userId: targetUserId } : {}),
    },
    include: {
      task: { select: { title: true, campaign: { select: { name: true } } } },
      user: { select: { name: true, marketingRole: true } },
    },
    orderBy: [{ date: "asc" }, { user: { name: "asc" } }],
  });

  // Build CSV
  const lines: string[] = [
    row("Date", "Member", "Role", "Campaign", "Task", "Hours", "Note"),
  ];

  for (const e of entries) {
    lines.push(row(
      e.date.toISOString().split("T")[0],
      e.user.name,
      e.user.marketingRole?.replace(/_/g, " ") ?? "",
      e.task?.campaign?.name ?? "",
      e.task?.title ?? "",
      e.hours,
      e.note,
    ));
  }

  const csv = lines.join("\n");
  const filename = targetUserId
    ? `timesheet-${entries[0]?.user.name.replace(/\s+/g, "-") ?? "user"}-${from}-${to}.csv`
    : `timesheets-all-${from}-${to}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
