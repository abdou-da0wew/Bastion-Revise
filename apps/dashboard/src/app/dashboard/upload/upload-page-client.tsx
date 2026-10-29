"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadZone } from "@/components/dashboard/upload-zone";

export function UploadPageClient() {
  const [version, setVersion] = useState("1.0.0");
  const upload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file); fd.set("version", version || "1.0.0");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-semibold tracking-tight">Upload</h1><p className="text-sm text-muted-foreground mt-1">Files are published to the Bastion CDN core under your namespace with the version below. Executables, scripts and archives are welcome; secrets are not.</p></div>
      <Card><CardHeader><CardTitle>Upload files</CardTitle><CardDescription>Drag &amp; drop or browse. Per-file access rules can be tuned afterwards on the file detail page.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2"><Label htmlFor="version">Version</Label><Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" /><p className="text-xs text-muted-foreground">Pinned URLs are immutable &amp; cached for a year; <code>latest</code> always floats to your newest publish.</p></div>
          <UploadZone onUpload={upload} />
        </CardContent></Card>
    </div>
  );
}
