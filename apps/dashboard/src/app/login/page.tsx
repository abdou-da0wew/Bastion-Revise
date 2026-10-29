"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlyphOrb } from "@/components/reactbits/glyph-orb";
import { RisingInk } from "@/components/reactbits/rising-ink";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 2.9c.9-2.9 3.6-5 6.8-5z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthNote, setOauthNote] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setError(data?.error?.message || "Login failed");
    router.push("/dashboard"); router.refresh();
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute inset-0 opacity-45 dark:opacity-60" aria-hidden="true">
          <GlyphOrb glyphSize={9} spacing={0.75} centerY={0.46} tilt={-84} bands={17} turbulence={1.25} lightAngle={48} lightHeight={0.61} rim={1.4500000000000002} atmosphere={2} contrast={0.29} glow={0.22} intensity={2.3000000000000003} momentum={0.48} stormStrength={3} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_82%)]" />
        </div>
        <Link href="/" className="relative flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Shield className="h-4 w-4" /></span>
          <span className="text-lg font-semibold tracking-tight">Bastion</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            <RisingInk text="Send anything to anyone, keep it forever." />
          </h1>
          <p className="mt-4 text-muted-foreground">
            Fortified file delivery with per-file access rules and a complete audit trail — welcome back behind the walls.
          </p>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational · 99.98% uptime
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to manage your CDN files, URLs and access rules.</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setOauthNote("Google sign-in activates once OAuth credentials are configured for this deployment.")}
            >
              <GoogleMark /> Google
            </Button>
            <Button
              variant="outline"
              onClick={() => setOauthNote("GitHub sign-in activates once OAuth credentials are configured for this deployment.")}
            >
              <Code2 className="h-4 w-4" /> GitHub
            </Button>
          </div>
          {oauthNote && <p className="mt-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">{oauthNote}</p>}

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="maya@studio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" size="lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            No account? <Link className="font-medium text-foreground underline" href="/register">Create one</Link> — the first account becomes superadmin.
          </p>
        </div>
      </section>
    </main>
  );
}
