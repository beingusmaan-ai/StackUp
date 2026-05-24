"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports", label: "Executive Dashboard" },
  { href: "/reports/team", label: "Team Reports" },
  { href: "/reports/campaigns", label: "Project Reports" },
  { href: "/reports/workload", label: "Workload" },
  { href: "/reports/risk", label: "Risk Center" },
  { href: "/reports/productivity", label: "Productivity" },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.href === "/reports" ? pathname === "/reports" : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                isActive
                  ? "border-[#e8170b] text-[#e8170b]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
