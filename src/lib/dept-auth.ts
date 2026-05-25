import { db } from "@/lib/db";

// Returns null for global admin (no restriction), or array of dept IDs where caller is dept admin.
// Returns empty array if caller has no dept admin rights at all.
export async function getCallerDeptAdminIds(session: {
  user: { id: string; email?: string | null; role?: string | null };
}): Promise<string[] | null> {
  if (session.user.role === "ADMIN") return null;
  let dbUserId = session.user.id;
  if (session.user.email) {
    const me = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (me) dbUserId = me.id;
  }
  const rows = await db.departmentMember.findMany({
    where: { userId: dbUserId, role: "ADMIN" },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}
