"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive, Copy, Download, FileArchive, FileAudio, FileIcon, FileImage, FileText, FileVideo,
  Link2, Pencil, Search, Share2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBytes, formatDate } from "@/lib/utils";
import { AsciiTableSkeleton } from "@/components/ui/ascii";
import { RLMenu, useRLMenu, type RLMenuSection } from "@/components/dashboard/rl-menu";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string; originalName: string; mimeType: string; sizeBytes: number; status: string;
  downloads: number; createdAt: string; url: string;
  cdn?: { package: string; version: string; publicUrl: string } | null;
}

const DEMO_FILES: FileItem[] = [
  { id: "demo-1", originalName: "launch-cut_final_v12.mp4", mimeType: "video/mp4", sizeBytes: 2_576_980_377, status: "active", downloads: 148, createdAt: "2026-10-24T09:12:00Z", url: "#", cdn: { package: "u-demo", version: "1.4.0", publicUrl: "/dl/u-demo/1.4.0/launch-cut_final_v12.mp4" } },
  { id: "demo-2", originalName: "brand-stills-selects.zip", mimeType: "application/zip", sizeBytes: 851_443_712, status: "active", downloads: 63, createdAt: "2026-10-21T14:40:00Z", url: "#", cdn: { package: "u-demo", version: "1.3.2", publicUrl: "/dl/u-demo/1.3.2/brand-stills-selects.zip" } },
  { id: "demo-3", originalName: "Series-A-deck_v9.pdf", mimeType: "application/pdf", sizeBytes: 18_874_368, status: "active", downloads: 512, createdAt: "2026-10-18T08:03:00Z", url: "#", cdn: { package: "u-demo", version: "9.0.0", publicUrl: "/dl/u-demo/9.0.0/Series-A-deck_v9.pdf" } },
  { id: "demo-4", originalName: "master_ambient-mix.wav", mimeType: "audio/wav", sizeBytes: 94_371_840, status: "active", downloads: 27, createdAt: "2026-10-15T19:22:00Z", url: "#", cdn: { package: "u-demo", version: "2.0.1", publicUrl: "/dl/u-demo/2.0.1/master_ambient-mix.wav" } },
  { id: "demo-5", originalName: "firmware-2.8.1.tar.gz", mimeType: "application/gzip", sizeBytes: 153_092_096, status: "pinned", downloads: 1204, createdAt: "2026-10-11T11:11:00Z", url: "#", cdn: { package: "u-demo", version: "2.8.1", publicUrl: "/dl/u-demo/2.8.1/firmware-2.8.1.tar.gz" } },
  { id: "demo-6", originalName: "hero-still_04.png", mimeType: "image/png", sizeBytes: 8_388_608, status: "active", downloads: 89, createdAt: "2026-10-09T16:54:00Z", url: "#", cdn: { package: "u-demo", version: "1.0.4", publicUrl: "/dl/u-demo/1.0.4/hero-still_04.png" } },
];

function iconFor(mime: string) {
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.includes("zip") || mime.includes("gzip") || mime.includes("tar")) return FileArchive;
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  return FileIcon;
}

const SHARED = [
  { name: "You", role: "Owner", initials: "YO", you: true },
  { name: "Maya Chen", role: "Can edit", initials: "MC" },
  { name: "Devon Achebe", role: "Can edit", initials: "DA" },
  { name: "Lena Ortiz", role: "Can view", initials: "LO" },
];

export function FilesList() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const menu = useRLMenu();
  const [menuFile, setMenuFile] = useState<FileItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Failed to load files"); setFiles(DEMO_FILES); }
      else setFiles(data.data.data.length > 0 ? data.data.data : DEMO_FILES);
    } catch {
      setFiles(DEMO_FILES);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id); }, [load]);

  const selected = useMemo(
    () => files.find((f) => f.id === selectedId) ?? files[0],
    [files, selectedId]
  );

  const del = async (f: FileItem) => {
    if (f.id.startsWith("demo-")) { setFiles((prev) => prev.filter((x) => x.id !== f.id)); return; }
    if (confirm("Delete this file from the CDN?")) { await fetch(`/api/files/${f.id}`, { method: "DELETE" }); load(); }
  };
  const copy = (f: FileItem) => {
    navigator.clipboard?.writeText(f.cdn?.publicUrl || f.url).catch(() => {});
    setCopied(f.id); setTimeout(() => setCopied(""), 1500);
  };
  const toggleCheck = (id: string) =>
    setChecked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const menuSections = (f: FileItem): RLMenuSection[] => [
    {
      label: "File actions",
      items: [
        { label: "Rename", shortcut: "⌘R", icon: Pencil, onSelect: () => setSelectedId(f.id) },
        { label: "Duplicate", shortcut: "⌘D", icon: Copy, onSelect: () => copy(f) },
        {
          label: "Export as", icon: Share2, submenu: [
            { label: "Original (bit-for-bit)", onSelect: () => copy(f) },
            { label: "Pinned version URL", onSelect: () => copy(f) },
            { label: "Latest version URL", onSelect: () => copy(f) },
            { label: "QR code", onSelect: () => copy(f) },
          ],
        },
        { label: "Copy link", shortcut: "⌘C", icon: Link2, onSelect: () => copy(f) },
        { label: "Download", icon: Download, onSelect: () => window.open(f.cdn?.publicUrl || f.url, "_blank") },
      ],
    },
    {
      items: [
        { label: "Move to archive", icon: Archive, onSelect: () => setSelectedId(f.id) },
        { label: "Delete", icon: Trash2, danger: true, onSelect: () => del(f) },
      ],
    },
  ];

  const SelectedIcon = selected ? iconFor(selected.mimeType) : FileIcon;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>My Files</CardTitle>
          <CardDescription>
            Select a file for details. Right-click any row for actions.
            {files === DEMO_FILES && " Showing a sample workspace — upload to replace it with your files."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {checked.size > 0 && <Badge variant="secondary">{checked.size} selected</Badge>}
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">right-click = actions</kbd>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <AsciiTableSkeleton rows={7} seed={3} />
          ) : (
            <ul className="divide-y rounded-xl border" role="listbox" aria-label="Files">
              {files.map((f) => {
                const Icon = iconFor(f.mimeType);
                const isSel = selected?.id === f.id;
                return (
                  <li
                    key={f.id}
                    role="option"
                    aria-selected={isSel}
                    onClick={() => setSelectedId(f.id)}
                    onContextMenu={(e) => { setMenuFile(f); setSelectedId(f.id); menu.open(e); }}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors",
                      isSel ? "bg-accent/70" : "hover:bg-accent/40"
                    )}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={checked.has(f.id)} onCheckedChange={() => toggleCheck(f.id)} aria-label={`Select ${f.originalName}`} />
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.originalName}</span>
                      <span className="block text-xs text-muted-foreground">{f.mimeType}</span>
                    </span>
                    <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">v{f.cdn?.version ?? "—"}</span>
                    <span className="w-20 text-right text-sm tabular-nums">{formatBytes(f.sizeBytes)}</span>
                    <Badge variant="secondary" className="hidden md:inline-flex">{f.status}</Badge>
                  </li>
                );
              })}
              {files.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">No files found.</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selected && (
        <Card className="h-fit xl:sticky xl:top-20">
          <CardContent className="space-y-5 pt-6">
            <div data-ascii="surface" className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40">
              <SelectedIcon className="h-10 w-10 text-muted-foreground" />
              <span className="max-w-[80%] truncate text-xs text-muted-foreground">{selected.originalName}</span>
              <Badge variant="outline" className="font-mono text-[10px]">{selected.mimeType}</Badge>
            </div>
            <div>
              <p className="truncate font-semibold">{selected.originalName}</p>
              <p className="text-xs text-muted-foreground">
                v{selected.cdn?.version ?? "—"} · {formatBytes(selected.sizeBytes)} · {selected.downloads} downloads
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => window.open(selected.cdn?.publicUrl || selected.url, "_blank")}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button variant="outline" onClick={() => copy(selected)}>
                {copied === selected.id ? "Copied!" : "Copy URL"}
              </Button>
              {!selected.id.startsWith("demo-") && (
                <Button variant="outline" render={<Link href={`/dashboard/files/${selected.id}`} />}>Rules</Button>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
              <dl className="divide-y rounded-xl border text-sm">
                {[
                  ["Type", selected.mimeType],
                  ["Size", formatBytes(selected.sizeBytes)],
                  ["Dimensions", selected.mimeType.startsWith("image/") ? "3840 × 2160" : selected.mimeType.startsWith("video/") ? "3840 × 2160 · 24 fps" : "—"],
                  ["Owner", "You"],
                  ["Modified", formatDate(selected.createdAt)],
                  ["Location", selected.cdn ? `/dl/${selected.cdn.package}/${selected.cdn.version}/${selected.originalName}` : selected.url],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <dt className="shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-medium" title={v}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared with</h3>
              <ul className="divide-y rounded-xl border">
                {SHARED.map((p) => (
                  <li key={p.name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{p.initials}</span>
                    <span className="flex-1 font-medium">{p.name}{p.you ? " (you)" : ""}</span>
                    <Badge variant={p.role === "Owner" ? "default" : "secondary"} className="text-[10px]">{p.role}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {menuFile && <RLMenu sections={menuSections(menuFile)} position={menu.position} onClose={menu.close} />}
    </div>
  );
}
