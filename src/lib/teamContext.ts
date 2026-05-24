import { cookies } from "next/headers";

export async function getActiveTeamId(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get("activeTeamId")?.value;
  return val && val !== "null" && val !== "" ? val : null;
}
