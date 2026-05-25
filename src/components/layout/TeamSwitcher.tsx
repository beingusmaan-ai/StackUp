"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Check } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  color: string;
}

export function TeamSwitcher() {
  const { data: session } = useSession();
  const { activeTeamId, setActiveTeamId } = useUIStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function persistTeam(id: string | null) {
    setActiveTeamId(id);
    if (id) {
      document.cookie = `activeTeamId=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `activeTeamId=; path=/; max-age=0; SameSite=Lax`;
    }
  }

  useEffect(() => {
    if (!session) return;
    const url = session.user.role === "ADMIN" ? "/api/departments" : "/api/departments?myTeams=true";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const fetched: Team[] = (d.data || []).map((t: Team) => ({
          id: t.id,
          name: t.name,
          color: t.color,
        }));
        setTeams(fetched);
        if (fetched.length === 0) return;
        const validSaved = activeTeamId && fetched.find((t) => t.id === activeTeamId);
        if (!validSaved) {
          persistTeam(fetched[0].id);
        } else {
          document.cookie = `activeTeamId=${activeTeamId}; path=/; max-age=31536000; SameSite=Lax`;
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;

  if (teams.length <= 1) return null;

  return (
    <div ref={ref} className="relative px-3 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left",
          "bg-white dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.07]",
          "hover:border-black/20 dark:hover:border-white/15 hover:shadow-sm"
        )}
      >
        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: activeTeam?.color ?? "#6366f1" }} />
        <span className="flex-1 text-[13px] font-semibold text-gray-800 dark:text-white/90 truncate">
          {activeTeam?.name ?? "Select Team"}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-[#1e293b] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-lg overflow-hidden">
          <div className="py-1">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => { persistTeam(team.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-left"
              >
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                <span className="flex-1 text-[13px] text-gray-700 dark:text-white/80">{team.name}</span>
                {activeTeamId === team.id && <Check className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
