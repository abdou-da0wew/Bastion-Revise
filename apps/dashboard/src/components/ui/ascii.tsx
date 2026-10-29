"use client";

/**
 * ASCII loading system — every skeleton loader in the app goes through
 * `ascii-reveal` (https://github.com/quanhoangindex/ascii-reveal).
 * Variants rotate dither → scan → braille → terminal by `seed` so neighbouring
 * placeholders never look identical.
 */
import { AsciiReveal, AsciiSkeleton } from "ascii-reveal";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = ["dither", "scan", "braille", "terminal"] as const;
export type AsciiVariant = (typeof VARIANTS)[number];

export function variantFor(seed = 0): AsciiVariant {
  return VARIANTS[Math.abs(seed) % VARIANTS.length];
}

/** Wrap content so it decodes into place through a character grid. */
export function Decode({
  children,
  preset = "decode",
  className,
  loading,
}: {
  children: ReactNode;
  preset?: "decode" | "dither" | "terminal" | "blueprint";
  className?: string;
  loading?: boolean;
}) {
  return (
    <AsciiReveal preset={preset} duration="fast" loading={loading} className={className}>
      {children}
    </AsciiReveal>
  );
}

export function AsciiLines({ lines = 3, seed = 0, className }: { lines?: number; seed?: number; className?: string }) {
  return <AsciiSkeleton lines={lines} seed={seed} variant={variantFor(seed)} className={className} />;
}

export function AsciiBlock({
  rows = 6,
  seed = 0,
  circle = false,
  className,
  width,
  height,
}: {
  rows?: number;
  seed?: number;
  circle?: boolean;
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <AsciiSkeleton
      rows={rows}
      seed={seed}
      variant={variantFor(seed)}
      circle={circle}
      width={width}
      height={height}
      className={className}
    />
  );
}

/** A card-shaped ASCII placeholder (media block + text lines). */
export function AsciiCardSkeleton({ seed = 0, className }: { seed?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)} aria-hidden="true">
      <AsciiBlock rows={5} seed={seed} className="mb-4 w-full" />
      <AsciiLines lines={3} seed={seed + 1} />
    </div>
  );
}

/** Table placeholder: header line + N row lines. */
export function AsciiTableSkeleton({ rows = 6, seed = 0, className }: { rows?: number; seed?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      <AsciiLines lines={1} seed={seed} />
      {Array.from({ length: rows }).map((_, i) => (
        <AsciiLines key={i} lines={1} seed={seed + i + 1} />
      ))}
    </div>
  );
}
