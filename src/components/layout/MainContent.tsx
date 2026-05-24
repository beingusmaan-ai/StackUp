"use client";

import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <main
      className={cn(
        "min-h-screen pt-[64px] transition-all duration-200",
        sidebarCollapsed ? "ml-[56px]" : "ml-[252px]"
      )}
    >
      <div className="p-6">{children}</div>
    </main>
  );
}
