"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface KPICardProps {
  label: string;
  value: number | string;
  trend?: number;
  trendLabel?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  suffix?: string;
  invertTrend?: boolean; // for metrics where higher is bad (e.g., overdue)
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  trend,
  trendLabel = "vs last week",
  icon: Icon,
  iconColor,
  iconBg,
  suffix = "",
  invertTrend = false,
  onClick,
}: KPICardProps) {
  const isPositive = invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) > 0;
  const isNeutral = (trend ?? 0) === 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-4 flex flex-col gap-3",
        onClick && "cursor-pointer hover:border-[#e8170b]/40 hover:shadow-sm transition-all"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-4.5 h-4.5", iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        {trend !== undefined && !isNeutral && (
          <div className={cn(
            "flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full",
            isPositive
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
              : "text-red-500 bg-red-50 dark:bg-red-950/30"
          )}>
            {isPositive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
        {trend !== undefined && isNeutral && (
          <div className="flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full text-muted-foreground bg-muted">
            <Minus className="w-3 h-3" />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {value}{suffix}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{label}</p>
      </div>
      {trend !== undefined && !isNeutral && (
        <p className="text-[11px] text-muted-foreground">{Math.abs(trend)}% {trendLabel}</p>
      )}
    </div>
  );
}
