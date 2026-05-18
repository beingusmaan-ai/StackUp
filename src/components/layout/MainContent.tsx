"use client";

import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <main
      className={cn(
        "min-h-screen pt-16 transition-all duration-300",
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}
    >
      <div className="p-6">{children}</div>
    </main>
  );
}
