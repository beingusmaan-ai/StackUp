import Link from "next/link";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "brand" | "green" | "orange" | "yellow" | "red" | "purple" | "blue";
  link?: string;
  className?: string;
}

const colorMap = {
  brand:  { bgFrom: "#ffe4e6", bgTo: "#fecdd3", accent: "#e8170b", text: "#9f1239" },
  blue:   { bgFrom: "#e0f2fe", bgTo: "#bae6fd", accent: "#0284c7", text: "#0c4a6e" },
  yellow: { bgFrom: "#fefce8", bgTo: "#fef08a", accent: "#ca8a04", text: "#713f12" },
  orange: { bgFrom: "#ffedd5", bgTo: "#fed7aa", accent: "#ea580c", text: "#7c2d12" },
  red:    { bgFrom: "#fee2e2", bgTo: "#fecaca", accent: "#dc2626", text: "#7f1d1d" },
  green:  { bgFrom: "#dcfce7", bgTo: "#bbf7d0", accent: "#16a34a", text: "#14532d" },
  purple: { bgFrom: "#f3e8ff", bgTo: "#e9d5ff", accent: "#9333ea", text: "#581c87" },
};

export function MetricCard({ title, value, subtitle, icon: Icon, color = "blue", link, className }: MetricCardProps) {
  const c = colorMap[color];

  const inner = (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden p-5 h-full flex flex-col border",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${c.bgFrom}, ${c.bgTo})`,
        borderColor: c.accent + "22",
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: c.accent + "18" }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: c.accent }} />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: c.accent }}>
          {title}
        </p>
        <p className="text-[28px] font-bold leading-none mb-1" style={{ color: c.text }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px]" style={{ color: c.text + "99" }}>
            {subtitle}
          </p>
        )}

        <div
          className="flex items-center justify-between pt-3 mt-auto border-t"
          style={{ borderColor: c.accent + "22" }}
        >
          <span className="text-[10px]" style={{ color: c.text + "70" }}>overview</span>
          <span
            className="text-[11px] font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all"
            style={{ color: c.accent }}
          >
            View all <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );

  if (link) return <Link href={link} className="block h-full">{inner}</Link>;
  return inner;
}
