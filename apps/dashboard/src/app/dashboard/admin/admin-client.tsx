"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes, formatDate } from "@/lib/utils";

type Role = "user" | "moderator" | "admin" | "superadmin";
const LEVEL: Record<Role, number> = { user: 0, moderator: 1, admin: 2, superadmin: 3 };
interface UserEntry { id: string; email: string; name: string; role: Role; active: boolean; expiresAt: string | null; lastLoginAt: string | null; createdAt: string; quota: { maxFiles: number; maxStorageBytes: number; maxRequestsPerDay: number }; cdnPackage: string }
interface CdnTok { id: string; label: string; prefix: string; scopes: string[]; createdAt: string; revokedAt: string | null }

export function AdminClient() {
  const [users, setUsers] = useState<UserEntry[]>([]); const [me, setMe] = useState<UserEntry | null>(null);
  const [stats, setStats] = useState<{ totalUsers: number; totalFiles: number; totalStorage: number; totalDownloads: number } | null>(null);
  const [cdn, setCdn] = useState<unknown>(null); const [tokens, setTokens] = useState<CdnTok[]>([]);
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState("");
  const myLevel = me ? LEVEL[me.role] : 0;

  const load = useCallback(async () => {
    const [u, s, c, m, t] = await Promise.all([
      fetch("/api/admin/users?pageSize=100").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/cdn/status").then((r) => r.json()).catch(() => null),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/admin/cdn/tokens").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (u.success) setUsers(u.data.data);
    if (s?.success) setStats(s.data.stats);
    setCdn(c?.data ?? null); setMe(m.data?.user ?? null); if (t?.tokens) setTokens(t.tokens);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setMsg(res.ok ? "Saved" : data.error?.message || "Failed"); load();
  };
  const del = async (u: UserEntry) => { if (confirm(`Delete ${u.email} and all their files?`)) { const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" }); const d = await r.json(); setMsg(r.ok ? "Deleted" : d.error?.message); load(); } };
  const createToken = async () => {
    const label = prompt("Token label (e.g. github-ci)"); if (!label) return;
    const scopes = prompt("Scopes (comma list of admin,upload,manage,read)", "upload,read"); if (!scopes) return;
    const res = await fetch("/api/admin/cdn/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean) }) });
    const data = await res.json();
    if (res.ok) prompt("Save this CDN token now — shown once:", data.token); else setMsg(data.error?.message || "Token creation failed");
    load();
  };
  const filtered = users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1><p className="text-sm text-muted-foreground mt-1">Accounts, admin levels, lifetime, quotas — and the Bastion CDN core. You are <b>{me?.role}</b> (level {myLevel}/3).</p></div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Total users", stats?.totalUsers ?? users.length], ["Total files", stats?.totalFiles ?? "—"], ["Storage", formatBytes(stats?.totalStorage ?? 0)], ["Downloads", stats?.totalDownloads ?? "—"]].map(([k, v]) => (
          <Card key={k as string}><CardHeader><CardTitle className="text-sm text-muted-foreground">{k}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{v}</CardContent></Card>))}
      </div>

      <Card><CardHeader><CardTitle>CDN core status</CardTitle><CardDescription>Live from the Bastion CDN service (internal bridge).</CardDescription></CardHeader>
        <CardContent><pre className="overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">{JSON.stringify(cdn, null, 2) || "CDN bridge not configured (set CDN_SERVICE_TOKEN/CDN_ADMIN_TOKEN)."}</pre></CardContent></Card>

      <Card><CardHeader><CardTitle>Users</CardTitle><CardDescription>Hierarchy: user → moderator (L1: view &amp; suspend users) → admin (L2: roles below own, quotas, lifetime, delete users) → superadmin (L3: everything incl. CDN tokens). Nobody can edit an account at/above their own level.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role (level)</TableHead><TableHead>Status / lifetime</TableHead><TableHead>Quota files · storage · req/day</TableHead><TableHead>Last login</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell><div className="font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}<br />ns: {u.cdnPackage}</div></TableCell>
                <TableCell>{myLevel >= 2 && LEVEL[u.role] < myLevel ? (
                  <select className="rounded-md border bg-background px-2 py-1 text-sm" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                    {(["user", "moderator", "admin", "superadmin"] as Role[]).filter((r) => LEVEL[r] < myLevel).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>) : <Badge variant="secondary">{u.role} · L{LEVEL[u.role]}</Badge>}</TableCell>
                <TableCell><div>{u.active ? "active" : "suspended"}</div><div className="text-xs text-muted-foreground">{u.expiresAt ? `expires ${formatDate(u.expiresAt)}` : "no expiry"}</div></TableCell>
                <TableCell className="text-xs">{u.quota.maxFiles} · {formatBytes(u.quota.maxStorageBytes)} · {u.quota.maxRequestsPerDay}</TableCell>
                <TableCell className="text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "never"}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  {LEVEL[u.role] < myLevel && <Button size="sm" variant="outline" onClick={() => patch(u.id, { active: !u.active })}>{u.active ? "Suspend" : "Activate"}</Button>}
                  {myLevel >= 2 && LEVEL[u.role] < myLevel && <>
                    <Button size="sm" variant="outline" onClick={() => { const v = prompt("Account expiry (ISO date) or blank for never:", u.expiresAt ?? ""); if (v !== null) patch(u.id, { expiresAt: v.trim() ? new Date(v).toISOString() : null }); }}>Lifetime</Button>
                    <Button size="sm" variant="outline" onClick={() => { const v = prompt("Quota as maxFiles,maxStorageMB,maxReqPerDay:", `${u.quota.maxFiles},${Math.round(u.quota.maxStorageBytes / 1048576)},${u.quota.maxRequestsPerDay}`); if (v) { const [a, b, c] = v.split(",").map(Number); patch(u.id, { quota: { maxFiles: a, maxStorageBytes: (b || 0) * 1048576, maxRequestsPerDay: c } }); } }}>Quota</Button>
                    <Button size="sm" variant="destructive" onClick={() => del(u)}>Delete</Button></>}
                </TableCell>
              </TableRow>))}</TableBody></Table>
        </CardContent></Card>

      {myLevel >= 3 && (
        <Card><CardHeader><CardTitle>CDN core tokens (superadmin)</CardTitle><CardDescription>Service tokens guarding the CDN infra API. Plaintext is shown once at creation.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={createToken}>Create CDN token</Button>
            <Table><TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Prefix</TableHead><TableHead>Scopes</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{tokens.map((t) => (<TableRow key={t.id}><TableCell>{t.label}</TableCell><TableCell className="font-mono text-xs">{t.prefix}…</TableCell><TableCell>{t.scopes.join(", ")}</TableCell><TableCell>{formatDate(t.createdAt)}</TableCell><TableCell>{t.revokedAt ? "revoked" : "active"}</TableCell><TableCell>{!t.revokedAt && <Button size="sm" variant="destructive" onClick={async () => { await fetch(`/api/admin/cdn/tokens?id=${t.id}`, { method: "DELETE" }); load(); }}>Revoke</Button>}</TableCell></TableRow>))}</TableBody></Table>
          </CardContent></Card>)}
    </div>
  );
}
