"use client";

/**
 * Dashboard visualization suite (screenshots set):
 *  1. UptimeGrid      — monitoring/status page, 90-day status bars per service
 *  2. ActivityHeatmap — deployments/incidents/reviews heatmap with tooltips
 *  3. GoalGauges      — quarterly radial goal gauges (Q1–Q4)
 *  4. ServiceHealth   — selectable sparkline cards + detail chart (1h/24h/7d)
 * All data is deterministic (seeded PRNG) so SSR/CSR always agree.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* Deterministic PRNG so demo data is stable between renders */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────── 1. Uptime / status ───────────────────────── */

const SERVICES = ["CDN Core (edge)", "Dashboard", "Upload API", "Registry /dl/", "Auth & Tokens", "Webhooks", "Search", "Metrics"];
type DayState = 0 | 1 | 2; // 0 operational, 1 degraded, 2 outage

function serviceDays(seed: number, days: number): DayState[] {
  const rand = mulberry32(seed);
  return Array.from({ length: days }, () => {
    const r = rand();
    return r > 0.995 ? 2 : r > 0.975 ? 1 : 0;
  });
}

export function UptimeGrid() {
  const [range, setRange] = useState<30 | 60 | 90>(90);
  const grid = useMemo(
    () => SERVICES.map((name, i) => ({ name, days: serviceDays(1000 + i * 77, 90) })),
    []
  );
  const all = grid.flatMap((s) => s.days.slice(-range));
  const outages = all.filter((d) => d === 2).length;
  const degraded = all.filter((d) => d === 1).length;
  const uptime = (100 - ((outages * 1 + degraded * 0.35) / Math.max(1, all.length)) * 100).toFixed(3);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {outages === 0 ? "All systems operational" : `${outages} outage day${outages > 1 ? "s" : ""} in window`}
            </CardTitle>
            <CardDescription>{uptime}% average uptime over the last {range} days</CardDescription>
          </div>
          <div className="flex rounded-full border p-0.5" role="group" aria-label="Uptime window">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                aria-pressed={range === d}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", range === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {grid.map((s) => {
          const days = s.days.slice(-range);
          const svcUptime = (100 - (days.filter((d) => d === 2).length + days.filter((d) => d === 1).length * 0.35) / days.length * 100).toFixed(2);
          return (
            <div key={s.name} className="grid grid-cols-[130px_1fr_64px] items-center gap-3">
              <span className="truncate text-sm font-medium">{s.name}</span>
              <div className="flex gap-[2px]" role="img" aria-label={`${s.name}: ${svcUptime}% uptime over ${range} days`}>
                {days.map((d, i) => (
                  <span
                    key={i}
                    title={`${range - i} day${range - i === 1 ? "" : "s"} ago — ${d === 0 ? "Operational" : d === 1 ? "Degraded" : "Outage"}`}
                    className={cn(
                      "h-7 flex-1 rounded-[2px] transition-transform hover:scale-y-125",
                      d === 0 ? "bg-emerald-500/85" : d === 1 ? "bg-amber-500" : "bg-red-500"
                    )}
                  />
                ))}
              </div>
              <span className="text-right text-xs tabular-nums text-muted-foreground">{svcUptime}%</span>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/85" /> Operational</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Degraded</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Outage</span>
          <span className="ml-auto">{new Date(Date.now() - range * 864e5).toLocaleDateString()} → today</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── 2. Activity heatmap ───────────────────────── */

const HEAT_TABS = ["Deployments", "Incidents", "Reviews"] as const;

export function ActivityHeatmap() {
  const [tab, setTab] = useState<(typeof HEAT_TABS)[number]>("Deployments");
  const [hover, setHover] = useState<{ week: number; day: number; value: number } | null>(null);

  const { cells, total, busiest, streak } = useMemo(() => {
    const seed = tab === "Deployments" ? 42 : tab === "Incidents" ? 77 : 123;
    const rand = mulberry32(seed);
    const weeks = 26, days = 7;
    const cells: number[][] = [];
    let total = 0, busiest = 0, streak = 0, run = 0;
    for (let wI = 0; wI < weeks; wI++) {
      cells[wI] = [];
      for (let dI = 0; dI < days; dI++) {
        const weekendDip = dI >= 5 ? 0.35 : 1;
        const v = Math.max(0, Math.round(rand() * rand() * 14 * weekendDip));
        cells[wI][dI] = v;
        total += v;
        busiest = Math.max(busiest, v);
        if (v > 0) { run++; streak = Math.max(streak, run); } else run = 0;
      }
    }
    return { cells, total, busiest, streak };
  }, [tab]);

  const shade = (v: number) =>
    v === 0 ? "bg-muted" : v <= 3 ? "bg-emerald-500/30" : v <= 6 ? "bg-emerald-500/55" : v <= 10 ? "bg-emerald-500/80" : "bg-emerald-600";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              <b className="text-foreground">{total}</b> {tab.toLowerCase()} in the last 26 weeks · busiest day {busiest} · longest streak {streak} days
            </CardDescription>
          </div>
          <div className="flex rounded-full border p-0.5" role="tablist" aria-label="Activity type">
            {HEAT_TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-0.5 text-[10px] leading-none text-muted-foreground">
            <span>Mon</span><span>Wed</span><span>Fri</span>
          </div>
          <div className="relative flex-1">
            <div className="grid grid-flow-col grid-rows-7 gap-[3px]" onMouseLeave={() => setHover(null)}>
              {cells.map((week, wI) =>
                week.map((v, dI) => (
                  <button
                    key={`${wI}-${dI}`}
                    aria-label={`${v} ${tab.toLowerCase()}, week ${wI + 1}, day ${dI + 1}`}
                    onMouseEnter={() => setHover({ week: wI, day: dI, value: v })}
                    className={cn("aspect-square w-full rounded-[2px] transition-transform hover:scale-125", shade(v))}
                  />
                ))
              )}
            </div>
            {hover && (
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
                <b>{hover.value}</b> {tab.toLowerCase()} · week {hover.week + 1}, day {hover.day + 1}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          Less
          {[0, 2, 5, 8, 12].map((v) => <span key={v} className={cn("h-2.5 w-2.5 rounded-[2px]", shade(v))} />)}
          More
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── 3. Radial goal gauges ───────────────────────── */

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const GOALS: Record<(typeof QUARTERS)[number], Array<{ label: string; pct: number; target: string }>> = {
  Q1: [{ label: "Uploads shipped", pct: 82, target: "12k files" }, { label: "Bandwidth served", pct: 64, target: "8 TB" }, { label: "New workspaces", pct: 91, target: "220" }],
  Q2: [{ label: "Uploads shipped", pct: 88, target: "15k files" }, { label: "Bandwidth served", pct: 73, target: "11 TB" }, { label: "New workspaces", pct: 79, target: "300" }],
  Q3: [{ label: "Uploads shipped", pct: 94, target: "18k files" }, { label: "Bandwidth served", pct: 81, target: "14 TB" }, { label: "New workspaces", pct: 86, target: "380" }],
  Q4: [{ label: "Uploads shipped", pct: 71, target: "22k files" }, { label: "Bandwidth served", pct: 58, target: "18 TB" }, { label: "New workspaces", pct: 66, target: "500" }],
};

function Gauge({ pct, label, target }: { pct: number; label: string; target: string }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
          <circle
            cx="42" cy="42" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
            className="stroke-primary transition-all duration-700"
            strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{pct}%</span>
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">target {target}</p>
      </div>
    </div>
  );
}

export function GoalGauges() {
  const [q, setQ] = useState<(typeof QUARTERS)[number]>("Q3");
  const goals = GOALS[q];
  const blended = Math.round(goals.reduce((s, g) => s + g.pct, 0) / goals.length);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Quarterly goals</CardTitle>
            <CardDescription>Delivery targets across the Bastion workspace.</CardDescription>
          </div>
          <div className="flex rounded-full border p-0.5" role="tablist" aria-label="Quarter">
            {QUARTERS.map((quarter) => (
              <button
                key={quarter}
                role="tab"
                aria-selected={q === quarter}
                onClick={() => setQ(quarter)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", q === quarter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {quarter}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {goals.map((g) => <Gauge key={g.label} {...g} />)}
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Blended attainment · {q}</span>
          <Badge variant={blended >= 80 ? "default" : "secondary"}>{blended}%</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── 4. Service health sparklines ───────────────────────── */

const METRICS = [
  { id: "requests", label: "Request rate", unit: "req/s", seed: 5, base: 1240, spread: 420, format: (v: number) => `${Math.round(v).toLocaleString()} req/s` },
  { id: "latency", label: "p95 latency", unit: "ms", seed: 9, base: 86, spread: 34, format: (v: number) => `${Math.round(v)} ms` },
  { id: "errors", label: "Error rate", unit: "%", seed: 13, base: 0.42, spread: 0.3, format: (v: number) => `${v.toFixed(2)}%` },
  { id: "cpu", label: "CPU saturation", unit: "%", seed: 21, base: 57, spread: 18, format: (v: number) => `${Math.round(v)}%` },
] as const;

function series(seed: number, points: number, base: number, spread: number) {
  const rand = mulberry32(seed * 1000 + points);
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin(i / 6) * 0.35 + Math.sin(i / 2.7) * 0.2;
    return Math.max(0.01, base + wave * spread + (rand() - 0.5) * spread * 0.8);
  });
}

function sparkPath(values: number[], w: number, h: number) {
  const max = Math.max(...values), min = Math.min(...values);
  const norm = (v: number) => h - 3 - ((v - min) / Math.max(1e-9, max - min)) * (h - 6);
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * w).toFixed(1)},${norm(v).toFixed(1)}`).join(" ");
}

export function ServiceHealth() {
  const [tf, setTf] = useState<"1h" | "24h" | "7d">("24h");
  const [selected, setSelected] = useState<(typeof METRICS)[number]["id"]>("requests");
  const points = tf === "1h" ? 36 : tf === "24h" ? 48 : 56;
  const metric = METRICS.find((m) => m.id === selected)!;
  const data = useMemo(
    () => Object.fromEntries(METRICS.map((m) => [m.id, series(m.seed, points, m.base, m.spread)])),
    [points]
  ) as Record<string, number[]>;
  const current = data[selected];
  const peak = Math.max(...current), low = Math.min(...current);
  const avg = current.reduce((s, v) => s + v, 0) / current.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Service health</CardTitle>
            <CardDescription>Live shape of the Bastion CDN core.</CardDescription>
          </div>
          <div className="flex rounded-full border p-0.5" role="group" aria-label="Time window">
            {(["1h", "24h", "7d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                aria-pressed={tf === t}
                className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", tf === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {METRICS.map((m) => {
            const vals = data[m.id];
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                aria-pressed={selected === m.id}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  selected === m.id ? "border-primary bg-accent/60 shadow-sm" : "hover:bg-accent/40"
                )}
              >
                <span className="block text-xs text-muted-foreground">{m.label}</span>
                <span className="block text-lg font-bold tabular-nums">{m.format(vals[vals.length - 1])}</span>
                <svg viewBox="0 0 100 28" className="mt-1.5 h-7 w-full" preserveAspectRatio="none" aria-hidden="true">
                  <path d={sparkPath(vals, 100, 28)} fill="none" strokeWidth="1.8" className="stroke-primary" />
                </svg>
              </button>
            );
          })}
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{metric.label} <span className="text-sm font-normal text-muted-foreground">· last {tf}</span></p>
            <p className="text-xl font-bold tabular-nums">{metric.format(current[current.length - 1])}</p>
          </div>
          <svg viewBox="0 0 600 180" className="mt-3 h-44 w-full" preserveAspectRatio="none" role="img" aria-label={`${metric.label} chart`}>
            <path d={`${sparkPath(current, 600, 180)} L600,180 L0,180 Z`} className="fill-primary/10" stroke="none" />
            <path d={sparkPath(current, 600, 180)} fill="none" strokeWidth="2.2" className="stroke-primary" />
          </svg>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {([["Peak", peak], ["Average", avg], ["Low", low]] as const).map(([label, v]) => (
              <div key={label} className="rounded-lg bg-muted/60 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="font-semibold tabular-nums">{metric.format(v)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
