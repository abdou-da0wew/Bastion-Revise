"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBytes, formatDate } from "@/lib/utils";

interface Me { name: string; email: string; role: string; apiKey: string; active: boolean; expiresAt: string | null; lastLoginAt: string | null; cdnPackage: string; quota: { maxFiles: number; maxStorageBytes: number; maxRequestsPerDay: number }; createdAt: string }
export function SettingsClient() {
  const [me, setMe] = useState<Me | null>(null); const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [copied, setCopied] = useState(false);
  const load = () => fetch("/api/auth/me").then((r) => r.json()).then((d) => { setMe(d.data.user); setName(d.data.user.name); });
  useEffect(() => { load(); }, []);
  const patch = async (body: Record<string, unknown>, ok: string) => {
    const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setMsg(res.ok ? ok : data.error?.message || "Failed"); if (res.ok) load();
  };
  if (!me) return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground mt-1">Profile, API key, quota and account lifetime.</p></div>
      {msg && <p className="text-sm">{msg}</p>}
      <Card><CardHeader><CardTitle>Profile</CardTitle><CardDescription>{me.email} · role <b>{me.role}</b> · member since {formatDate(me.createdAt)}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button onClick={() => patch({ name }, "Profile saved")}>Save profile</Button>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-muted-foreground">Account status</p><p className="font-medium">{me.active ? "Active" : "Suspended"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-muted-foreground">Account lifetime</p><p className="font-medium">{me.expiresAt ? `Expires ${formatDate(me.expiresAt)}` : "Never expires"}</p></div>
            <div className="rounded-lg border p-3"><p className="text-muted-foreground">Last login</p><p className="font-medium">{me.lastLoginAt ? formatDate(me.lastLoginAt) : "—"}</p></div>
          </div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Quota (set by admins)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">Max files</p><p className="font-medium">{me.quota.maxFiles}</p></div>
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">Storage</p><p className="font-medium">{formatBytes(me.quota.maxStorageBytes)}</p></div>
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">Requests/day</p><p className="font-medium">{me.quota.maxRequestsPerDay}</p></div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>API key &amp; CDN namespace</CardTitle><CardDescription>Use the key for dashboard API calls. Your registry namespace is <code>{me.cdnPackage}</code> — files live at <code>/dl/{me.cdnPackage}/&lt;version&gt;/&lt;file&gt;</code> on the CDN core.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2"><Input readOnly value={me.apiKey} className="font-mono text-xs" /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(me.apiKey); setCopied(true); }}>{copied ? "Copied" : "Copy"}</Button></div>
          <Button variant="destructive" onClick={() => confirm("Regenerate API key? The old key stops working immediately.") && patch({ regenerateApiKey: true }, "API key regenerated")}>Regenerate API key</Button>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); patch({ currentPassword: fd.get("current"), newPassword: fd.get("next") }, "Password changed"); }}>
          <div className="space-y-2"><Label>Current password</Label><Input name="current" type="password" required /></div>
          <div className="space-y-2"><Label>New password (8+ chars)</Label><Input name="next" type="password" minLength={8} required /></div>
          <Button type="submit">Change password</Button></form></CardContent></Card>
    </div>
  );
}
