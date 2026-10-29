"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Radar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlyphOrb } from "@/components/reactbits/glyph-orb";

export default function NotFound() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
      <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-45" aria-hidden="true">
        <GlyphOrb glyphSize={9} spacing={0.75} centerY={0.46} tilt={-84} bands={17} turbulence={1.25} lightAngle={48} lightHeight={0.61} rim={1.4500000000000002} atmosphere={2} contrast={0.29} glow={0.22} intensity={2.3000000000000003} momentum={0.48} stormStrength={3} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_82%)]" />
      </div>

      {/* Radar sweep */}
      <div className="relative mb-10 h-52 w-52" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-foreground/15" />
        <div className="absolute inset-[18%] rounded-full border border-foreground/15" />
        <div className="absolute inset-[36%] rounded-full border border-foreground/15" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/10" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-foreground/10" />
        <div
          className="absolute inset-0 animate-[spin_5s_linear_infinite] rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgb(16 185 129 / 0.35), transparent 22%)" }}
        />
        <span className="absolute left-[30%] top-[38%] h-2 w-2 animate-ping rounded-full bg-emerald-500" />
        <span className="absolute left-[30%] top-[38%] h-2 w-2 rounded-full bg-emerald-500" />
        <span className="absolute left-[68%] top-[62%] h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-lg">
          <Radar className="h-5 w-5" />
        </span>
      </div>

      <p className="font-mono text-sm text-muted-foreground">404 · signal lost</p>
      <h1 className="mt-3 text-center text-4xl font-bold tracking-tight sm:text-5xl">Nothing on this frequency.</h1>
      <p className="mt-4 max-w-md text-center text-muted-foreground">
        The page you&apos;re scanning for isn&apos;t in the archive. Search the library or head back behind the walls.
      </p>

      <form
        className="mt-8 flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/dashboard/files?search=${encodeURIComponent(q.trim())}` : "/dashboard/files");
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="pl-9" aria-label="Search files" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" render={<Link href="/" />}>Go home</Button>
        <Button render={<Link href="/dashboard" />}>
          Open dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}
