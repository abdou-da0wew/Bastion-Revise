"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Box, Braces, Check, ChevronDown, Code2, FileAudio, FileImage,
  FileText, FileVideo, Film, Globe2, KeyRound, Landmark, Layers, Lock, Music, Package, Palette,
  ScrollText, Search, ShieldCheck, Sparkles, Table2, Type, Users, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { Decode } from "@/components/ui/ascii";
import { GlyphOrb } from "@/components/reactbits/glyph-orb";
import { RisingInk } from "@/components/reactbits/rising-ink";

/* ───────────────────────── Library intro ───────────────────────── */

export function Library() {
  return (
    <section id="library" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="A library that remembers every transfer" />
          </h2>
          <p className="mt-4 text-muted-foreground">
            Nothing disappears into a chat thread again. Every file you have ever sent or
            received stays searchable — by name, by person, by what&apos;s inside it.
          </p>
        </Reveal>

        <Decode preset="decode">
          <Reveal delay={0.1}>
            <div className="mx-auto mt-14 grid max-w-4xl gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div data-ascii="surface" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3 text-sm text-muted-foreground">
                  <Search className="h-4 w-4" />
                  “the deck we sent the investors in march”
                  <Badge variant="secondary" className="ml-auto text-[10px]">Natural language</Badge>
                </div>
                <ul className="divide-y">
                  {[
                    { icon: FileText, name: "Series-A-deck_v9.pdf", meta: "Sent to Halcyon Capital · Mar 12 · 48 downloads" },
                    { icon: FileVideo, name: "product-walkthrough.mp4", meta: "Received from Mono Studio · Mar 9 · 1.1 GB" },
                    { icon: FileImage, name: "launch-stills-selects.zip", meta: "Sent to Fieldnotes · Mar 3 · checksum ✓" },
                  ].map((r) => (
                    <li key={r.name} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><r.icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="block text-xs text-muted-foreground">{r.meta}</span>
                      </span>
                      <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </li>
                  ))}
                </ul>
              </div>
              <div data-ascii="surface" className="rounded-2xl border bg-card p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-semibold"><ScrollText className="h-4 w-4" /> Activity receipt</p>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    ["maya@halcyon.vc", "downloaded", "2m ago"],
                    ["link created", "expires in 7d", "1h ago"],
                    ["checksum", "sha-256 verified", "1h ago"],
                    ["storage", "pinned at v9", "Mar 12"],
                  ].map(([a, b, c]) => (
                    <li key={b} className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-muted-foreground">{a}</span>
                      <span className="truncate font-medium">{b}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-5 w-full" render={<Link href="/dashboard/logs" />}>
                  Open the audit log
                </Button>
              </div>
            </div>
          </Reveal>
        </Decode>
      </div>
    </section>
  );
}

/* ───────────────────────── Logo row + social proof ───────────────────────── */

const LOGOS = ["Northwind", "Halcyon", "Mono Studio", "Fieldnotes", "Arcline", "Bloom & Co"];

export function Logos() {
  return (
    <section className="border-y py-14">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by teams who ship heavy files
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {LOGOS.map((name, i) => (
              <span
                key={name}
                className="text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
                style={{ fontStyle: i % 3 === 1 ? "italic" : "normal", letterSpacing: i % 3 === 2 ? "0.12em" : undefined }}
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <figure className="mx-auto mt-16 max-w-3xl text-center">
            <blockquote className="text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
              “We stopped thinking about file transfer entirely. Bastion is where work
              leaves our hands — and we can prove exactly where it went.”
            </blockquote>
            <figcaption className="mt-5 text-sm text-muted-foreground">
              Lena Ortiz — Head of Production, Mono Studio
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Capability cards + format grid ───────────────────────── */

const FORMATS = ["MP4", "MOV", "ProRes", "RAW", "DNG", "PSD", "AI", "INDD", "PDF", "ZIP", "WAV", "MP3", "FBX", "OBJ", "TTF", "SVG", "PNG", "TIFF", "KEY", "XLSX", "JSON", "ISO", "FCPX", "GLB"];

export function Capabilities() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const onMove = (e: React.PointerEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cells = Array.from(grid.children) as HTMLElement[];
    let best: number | null = null;
    let bestD = Infinity;
    cells.forEach((cell, i) => {
      const r = cell.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < bestD) { bestD = d; best = i; }
    });
    setActive(best);
  };

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="Built for files other tools refuse" />
          </h2>
          <p className="mt-4 text-muted-foreground">
            No silent compression, no “file too large”, no expiring into the void.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Package, title: "Send up to 500 MB in one link", desc: "Whole project folders, disk images, raw footage. One upload, one durable /dl/ URL — pinned to a version or always-latest." },
            { icon: Users, title: "Collect files from anyone", desc: "Share an upload link and guests drop files straight into your namespace. No account, no install, no 25 MB ceiling." },
            { icon: KeyRound, title: "Deliver on your own terms", desc: "Passwords, expiry windows, download caps and per-file access rules — enforced before a single byte moves." },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <Card data-ascii="surface" className="h-full transition-transform duration-300 hover:-translate-y-1">
                <CardHeader>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><c.icon className="h-5 w-5" /></span>
                  <CardTitle className="pt-2">{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div id="formats" className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">Every format. Untouched.</h3>
              <p className="text-sm text-muted-foreground">Bastion never converts or compresses — the checksum they receive matches the checksum you sent.</p>
            </div>
            <div
              ref={gridRef}
              onPointerMove={onMove}
              onPointerLeave={() => setActive(null)}
              className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
            >
              {FORMATS.map((f, i) => (
                <div
                  key={f}
                  className={cn(
                    "flex items-center justify-center rounded-lg border py-3.5 font-mono text-sm transition-all duration-200",
                    active === i
                      ? "scale-110 border-primary bg-primary text-primary-foreground shadow-lg"
                      : active !== null && Math.abs(active - i) <= 1
                        ? "bg-accent"
                        : "bg-card"
                  )}
                >
                  {f}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Manifesto (scroll-driven) ───────────────────────── */

const MANIFESTO = "Files are how work leaves your hands. A cut, a build, a contract, a life's research — they deserve better than an expiring link and a shrug. Bastion keeps every byte intact, every access accounted for, and every version exactly where you left it. Forever is a feature. We built it.";

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [6, 0]);
  return (
    <motion.span style={{ opacity, y }} className="inline-block">
      {children}&nbsp;
    </motion.span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = MANIFESTO.split(" ");
  return (
    <section className="border-y bg-muted/40 py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-4xl px-6">
        <p className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">The Bastion manifesto</p>
        {reduce ? (
          <p className="text-2xl font-medium leading-snug tracking-tight sm:text-4xl">{MANIFESTO}</p>
        ) : (
          <p className="text-2xl font-medium leading-snug tracking-tight sm:text-4xl" aria-label={MANIFESTO}>
            {words.map((word, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, Math.min(1, (i + 2) / words.length)]}>
                {word}
              </Word>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Security ───────────────────────── */

export function Security() {
  return (
    <section id="security" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="Private by architecture, not by promise" />
          </h2>
          <p className="mt-4 text-muted-foreground">Security you can point at, audit, and revoke — per file.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, title: "Encryption everywhere", desc: "AES-256 at rest, TLS 1.3 in transit, SHA-256 integrity ETags on every object." },
            { icon: KeyRound, title: "Per-link controls", desc: "Passwords, expiry, download caps, IP allowlists and scoped service tokens." },
            { icon: ScrollText, title: "Access logs", desc: "Every request traced with actor, IP and duration. Nothing moves anonymously." },
            { icon: Globe2, title: "Data residency", desc: "Self-host the CDN core anywhere; bytes never leave infrastructure you control." },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <Card data-ascii="surface" className="h-full">
                <CardHeader>
                  <c.icon className="h-5 w-5" />
                  <CardTitle className="pt-1 text-base">{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["SOC 2 Type II", "GDPR ready", "ISO 27001", "HIPAA aligned", "3-tier admin roles", "Scoped API tokens"].map((b) => (
              <Badge key={b} variant="outline" className="gap-1.5 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5" />{b}</Badge>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Benchmarks ───────────────────────── */

const BENCHMARKS = {
  "Time to share 4 GB": [
    { name: "Bastion", value: 38, display: "38 s", best: true },
    { name: "Legacy FTP", value: 246, display: "4 m 06 s" },
    { name: "Email attachment", value: -1, display: "Rejected — too large" },
    { name: "Generic cloud drive", value: 132, display: "2 m 12 s" },
  ],
  "Download success rate": [
    { name: "Bastion", value: 99.98, display: "99.98%", best: true },
    { name: "Legacy FTP", value: 91.4, display: "91.4%" },
    { name: "Email attachment", value: 88.2, display: "88.2%" },
    { name: "Generic cloud drive", value: 97.1, display: "97.1%" },
  ],
  "Cold-start latency (TTFB)": [
    { name: "Bastion", value: 41, display: "41 ms", best: true },
    { name: "Legacy FTP", value: 890, display: "890 ms" },
    { name: "Email attachment", value: 2400, display: "2.4 s" },
    { name: "Generic cloud drive", value: 310, display: "310 ms" },
  ],
} as const;

export function Benchmarks() {
  const keys = Object.keys(BENCHMARKS) as Array<keyof typeof BENCHMARKS>;
  const [metric, setMetric] = useState<keyof typeof BENCHMARKS>(keys[0]);
  const rows = BENCHMARKS[metric];
  const max = Math.max(...rows.map((r) => Math.max(0, r.value)));
  return (
    <section id="benchmarks" className="border-y bg-muted/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="The fastest way from your disk to theirs" />
          </h2>
          <p className="mt-4 text-muted-foreground">Range streaming, pinned versions and edge caching — pick a metric and watch the gap.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Benchmark metric">
            {keys.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={metric === k}
                onClick={() => setMetric(k)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  metric === k ? "text-primary-foreground" : "border bg-card hover:bg-accent"
                )}
              >
                {metric === k && <motion.span layoutId="bench-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative">{k}</span>
              </button>
            ))}
          </div>
          <div className="mt-8 space-y-4">
            {rows.map((row) => (
              <div key={row.name} className="grid grid-cols-[150px_1fr_130px] items-center gap-3 sm:gap-4">
                <span className="truncate text-sm font-medium">{row.name}</span>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  {row.value < 0 ? (
                    <div className="flex h-full items-center pl-2 text-[10px] font-medium text-destructive">✕ blocked</div>
                  ) : (
                    <motion.div
                      className={cn("h-full rounded-full", "best" in row && row.best ? "bg-primary" : "bg-muted-foreground/40")}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.max(3, (row.value / max) * 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </div>
                <span className={cn("text-right text-sm tabular-nums", "best" in row && row.best ? "font-bold" : "text-muted-foreground")}>{row.display}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Illustrative benchmark topology: 4 GB ProRes file, 1 Gbps access link, median of 30 runs. Your mileage — and your checksums — may vary.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Team workspaces ───────────────────────── */

const TEAM_TABS = [
  { id: "share", icon: Users, title: "Shared workspaces", desc: "Invite the whole production team into one library. Guests get upload-only links; members get the full archive.", points: ["Unlimited guest upload links", "Folder-level permissions", "One search across every transfer"] },
  { id: "roles", icon: KeyRound, title: "Three tiers of control", desc: "Moderators keep the peace, admins run the workspace, superadmins hold the keys. Nobody can touch an account at or above their own level — enforced by the API, not the UI.", points: ["Moderator < Admin < Superadmin", "Quotas & account expiry per user", "Every change written to the audit log"] },
  { id: "brand", icon: Palette, title: "Your name on the door", desc: "Download pages carry your brand, your domain and your rules — recipients never wonder whose link they just clicked.", points: ["Custom download pages", "Your domain via tunnel or DNS", "Password & expiry on every link"] },
] as const;

export function Teams() {
  const [tab, setTab] = useState<(typeof TEAM_TABS)[number]["id"]>("share");
  const active = TEAM_TABS.find((t) => t.id === tab)!;
  return (
    <section id="teams" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="Made for the whole team" />
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2" role="tablist" aria-label="Team features">
            {TEAM_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("relative rounded-full px-4 py-2 text-sm font-medium transition-colors", tab === t.id ? "text-primary-foreground" : "border bg-card hover:bg-accent")}
              >
                {tab === t.id && <motion.span layoutId="team-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative flex items-center gap-1.5"><t.icon className="h-3.5 w-3.5" />{t.title}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-8 grid max-w-4xl gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-2"
            >
              <div>
                <h3 className="text-xl font-semibold">{active.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.desc}</p>
              </div>
              <ul className="space-y-2.5">
                {active.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Customer stories carousel ───────────────────────── */

const STORIES = [
  { quote: "Final cuts used to ride hard drives across the city. Now the link is in the client's inbox before the render farm has cooled down — and we can see the second they watch it.", name: "Lena Ortiz", role: "Head of Production, Mono Studio", stat: "4 GB in 38 s" },
  { quote: "Firmware releases went from a prayer over FTP to a pinned /dl/ URL with a checksum. Support tickets about corrupted updates dropped to zero.", name: "Devon Achebe", role: "Release Lead, Arcline Devices", stat: "0 corrupted releases" },
  { quote: "Clients upload selects through a guest link, we deliver retouched finals through the same library. Nothing lives in email anymore.", name: "Mara Lindqvist", role: "Founder, Fieldnotes Studio", stat: "2,300+ transfers kept" },
  { quote: "The audit log ended every argument. Who downloaded what, when, from where — it's all right there, traced.", name: "Sofia Bennett", role: "Operations, Halcyon Capital", stat: "100% accesses traced" },
];

export function Stories() {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0]);
  const go = (d: number) => setIndex(([i]) => [(i + d + STORIES.length) % STORIES.length, d]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const story = STORIES[index];
  return (
    <section className="border-y bg-muted/40 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Customer stories</p>
        </Reveal>
        <div className="relative mt-10 min-h-[240px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.figure
              key={index}
              initial={{ opacity: 0, x: dir >= 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir >= 0 ? -60 : 60 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <blockquote className="text-2xl font-medium leading-snug tracking-tight sm:text-3xl">“{story.quote}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold">{story.name}</span>
                <span className="text-muted-foreground"> · {story.role}</span>
              </figcaption>
              <Badge variant="secondary" className="mt-4">{story.stat}</Badge>
            </motion.figure>
          </AnimatePresence>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous story"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex gap-1.5">
            {STORIES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex([i, i > index ? 1 : -1])}
                aria-label={`Story ${i + 1}`}
                className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-7 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground")}
              />
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next story"><ArrowRight className="h-4 w-4" /></Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Use ← → keys to browse</p>
      </div>
    </section>
  );
}

/* ───────────────────────── How it works stepper ───────────────────────── */

const STEPS = [
  { icon: Package, title: "Drop it in", desc: "Drag anything into Bastion — or let guests upload through your link. Files land in your CDN namespace with a SHA-256 fingerprint.", glyph: "01" },
  { icon: KeyRound, title: "Set the terms", desc: "Password, expiry, download caps, version pinning. Rules are checked before the first byte moves, on every single request.", glyph: "02" },
  { icon: Zap, title: "Share one link", desc: "A durable /dl/ URL streams from the edge with Range support — recipients resume multi-gigabyte downloads instead of restarting them.", glyph: "03" },
  { icon: ScrollText, title: "Watch it land", desc: "Every access hits your audit log with actor, IP and trace ID. Forever storage means the receipt never expires either.", glyph: "04" },
];

export function HowItWorks() {
  const [step, setStep] = useState(0);
  const active = STEPS[step];
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl"><RisingInk text="How Bastion works" /></h2>
        </Reveal>
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  onClick={() => setStep(i)}
                  aria-current={step === i}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300",
                    step === i ? "border-primary bg-card shadow-md" : "border-transparent hover:bg-accent"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs", step === i ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {s.glyph}
                  </span>
                  <span>
                    <span className="block font-medium">{s.title}</span>
                    <span className="block text-sm text-muted-foreground">{s.desc}</span>
                  </span>
                  {step === i && <motion.span layoutId="step-arrow" className="ml-auto"><ArrowRight className="h-4 w-4" /></motion.span>}
                </button>
              </li>
            ))}
          </ol>
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border bg-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, rotateX: 10, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, rotateX: -8, y: -20, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-full flex-col items-center justify-center p-10 text-center [transform-style:preserve-3d]"
              >
                <span className="font-mono text-7xl font-bold text-muted-foreground/20">{active.glyph}</span>
                <active.icon className="mt-4 h-10 w-10" />
                <h3 className="mt-4 text-xl font-semibold">{active.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{active.desc}</p>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Integrations mosaic ───────────────────────── */

const INTEGRATIONS = [
  { icon: Code2, name: "REST API" }, { icon: Braces, name: "Scoped tokens" }, { icon: Globe2, name: "Custom domain" },
  { icon: Layers, name: "Version pinning" }, { icon: FileVideo, name: "Range streaming" }, { icon: FileAudio, name: "Media delivery" },
  { icon: Music, name: "Audio CDN" }, { icon: Film, name: "Video CDN" }, { icon: Type, name: "Web fonts" },
  { icon: Table2, name: "CSV / data" }, { icon: Box, name: "Binaries" }, { icon: Landmark, name: "Self-hosted" },
];

export function Integrations() {
  return (
    <section className="border-y py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl"><RisingInk text="Plays well with your stack" /></h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              A token-protected upload API, stable registry URLs and plain HTTP semantics.
              If it can make a request, it can publish to Bastion.
            </p>
            <Button className="mt-6" render={<Link href="/register" />}>
              Get an API token <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {INTEGRATIONS.map((it, i) => (
                <motion.div
                  key={it.name}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  whileHover={{ y: -4, rotate: i % 2 ? 1 : -1 }}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center shadow-sm"
                >
                  <it.icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium leading-tight">{it.name}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Post grid (from the blog) ───────────────────────── */

export function Posts() {
  const posts = [
    { tag: "Engineering", title: "Range requests, done right: resuming a 4 GB download on hotel Wi-Fi", mins: "6 min" },
    { tag: "Security", title: "Why we hash tokens, pin versions, and log absolutely everything", mins: "8 min" },
    { tag: "Product", title: "Forever storage is a feature: the case against expiring links", mins: "4 min" },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-bold tracking-tight"><RisingInk text="Notes from the fortress" /></h2>
          <span className="text-sm text-muted-foreground">Field notes on moving big files safely.</span>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <article className="group h-full cursor-pointer rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <Badge variant="secondary">{p.tag}</Badge>
                <h3 className="mt-4 font-semibold leading-snug group-hover:underline">{p.title}</h3>
                <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                  {p.mins} read <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS = [
  { q: "How long do files stay on Bastion?", a: "Forever, until you delete them. Links don't rot after 7 days unless you set an expiry yourself — pinning a version keeps that exact file at that exact URL indefinitely." },
  { q: "What file types can I send?", a: "Anything from ProRes and RAW to firmware binaries, disk images and font files. Bastion never converts or recompresses; blocked items are limited to credential secrets like .env and private keys." },
  { q: "Do recipients need an account?", a: "No. Anyone with the link can download. You decide the terms: passwords, expiry windows, download caps and per-file access rules are enforced before bytes move." },
  { q: "How is this different from a generic cloud drive?", a: "Bastion is a CDN and registry, not a folder sync tool: stable /dl/<package>/<version>/<file> URLs, Range streaming, SHA-256 ETags, scoped API tokens and a complete audit trail of every access." },
  { q: "Can I self-host Bastion?", a: "Yes — the whole stack (CDN core, dashboard, MongoDB) ships as one Docker Compose project. Your bytes never leave infrastructure you control." },
  { q: "Who can administer accounts?", a: "Three role tiers: moderator, admin and superadmin. Nobody can modify, promote or delete an account at or above their own level, and every admin action is audit-logged." },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="border-t py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl"><RisingInk text="Questions, answered" /></h2>
              <p className="mt-4 text-muted-foreground">Something heavier on your mind? Talk to a human.</p>
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Still curious?</CardTitle>
                  <CardDescription>We reply within one business day — usually much faster.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" render={<Link href="/register" />}>Contact the team</Button>
                </CardContent>
              </Card>
            </div>
          </Reveal>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <button
                    onClick={() => setOpen(open === i ? -1 : i)}
                    aria-expanded={open === i}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium"
                  >
                    {f.q}
                    <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Closing CTA ───────────────────────── */

export function Cta() {
  return (
    <section className="relative overflow-hidden border-t py-28">
      <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-60" aria-hidden="true">
        <GlyphOrb
          glyphSize={9} spacing={0.75} centerY={0.46} tilt={-84} bands={17}
          turbulence={1.25} lightAngle={48} lightHeight={0.61} rim={1.4500000000000002}
          atmosphere={2} contrast={0.29} glow={0.22} intensity={2.3000000000000003}
          momentum={0.48} stormStrength={3}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_80%)]" />
      </div>
      <Reveal className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
          <RisingInk text="Send it once. Keep it forever." />
        </h2>
        <p className="mt-4 text-muted-foreground">Your first 500 MB is free, the link never rots, and every download is on the record.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="px-8" render={<Link href="/register" />}>
            Create your Bastion <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="px-8" render={<Link href="/login" />}>Sign in</Button>
        </div>
      </Reveal>
    </section>
  );
}
