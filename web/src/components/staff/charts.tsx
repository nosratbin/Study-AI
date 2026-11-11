"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/vengeance/chart";
import StatsCounter from "@/components/vengeance/stats-counter";
import type { DayCount, LabelCount } from "@/lib/types";

/** "12 Mar" from a YYYY-MM-DD Bangladesh calendar day. */
function shortDay(day: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(`${day}T12:00:00+06:00`));
}

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  suffix = "",
}: {
  label: string;
  value: number | null;
  icon: LucideIcon;
  hint?: string;
  suffix?: string;
}) {
  const still = useReducedMotion();
  return (
    <Card className="p-4 sm:p-5">
      <Icon className="size-5 text-brand-500" aria-hidden />
      <p className="mt-3 text-2xl font-bold tabular-nums">
        {value === null ? (
          "—"
        ) : still ? (
          `${value}${suffix}`
        ) : (
          <>
            <span aria-hidden>
              <StatsCounter value={value} duration={0.8} />
              {suffix}
            </span>
            <span className="sr-only">{`${value}${suffix}`}</span>
          </>
        )}
      </p>
      <p className="text-sm text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

/** Daily counts as an area chart, with a screen-reader summary. */
export function DayChart({ data, label, color = "var(--chart-1)" }: { data: DayCount[]; label: string; color?: string }) {
  const config = { count: { label, color } } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, name: shortDay(d.day) }));
  const total = data.reduce((s, d) => s + d.count, 0);
  const id = useId().replace(/:/g, "");
  return (
    <figure>
      <ChartContainer config={config} className="aspect-auto h-48 w-full" aria-hidden>
        <AreaChart data={rows} margin={{ left: -24, right: 8, top: 8 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} fill={`url(#fill-${id})`} />
        </AreaChart>
      </ChartContainer>
      <figcaption className="sr-only">
        {label}: {total} in the last {data.length} days.
      </figcaption>
    </figure>
  );
}

/** Horizontal bars for a few labelled counts or percentages. */
export function LabelBars({ data, label, suffix = "", color = "var(--chart-1)" }: { data: LabelCount[]; label: string; suffix?: string; color?: string }) {
  const config = { count: { label, color } } satisfies ChartConfig;
  return (
    <figure>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(120, data.length * 44) }} aria-hidden>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" hide allowDecimals={false} domain={suffix === "%" ? [0, 100] : undefined} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} interval={0} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => `${item.payload?.label ?? label}: ${v}${suffix}`} />}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={6} barSize={20} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        {label}: {data.map((d) => `${d.label} ${d.count}${suffix}`).join(", ")}.
      </figcaption>
    </figure>
  );
}
