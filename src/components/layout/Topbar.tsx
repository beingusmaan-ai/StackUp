"use client";

import {
  Bell, Sun, Moon, Search, ChevronRight, Plus,
  LayoutDashboard, CheckSquare, Megaphone, CalendarDays,
  Users, BarChart3, Clock, Settings, BarChart2, Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getInitials } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type PageMeta = { label: string; icon: React.ComponentType<{ className?: string }> };

const PAGE_META: Record<string, PageMeta> = {
  dashboard:     { label: "Dashboard",   icon: LayoutDashboard },
  tasks:         { label: "Tasks",        icon: CheckSquare },
  campaigns:     { label: "Projects",     icon: Megaphone },
  calendar:      { label: "Calendar",     icon: CalendarDays },
  team:          { label: "Team",         icon: Users },
  reports:       { label: "Reports",      icon: BarChart3 },
  timesheets:    { label: "Timesheets",   icon: Clock },
  workload:      { label: "Workload",     icon: BarChart2 },
  notifications: { label: "Notifications", icon: Bell },
  settings:      { label: "Settings",    icon: Settings },
  templates:     { label: "Templates",   icon: Layers },
};

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { sidebarCollapsed, activeTeamId } = useUIStore();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!activeTeamId) { setActiveTeamName(null); return; }
    fetch("/api/departments?myTeams=true")
      .then((r) => r.json())
      .then((d) => {
        const team = (d.data || []).find((t: { id: string; name: string }) => t.id === activeTeamId);
        setActiveTeamName(team?.name ?? null);
      })
      .catch(() => {});
  }, [activeTeamId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/tasks?search=${encodeURIComponent(q)}`);
    setSearchQuery("");
    searchRef.current?.blur();
  }

  const segments = pathname.split("/").filter(Boolean);
  const rootSegment = segments[0] ?? "dashboard";
  const meta = PAGE_META[rootSegment] ?? { label: rootSegment, icon: LayoutDashboard };
  const PageIcon = meta.icon;

  const subLabel = segments.length > 1
    ? segments.slice(1).map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(" / ")
    : null;

  return (
    <header className={cn(
      "fixed top-0 right-0 z-30 h-[64px] flex items-center gap-3 px-5 transition-all duration-200",
      "bg-background/95 backdrop-blur-sm border-b border-border",
      sidebarCollapsed ? "left-[56px]" : "left-[252px]"
    )}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[12px] text-muted-foreground font-medium hidden sm:block">Arthur Lawrence</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40 hidden sm:block" />
          {activeTeamName && (
            <>
              <span className="text-[12px] text-muted-foreground font-medium hidden sm:block">{activeTeamName}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 hidden sm:block" />
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#e8170b]/10 flex items-center justify-center flex-shrink-0">
            <PageIcon className="w-3.5 h-3.5 text-[#e8170b]" />
          </div>
          <span className="text-[14px] font-semibold text-foreground truncate">{meta.label}</span>
          {subLabel && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-[13px] text-muted-foreground truncate">{subLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-2 bg-muted/60 hover:bg-muted focus-within:bg-muted focus-within:border-border border border-transparent rounded-lg px-3 py-1.5 w-48 transition-all">
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks…"
          className="text-[12px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground flex-1 w-0"
        />
        <kbd className="text-[9px] text-muted-foreground/60 border border-border rounded px-1 py-0.5 font-mono hidden lg:block flex-shrink-0">⌘K</kbd>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* New button */}
        <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#e8170b] hover:bg-[#c91409] text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm shadow-[#e8170b]/20">
          <Plus className="w-3.5 h-3.5" />
          New
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-border mx-1" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#e8170b] rounded-full ring-2 ring-background" />
        </Link>

        {/* Avatar */}
        {session?.user && (
          <Link
            href="/settings"
            className="flex items-center gap-2 pl-1 rounded-lg hover:bg-muted transition-colors group ml-0.5 pr-1 py-1"
          >
            {session.user.image ? (
              <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#e8170b]/20 group-hover:ring-[#e8170b]/40 transition-all flex-shrink-0">
                <UserAvatar name={session.user.name || "U"} image={session.user.image} size="sm" className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#e8170b] flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#e8170b]/20 group-hover:ring-[#e8170b]/40 transition-all flex-shrink-0">
                {getInitials(session.user.name || "U")}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-[12px] font-semibold text-foreground leading-tight">{session.user.name?.split(" ")[0]}</p>
              <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                {session.user.role?.toLowerCase().replace(/_/g, " ") ?? "member"}
              </p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
