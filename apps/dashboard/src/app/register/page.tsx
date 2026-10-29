"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") }) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setError(data?.error?.message || "Registration failed");
    router.push("/dashboard"); router.refresh();
  };
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle className="text-2xl">Create your Bastion account</CardTitle><CardDescription>Upload files, get CDN URLs, and control access. First account on a fresh install becomes superadmin.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
            <div className="space-y-2"><Label htmlFor="password">Password (8+ chars)</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">Already registered? <Link className="underline" href="/login">Sign in</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
