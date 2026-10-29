"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, FileArchive, FileImage, FileVideo, Link2, Lock, Search, Timer, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlyphOrb } from "@/components/reactbits/glyph-orb";
import { RisingInk } from "@/components/reactbits/rising-ink";

const FILES = [
  { icon: FileVideo, name: "launch-cut_final_v12.mp4", meta: "2.4 GB · ProRes", progress: 64 },
  { icon: FileImage, name: "brand-stills-selects.zip", meta: "812 MB · 214 photos", progress: 100 },
  { icon: FileArchive, name: "firmware-2.8.1.tar.gz", meta: "146 MB · checksum ✓", progress: 100 },
];

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44">
      {/* Glyph Orb — the main background (exact React Bits Pro configuration) */}
      <div className="absolute inset-0 -z-10 opacity-[0.55] dark:opacity-70" aria-hidden="true">
        <GlyphOrb
          glyphSize={9}
          spacing={0.75}
          centerY={0.46}
          tilt={-84}
          bands={17}
          turbulence={1.25}
          lightAngle={48}
          lightHeight={0.61}
          rim={1.4500000000000002}
          atmosphere={2}
          contrast={0.29}
          glow={0.22}
          intensity={2.3000000000000003}
          momentum={0.48}
          stormStrength={3}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_78%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Fortified CDN · all systems operational
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            <RisingInk text="Send anything to anyone," />
            <br />
            <span className="text-muted-foreground">
              <RisingInk text="keep it forever." />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Bastion is the fortified way to move files: upload once, share a link with
            per-file access rules, and watch every download land in your audit log —
            delivered from the edge, bit for bit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" className="px-7" render={<Link href="/register" />}>
              Start sending free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="px-7" render={<Link href="#benchmarks" />}>
              See the benchmarks
            </Button>
          </motion.div>
        </div>

        {/* Transfer window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-2xl"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="overflow-hidden rounded-2xl border bg-card/90 shadow-2xl shadow-black/10 backdrop-blur"
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 text-xs font-medium text-muted-foreground">New transfer — bastion</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">/dl/u-you/1.4.0/</Badge>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm text-muted-foreground">
                <Search className="h-4 w-4 shrink-0" />
                Search files, people, or paste a link…
                <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px]">⌘K</kbd>
              </div>
              <ul className="divide-y rounded-lg border">
                {FILES.map((f, i) => (
                  <li key={f.name} className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block text-xs text-muted-foreground">{f.meta}</span>
                    </span>
                    {f.progress < 100 ? (
                      <span className="flex w-28 items-center gap-2">
                        <Progress value={f.progress} className="h-1.5" />
                        <span className="text-xs tabular-nums text-muted-foreground">{f.progress}%</span>
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Stored</Badge>
                    )}
                    <span className="sr-only">{i === 0 ? "Uploading" : "Complete"}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Link2, label: "Anyone with the link" },
                  { icon: Lock, label: "Password on" },
                  { icon: Timer, label: "Expires in 7 days" },
                ].map((chip) => (
                  <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                    <chip.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {chip.label}
                  </span>
                ))}
                <Button size="sm" className="ml-auto">
                  <UploadCloud className="mr-1.5 h-4 w-4" /> Copy link
                </Button>
              </div>
            </div>
          </motion.div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No account needed to receive. Checksums verified end to end — the file they get is the file you sent.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
