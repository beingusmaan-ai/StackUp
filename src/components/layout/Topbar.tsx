"use client";

import {
  Bell, Sun, Moon, Search, ChevronRight, Sparkles,
  LayoutDashboard, CheckSquare, Megaphone, CalendarDays,
  Users, BarChart3, Clock, Settings, BarChart2, Layers,
  Smile, LogOut, Palette, BellOff,
} from "lucide-react";
import { AskAIPanel } from "@/components/ai/AskAIPanel";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getInitials } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SetStatusModal } from "./SetStatusModal";

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
  const { sidebarCollapsed, activeTeamId, activeWorkspaceId } = useUIStore();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeTeamName, setActiveTeamName] = useState<string | null>(null);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitial, setAiInitial] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const MUTE_OPTIONS = [
    { label: "For 30 minutes", minutes: 30 },
    { label: "For 1 hour",     minutes: 60 },
    { label: "For 4 hours",    minutes: 240 },
    { label: "Until tomorrow", minutes: 60 * 24 },
    { label: "Until next week", minutes: 60 * 24 * 7 },
  ];

  async function handleMute(minutes: number) {
    const mutedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    await fetch("/api/users/me/mute", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutedUntil }),
    });
    queryClient.invalidateQueries({ queryKey: ["my-status"] });
    setShowMuteMenu(false);
    setShowUserMenu(false);
  }

  async function handleUnmute() {
    await fetch("/api/users/me/mute", { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["my-status"] });
  }

  const { data: statusData } = useQuery({
    queryKey: ["my-status"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/status");
      return res.json();
    },
    enabled: !!session?.user,
    staleTime: 30_000,
  });
  const rawStatus = statusData?.data;
  const isExpired = rawStatus?.statusExpiresAt ? new Date(rawStatus.statusExpiresAt) < new Date() : false;
  const userStatus = isExpired ? null : rawStatus;
  const mutedUntil = rawStatus?.notificationsMutedUntil ? new Date(rawStatus.notificationsMutedUntil) : null;
  const isMuted = !!mutedUntil && mutedUntil > new Date();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    if (!activeWorkspaceId) { setActiveWorkspaceName(null); return; }
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((d) => {
        const ws = (d.data || []).find((w: { id: string; name: string }) => w.id === activeWorkspaceId);
        setActiveWorkspaceName(ws?.name ?? null);
      })
      .catch(() => {});
  }, [activeWorkspaceId]);

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
    <>
    <header className={cn(
      "fixed top-0 right-0 z-30 h-[64px] flex items-center gap-3 px-5 transition-all duration-200",
      "bg-background/95 backdrop-blur-sm border-b border-border",
      sidebarCollapsed ? "left-[56px]" : "left-[252px]"
    )}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[12px] text-muted-foreground font-medium hidden sm:block">{activeWorkspaceName ?? "Arthur Lawrence"}</span>
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

      {/* Ask AI bar */}
      <button
        onClick={() => { setAiInitial(""); setAiOpen(true); }}
        className="flex items-center gap-2 bg-[#e8170b] hover:bg-[#c91409] rounded-lg px-3 py-1.5 transition-all flex-shrink-0 shadow-sm shadow-[#e8170b]/20"
      >
        <Sparkles className="w-3.5 h-3.5 text-white flex-shrink-0" />
        <span className="text-[12px] text-white font-medium hidden sm:block">Ask AI</span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">

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
          {isMuted ? <BellOff className="w-4 h-4 text-muted-foreground/50" /> : <Bell className="w-4 h-4" />}
          {!isMuted && <span className="absolute top-1 right-1 w-2 h-2 bg-[#e8170b] rounded-full ring-2 ring-background" />}
        </Link>

        {/* Avatar + dropdown */}
        {session?.user && (
          <div ref={menuRef} className="relative ml-0.5">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="relative flex-shrink-0">
                {session.user.image ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#e8170b]/20 group-hover:ring-[#e8170b]/40 transition-all">
                    <UserAvatar name={session.user.name || "U"} image={session.user.image} size="sm" className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#e8170b] flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#e8170b]/20 group-hover:ring-[#e8170b]/40 transition-all">
                    {getInitials(session.user.name || "U")}
                  </div>
                )}
                {userStatus?.statusEmoji && (
                  <span className="absolute -bottom-0.5 -right-1 text-[10px] leading-none select-none">{userStatus.statusEmoji}</span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[12px] font-semibold text-foreground leading-tight">{session.user.name?.split(" ")[0]}</p>
                <p className="text-[10px] leading-tight truncate max-w-[80px]">
                  {userStatus?.statusMessage
                    ? <span className="text-[#e8170b]/70">{userStatus.statusMessage}</span>
                    : <span className="text-muted-foreground capitalize">{session.user.role?.toLowerCase().replace(/_/g, " ") ?? "member"}</span>
                  }
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-2xl shadow-2xl z-50">
                {/* User header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border rounded-t-2xl overflow-hidden">
                  <div className="relative flex-shrink-0">
                    {session.user.image ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#e8170b]/20">
                        <UserAvatar name={session.user.name || "U"} image={session.user.image} size="md" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#e8170b] flex items-center justify-center text-sm font-bold text-white">
                        {getInitials(session.user.name || "U")}
                      </div>
                    )}
                    {userStatus?.statusEmoji && (
                      <span className="absolute -bottom-0.5 -right-1 text-[12px] leading-none">{userStatus.statusEmoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userStatus?.statusMessage ?? "Online"}
                    </p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => { setShowUserMenu(false); setShowStatusModal(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                  >
                    <Smile className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>Set status</span>
                    {userStatus?.statusEmoji && (
                      <span className="ml-auto text-base leading-none">{userStatus.statusEmoji}</span>
                    )}
                  </button>

                  {/* Mute notifications with flyout */}
                  <div
                    className="relative"
                    onMouseEnter={() => setShowMuteMenu(true)}
                    onMouseLeave={() => setShowMuteMenu(false)}
                  >
                    <button
                      onClick={isMuted ? handleUnmute : undefined}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                    >
                      <BellOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span>{isMuted ? `Muted until ${mutedUntil?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Mute notifications"}</span>
                      {!isMuted && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                      {isMuted && <span className="ml-auto text-xs text-[#e8170b] font-medium">Unmute</span>}
                    </button>

                    {showMuteMenu && !isMuted && (
                      <div className="absolute right-full top-0 w-52 bg-background border border-border rounded-xl shadow-xl py-1.5 z-50">
                        <p className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mute notifications</p>
                        {MUTE_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={() => handleMute(opt.minutes)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted/60 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="my-1 border-t border-border/60" />

                  <Link
                    href="/notifications"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/60 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>Notifications</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/60 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>Settings</span>
                  </Link>

                  <div className="flex items-center gap-3 px-4 py-2">
                    <Palette className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">Theme</span>
                    <div className="ml-auto flex items-center gap-0.5 p-0.5 bg-muted rounded-lg">
                      <button
                        onClick={() => setTheme("light")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                          theme === "light"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Sun className="w-3 h-3" /> Light
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                          theme === "dark"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Moon className="w-3 h-3" /> Dark
                      </button>
                    </div>
                  </div>

                  <div className="my-1 border-t border-border/60" />

                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>

      <AskAIPanel open={aiOpen} onClose={() => setAiOpen(false)} initialQuestion={aiInitial} />
      {showStatusModal && (
        <SetStatusModal
          onClose={() => setShowStatusModal(false)}
          currentStatus={userStatus}
          workspaceName={session?.user?.name?.split(" ")[0] ?? "Your"}
        />
      )}
    </>
  );
}
