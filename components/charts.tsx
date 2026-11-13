"use client";

import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactUsd, formatUsd } from "@/lib/format";

type Point = { name: string; value: number };

function useNarrow(query = "(max-width: 767px)") {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

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
    <div className="max-w-[220px] rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-sm">
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
  const narrow = useNarrow();
  const height = narrow ? Math.max(240, data.length * 36) : 288;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={narrow ? "vertical" : "horizontal"}
          margin={narrow ? { top: 4, right: 16, left: 0, bottom: 4 } : { top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          {narrow ? (
            <>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tick={{ fill: "#78716c", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: "#78716c", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={68}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactUsd(value)}
                tick={{ fill: "#78716c", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
            </>
          )}
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(28,25,23,0.04)" }}
            wrapperStyle={{ zIndex: 30, outline: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar dataKey="value" fill={color} radius={narrow ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
