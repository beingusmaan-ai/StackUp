"use client";

import { Bell, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { sidebarCollapsed } = useUIStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center gap-4 px-6 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-64"
      )}
    >
      {title && (
        <h1 className="text-lg font-semibold text-foreground flex-1">{title}</h1>
      )}
      {!title && <div className="flex-1" />}

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3 py-2 w-64">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search tasks..."
          className="bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4 text-foreground" />
        ) : (
          <Moon className="w-4 h-4 text-foreground" />
        )}
      </button>

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Bell className="w-4 h-4 text-foreground" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          3
        </span>
      </Link>

      {/* Avatar */}
      {session?.user && (
        <Link
          href="/settings"
          className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          {getInitials(session.user.name || "U")}
        </Link>
      )}
    </header>
  );
}
