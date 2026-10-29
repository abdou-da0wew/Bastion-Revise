"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

interface LogItem { id: string; traceId: string; action: string; actorEmail: string; actorIp: string; timestamp: string; success: boolean; fileId?: string; durationMs: number }
export function LogsClient() {
  const [logs, setLogs] = useState<LogItem[]>([]); const [q, setQ] = useState(""); const [action, setAction] = useState("");
  useEffect(() => {
    fetch(`/api/logs?pageSize=100${action ? `&action=${encodeURIComponent(action)}` : ""}`).then((r) => r.json()).then((d) => setLogs(d.data?.logs ?? []));
  }, [action]);
  const filtered = logs.filter((l) => [l.actorEmail, l.actorIp, l.traceId, l.fileId || ""].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <Card><CardHeader><CardTitle>Access &amp; Audit Logs</CardTitle><CardDescription>File accesses through dashboard URLs, uploads, admin actions and auth events. Admins see everyone; users see themselves.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2"><Input placeholder="Search actor, IP, trace, file…" value={q} onChange={(e) => setQ(e.target.value)} /><Input placeholder="Action filter (e.g. file.access)" value={action} onChange={(e) => setAction(e.target.value)} /></div>
        <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>IP</TableHead><TableHead>Trace</TableHead><TableHead>ms</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((l) => (<TableRow key={l.id}><TableCell>{formatDate(l.timestamp)}</TableCell><TableCell className="font-mono text-xs">{l.action}</TableCell><TableCell>{l.actorEmail}</TableCell><TableCell>{l.actorIp}</TableCell><TableCell className="font-mono text-xs">{l.traceId.slice(0, 8)}…</TableCell><TableCell>{l.durationMs}</TableCell><TableCell><Badge variant={l.success ? "secondary" : "destructive"}>{l.success ? "ok" : "fail"}</Badge></TableCell></TableRow>))}</TableBody></Table>
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No logs match.</p>}
      </CardContent></Card>
  );
}
