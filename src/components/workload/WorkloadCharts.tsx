"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { useTheme } from "next-themes";
import { type UserWorkload, type CampaignWorkload, STATUS_CONFIG } from "@/lib/workload";

interface Props {
  users: UserWorkload[];
  campaigns: CampaignWorkload[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipCapacity({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-[12px]">
      <p className="font-semibold text-foreground mb-0.5">{payload[0]?.payload?.fullName || label}</p>
      <p className="text-muted-foreground">
        Capacity: <span className="font-bold text-foreground">{value}%</span>
      </p>
      <p className="text-muted-foreground">Score: {payload[0]?.payload?.score} / {payload[0]?.payload?.capacity} pts</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipCampaign({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-[12px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">
        Workload: <span className="font-bold text-foreground">{payload[0]?.value} pts</span>
      </p>
    </div>
  );
}

export function WorkloadCharts({ users, campaigns }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#374151" : "#f3f4f6";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const capacityData = users.map((u) => ({
    name: u.name.split(" ")[0],
    fullName: u.name,
    usage: Math.round(u.capacityUsage),
    score: u.workloadScore,
    capacity: u.weeklyCapacity,
    status: u.status,
  }));

  const campaignData = campaigns.slice(0, 6).map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
    score: c.workloadScore,
  }));

  const chartHeight = Math.max(180, capacityData.length * 38);
  const campaignChartHeight = Math.max(120, campaignData.length * 40);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Team capacity chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-foreground">Team Capacity Overview</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Current workload vs. weekly capacity limit</p>
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={capacityData} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
            <XAxis
              type="number"
              domain={[0, Math.max(150, Math.ceil(Math.max(...capacityData.map(d => d.usage)) / 10) * 10 + 10)]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: tickColor }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={62}
              tick={{ fontSize: 12, fill: tickColor }}
            />
            <Tooltip content={<CustomTooltipCapacity />} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
            <ReferenceLine x={100} stroke="#e8170b" strokeDasharray="4 2" strokeWidth={1.5} />
            <Bar dataKey="usage" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {capacityData.map((entry, i) => (
                <Cell key={i} fill={STATUS_CONFIG[entry.status].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <span className="w-4 border-t-2 border-dashed border-[#e8170b] inline-block" />
          100% limit
        </div>
      </div>

      {/* Campaign workload chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-foreground">Campaign Workload</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active workload points per campaign</p>
        </div>
        {campaignData.length > 0 ? (
          <ResponsiveContainer width="100%" height={campaignChartHeight}>
            <BarChart data={campaignData} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
              <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: tickColor }} />
              <Tooltip content={<CustomTooltipCampaign />} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
              <Bar dataKey="score" fill="#e8170b" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-[12px] text-muted-foreground">
            No active campaigns
          </div>
        )}
      </div>
    </div>
  );
}
