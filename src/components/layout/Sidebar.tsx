"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import {
  LayoutDashboard, Megaphone, CalendarDays,
  Users, BarChart3, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, Plus,
  Clock, BarChart2, ChevronDown, Layers, TrendingUp, AlertTriangle, CheckSquare,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useEffect, useRef, useState } from "react";
import { TeamSwitcher } from "./TeamSwitcher";
import { SpacesTree } from "./SpacesTree";
import { TaskForm } from "@/components/tasks/TaskForm";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

const LOGO_B64 = "data:image/jpeg;base64,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";

const NAV_GROUPS = [
  {
    label: "Main Menu",
    items: [
      { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
      { href: "/campaigns",     label: "Projects",      icon: Megaphone, hasProjectsSub: true },
      { href: "/tasks",         label: "Tasks",         icon: CheckSquare },
      { href: "/calendar",      label: "Calendar",      icon: CalendarDays },
      { href: "/workload",      label: "Workload",      icon: BarChart2 },
      { href: "/templates",     label: "Templates",     icon: Layers },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/team",          label: "Team",          icon: Users },
      { href: "/reports",       label: "Reports",       icon: BarChart3, hasReportsSub: true },
    ],
  },
  {
    label: "General",
    items: [
      { href: "/timesheets",    label: "Timesheets",    icon: Clock },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings",      label: "Settings",      icon: Settings },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);


const REPORTS_SUB = [
  { href: "/reports",              label: "Executive",    icon: LayoutDashboard },
  { href: "/reports/team",         label: "Team",         icon: Users },
  { href: "/reports/campaigns",    label: "Projects",     icon: Megaphone },
  { href: "/reports/workload",     label: "Workload",     icon: BarChart2 },
  { href: "/reports/risk",         label: "Risk",         icon: AlertTriangle },
  { href: "/reports/productivity", label: "Productivity", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeListId = searchParams.get("list");
  const { data: session } = useSession();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [reportsOpen, setReportsOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const onReportsPath = pathname === "/reports" || pathname.startsWith("/reports/");
  useEffect(() => { if (onReportsPath) setReportsOpen(true); }, [onReportsPath]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    }
    if (createMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [createMenuOpen]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen flex">

      {/* ── Left icon rail ── */}
      <div className="w-[56px] bg-gradient-to-b from-[#ff2d1a] via-[#e8170b] to-[#9b0d06] flex flex-col h-full flex-shrink-0">

        {/* Logo */}
        <a
          href="/dashboard"
          className="flex items-center justify-center h-[64px] flex-shrink-0 hover:bg-white/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center ring-2 ring-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="AL" width={32} height={32} className="object-contain" />
          </div>
        </a>

        {/* Nav icons */}
        <nav className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-0.5 scrollbar-none">
          {ALL_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-10 py-2 rounded-xl transition-all",
                  isActive ? "bg-white/25" : "hover:bg-white/15"
                )}
              >
                <item.icon className="w-[16px] h-[16px] text-white" />
                <span className="text-[8px] text-white/80 font-medium leading-tight text-center max-w-full truncate px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User avatar */}
        {session?.user && (
          <div className="p-2.5 flex-shrink-0 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-white/25 ring-2 ring-white/30 flex items-center justify-center text-[10px] font-bold text-white">
              {getInitials(session.user.name || "U")}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      {!sidebarCollapsed && (
        <div className="w-[196px] bg-[#f2f2f2] dark:bg-[#0f172a] flex flex-col h-full border-r border-black/[0.07] dark:border-white/[0.06]">

          {/* Header */}
          <Link href="/dashboard" className="h-[64px] px-3 flex items-center gap-2.5 border-b border-black/[0.07] dark:border-white/[0.06] flex-shrink-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-800 dark:text-white leading-tight truncate">StackUp</p>
            </div>
          </Link>



          {/* Create button */}
          <div className="px-2 pb-1 flex-shrink-0" ref={createMenuRef}>
            <div className="relative">
              <button
                onClick={() => setCreateMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded-lg bg-[#e8170b] hover:bg-[#c71209] text-white text-[12px] font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Create</span>
              </button>
              {createMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-[#1e293b] border border-black/10 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  <button
                    onClick={() => { setCreateMenuOpen(false); setShowTaskForm(true); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />
                    Task
                  </button>
                  <button
                    onClick={() => { setCreateMenuOpen(false); setShowCampaignForm(true); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-[#e8170b] flex-shrink-0" />
                    Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-1.5 space-y-4 scrollbar-none">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest px-2 mb-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const isSpaces  = "hasProjectsSub" in item;
                    const isReports = item.href === "/reports" && "hasReportsSub" in item;
                    return (
                      <div key={item.href}>
                        {isSpaces ? (
                          <SpacesTree activeListId={activeListId} />
                        ) : (
                          <>
                            <div className="flex items-center gap-0.5">
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                                  isActive
                                    ? "bg-white dark:bg-white/[0.07] text-[#e8170b] dark:text-[#e8170b] shadow-sm"
                                    : "text-gray-500 dark:text-white/45 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:text-gray-800 dark:hover:text-white/80"
                                )}
                              >
                                <item.icon className={cn(
                                  "w-3.5 h-3.5 flex-shrink-0",
                                  isActive ? "text-[#e8170b]" : "text-gray-400 dark:text-white/30"
                                )} />
                                <span className="truncate">{item.label}</span>
                              </Link>
                              {isReports && (
                                <button
                                  onClick={() => setReportsOpen((v) => !v)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                >
                                  <ChevronDown className={cn("w-3 h-3 transition-transform", reportsOpen && "rotate-180")} />
                                </button>
                              )}
                            </div>

                            {/* Reports sub-tree */}
                            {isReports && reportsOpen && (
                              <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-[#e8170b]/20 pl-2.5">
                                {REPORTS_SUB.map((sub) => {
                                  const subActive = pathname === sub.href;
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      className={cn(
                                        "flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] transition-all",
                                        subActive
                                          ? "text-[#e8170b] font-semibold"
                                          : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/65"
                                      )}
                                    >
                                      <sub.icon className={cn("w-3 h-3 flex-shrink-0", subActive ? "text-[#e8170b]" : "text-gray-300 dark:text-white/20")} />
                                      <span className="truncate">{sub.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User + sign out */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-2 flex-shrink-0 space-y-0.5">
            {session?.user && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5">
                <div className="w-6 h-6 rounded-full bg-[#e8170b] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                  {getInitials(session.user.name || "U")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-800 dark:text-white/90 truncate">{session.user.name}</p>
                  <p className="text-[9px] text-gray-400 dark:text-white/35 truncate">{session.user.role?.replace(/_/g, " ")}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] hover:text-gray-600 dark:hover:text-white/60 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Create forms */}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onSuccess={() => setShowTaskForm(false)}
        />
      )}
      {showCampaignForm && (
        <CampaignForm
          onClose={() => setShowCampaignForm(false)}
          onSuccess={() => setShowCampaignForm(false)}
        />
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute top-[72px] w-5 h-5 rounded-full bg-white dark:bg-[#1e293b] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors shadow-md z-10",
          sidebarCollapsed ? "left-[44px]" : "left-[240px]"
        )}
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-2.5 h-2.5 text-gray-500 dark:text-white/50" />
          : <ChevronLeft className="w-2.5 h-2.5 text-gray-500 dark:text-white/50" />}
      </button>
    </aside>
  );
}
