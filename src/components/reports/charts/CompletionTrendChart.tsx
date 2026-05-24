"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  completed: number;
}

interface CompletionTrendChartProps {
  data: DataPoint[];
}

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e8170b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#e8170b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
          itemStyle={{ color: "#e8170b" }}
          cursor={{ stroke: "#e8170b", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="#e8170b"
          strokeWidth={2}
          fill="url(#completionGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#e8170b" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
