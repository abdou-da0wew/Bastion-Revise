"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes, formatDate } from "@/lib/utils";

interface FileItem { id: string; originalName: string; mimeType: string; sizeBytes: number; status: string; downloads: number; createdAt: string; url: string; cdn?: { package: string; version: string; publicUrl: string } | null }

export function FilesList() {
  const [files, setFiles] = useState<FileItem[]>([]); const [search, setSearch] = useState(""); const [error, setError] = useState(""); const [copied, setCopied] = useState("");
  const load = useCallback(async () => {
    const res = await fetch(`/api/files?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ""}`); const data = await res.json();
    if (!res.ok) return setError(data.error?.message || "Failed to load files");
    setFiles(data.data.data);
  }, [search]);
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); }, [load]);
  const del = async (id: string) => { if (confirm("Delete this file from the CDN?")) { await fetch(`/api/files/${id}`, { method: "DELETE" }); load(); } };
  const copy = (f: FileItem) => { navigator.clipboard.writeText(f.cdn?.publicUrl || f.url); setCopied(f.id); setTimeout(() => setCopied(""), 1500); };
  return (
    <Card><CardHeader><CardTitle>My Files</CardTitle><CardDescription>Bytes live on the Bastion CDN core; copy the direct CDN URL or open details for access rules.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Version</TableHead><TableHead>Size</TableHead><TableHead>Downloads</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{files.map((f) => (
            <TableRow key={f.id}>
              <TableCell><Link className="underline" href={`/dashboard/files/${f.id}`}>{f.originalName}</Link><div className="text-xs text-muted-foreground">{f.mimeType}</div></TableCell>
              <TableCell>{f.cdn?.version ?? "—"}</TableCell><TableCell>{formatBytes(f.sizeBytes)}</TableCell><TableCell>{f.downloads}</TableCell>
              <TableCell><Badge variant="secondary">{f.status}</Badge></TableCell><TableCell>{formatDate(f.createdAt)}</TableCell>
              <TableCell className="space-x-2 whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => copy(f)}>{copied === f.id ? "Copied" : "Copy URL"}</Button><Button size="sm" variant="destructive" onClick={() => del(f.id)}>Delete</Button></TableCell>
            </TableRow>))}</TableBody></Table>
        {files.length === 0 && <p className="text-sm text-muted-foreground">No files found.</p>}
      </CardContent></Card>
  );
}
