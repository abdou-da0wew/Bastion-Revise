"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileItem { id: string; originalName: string; sizeBytes: number; status: string; downloads: number; createdAt: string; url: string; cdn?: { publicUrl: string } | null }
interface LogItem { id: string; action: string; actorEmail: string; timestamp: string; success: boolean }

export default function OverviewPage() {
  const [files, setFiles] = useState<FileItem[]>([]); const [logs, setLogs] = useState<LogItem[]>([]); const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/api/files?pageSize=5").then((r) => r.json()),
      fetch("/api/logs?pageSize=5").then((r) => r.json()),
      fetch("/api/files?pageSize=100").then((r) => r.json()),
    ]).then(([recent, logsRes, all]) => {
      if (!recent.success) throw new Error(recent.error?.message || "Failed to load");
      setFiles(recent.data.data); setLogs(logsRes.data?.logs ?? []);
      sessionStorage.setItem("bastion-totals", JSON.stringify({
        totalFiles: all.data.total, totalStorage: (all.data.data as FileItem[]).reduce((s, f) => s + f.sizeBytes, 0),
        totalDownloads: (all.data.data as FileItem[]).reduce((s, f) => s + f.downloads, 0),
      }));
    }).catch((e) => setError(e.message));
  }, []);
  const totals = (() => { try { return JSON.parse(sessionStorage.getItem("bastion-totals") || "{}"); } catch { return {}; } })();
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Overview</h1><p className="text-sm text-muted-foreground mt-1">Your Bastion CDN at a glance — served by the Bastion CDN core.</p></div>
        <Button render={<Link href="/dashboard/upload" />}><Upload className="mr-2 h-4 w-4" />Upload</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <StatsCards data={{ totalFiles: totals.totalFiles ?? files.length, totalStorage: totals.totalStorage ?? 0, totalDownloads: totals.totalDownloads ?? 0, activeRules: files.filter((f) => f.status === "active").length }} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Recent files</CardTitle><CardDescription>Pinned &amp; latest URLs live on the CDN core.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <Link className="underline truncate" href={`/dashboard/files/${f.id}`}>{f.originalName}</Link>
              <span className="text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
              <Badge variant="secondary">{f.status}</Badge>
            </div>))}{files.length === 0 && <p className="text-sm text-muted-foreground">No files yet — upload your first one.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Access &amp; audit events (see Audit Logs for filters).</CardDescription></CardHeader>
          <CardContent className="space-y-3">{logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-mono text-xs">{l.action}</span><span className="text-muted-foreground truncate">{l.actorEmail}</span>
              <span className="text-muted-foreground">{formatDate(l.timestamp)}</span>
              <Badge variant={l.success ? "secondary" : "destructive"}>{l.success ? "ok" : "fail"}</Badge>
            </div>))}{logs.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}</CardContent></Card>
      </div>
    </div>
  );
}
