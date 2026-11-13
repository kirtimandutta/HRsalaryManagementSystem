"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactUsd, formatUsd } from "@/lib/format";

type Point = { name: string; value: number };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-sm">
      <p className="text-muted">{label}</p>
      <p className="font-medium tabular-nums">{formatUsd(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

export function ValueBarChart({
  data,
  color = "#0f766e",
}: {
  data: Point[];
  color?: string;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#78716c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={70}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactUsd(value)}
            tick={{ fill: "#78716c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(28,25,23,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
