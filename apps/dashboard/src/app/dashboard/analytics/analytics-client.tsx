"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes } from "@/lib/utils";

interface Analytics { summary: { totalRequests: number; totalFiles: number; totalDownloads: number; totalStorageBytes: number }; topFiles: { id: string; name: string; downloads: number; sizeBytes: number }[]; typeDistribution: { type: string; count: number; percentage: number }[]; requestsOverTime: { labels: string[]; values: number[] } }
export function AnalyticsClient() {
  const [tf, setTf] = useState("7d"); const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => { fetch(`/api/analytics?timeframe=${tf}`).then((r) => r.json()).then((d) => setData(d.data)); }, [tf]);
  const max = Math.max(1, ...(data?.requestsOverTime.values ?? []));
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Analytics</h1><p className="text-sm text-muted-foreground mt-1">Access-log analytics from dashboard-mediated downloads.</p></div>
        <select className="rounded-md border bg-background px-2 py-1 text-sm" value={tf} onChange={(e) => setTf(e.target.value)}><option value="24h">Last 24h</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></div>
      {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : <>
        <div className="grid gap-4 sm:grid-cols-4">{[["Requests", data.summary.totalRequests], ["Files", data.summary.totalFiles], ["Downloads", data.summary.totalDownloads], ["Storage", formatBytes(data.summary.totalStorageBytes)]].map(([k, v]) => (
          <Card key={k as string}><CardHeader><CardTitle className="text-sm text-muted-foreground">{k}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v}</CardContent></Card>))}</div>
        <Card><CardHeader><CardTitle>Requests over time</CardTitle></CardHeader><CardContent>
          <div className="flex h-40 items-end gap-1">{data.requestsOverTime.values.map((v, i) => (<div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={`${data.requestsOverTime.labels[i]}: ${v}`} />))}</div>
        </CardContent></Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Top files</CardTitle></CardHeader><CardContent><Table><TableBody>{data.topFiles.map((f) => (<TableRow key={f.id}><TableCell>{f.name}</TableCell><TableCell>{f.downloads} downloads</TableCell><TableCell>{formatBytes(f.sizeBytes)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
          <Card><CardHeader><CardTitle>File types</CardTitle><CardDescription>By MIME group.</CardDescription></CardHeader><CardContent><Table><TableBody>{data.typeDistribution.map((t) => (<TableRow key={t.type}><TableCell>{t.type}</TableCell><TableCell>{t.count}</TableCell><TableCell>{t.percentage}%</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        </div></>}
    </div>
  );
}
