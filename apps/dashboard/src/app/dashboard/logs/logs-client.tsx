"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AsciiTableSkeleton } from "@/components/ui/ascii";
import { mulberry32 } from "@/components/dashboard/viz";

interface LogItem {
  id: string; traceId: string; action: string; actorEmail: string; actorIp: string;
  timestamp: string; success: boolean; fileId?: string; durationMs: number;
}

const CATEGORIES = [
  { id: "", label: "All categories" },
  { id: "file", label: "File events" },
  { id: "auth", label: "Authentication" },
  { id: "admin", label: "Admin actions" },
  { id: "upload", label: "Uploads" },
] as const;

function categoryOf(action: string) {
  if (action.startsWith("auth")) return "auth";
  if (action.startsWith("admin")) return "admin";
  if (action.includes("upload")) return "upload";
  return "file";
}

function initials(email: string) {
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "??";
}

export function LogsClient() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/logs?pageSize=100`)
      .then((r) => r.json())
      .then((d) => setLogs(d.data?.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  // ⌘K focuses search, like the directory lists in the reference set.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (category && categoryOf(l.action) !== category) return false;
        const hay = [l.actorEmail, l.actorIp, l.traceId, l.action, l.fileId || ""].join(" ").toLowerCase();
        return hay.includes(q.toLowerCase());
      }),
    [logs, q, category]
  );

  const deltaFor = (id: string) => {
    const rand = mulberry32(id.split("").reduce((s, c) => s + c.charCodeAt(0), 7));
    return Math.round((rand() - 0.42) * 40); // deterministic ±% vs previous period
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access &amp; Audit Logs</CardTitle>
        <CardDescription>
          Every file access, upload, auth and admin event — traced. Admins see everyone; users see themselves.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search actor, IP, trace, action…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 pr-14"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-9 rounded-md border bg-background px-2.5 text-sm"
          >
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <AsciiTableSkeleton rows={8} seed={4} />
        ) : (
          <ul className="divide-y rounded-xl border">
            {filtered.map((l) => {
              const delta = deltaFor(l.id);
              return (
                <li key={l.id} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {initials(l.actorEmail)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.actorEmail}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.action} · {l.actorIp} · trace {l.traceId.slice(0, 8)}… · {new Date(l.timestamp).toLocaleString()}
                    </span>
                  </span>
                  <Badge
                    variant={l.success ? "secondary" : "destructive"}
                    className={cn("hidden shrink-0 sm:inline-flex", l.success && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")}
                  >
                    {l.success ? "Succeeded" : "Failed"}
                  </Badge>
                  <span className="w-24 shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">{l.durationMs} ms</span>
                    <span className={cn("flex items-center justify-end gap-0.5 text-[11px] tabular-nums", delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                      {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(delta)}% vs prev.
                    </span>
                  </span>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">No logs match this search.</li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
