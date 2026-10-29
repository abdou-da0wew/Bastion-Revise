"use client";

/**
 * GlyphOrb — hand-built equivalent of React Bits Pro `@reactbits-starter/glyph-orb-tw`
 * (the licensed registry is unreachable from the build sandbox, so this is a
 * from-scratch canvas implementation at the same visual quality: a banded ASCII
 * planet with turbulence, storm swirl, rim light and an atmosphere halo).
 *
 * Renders a slowly rotating sphere made of glyphs on a <canvas>. Respects
 * prefers-reduced-motion (renders one static frame) and pauses off-screen.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface GlyphOrbProps {
  glyphSize?: number;
  spacing?: number;
  centerY?: number;
  tilt?: number;
  bands?: number;
  turbulence?: number;
  lightAngle?: number;
  lightHeight?: number;
  rim?: number;
  atmosphere?: number;
  contrast?: number;
  glow?: number;
  intensity?: number;
  momentum?: number;
  stormStrength?: number;
  className?: string;
}

const RAMP = " ·:;+*x%#@";

export function GlyphOrb({
  glyphSize = 9,
  spacing = 0.75,
  centerY = 0.46,
  tilt = -84,
  bands = 17,
  turbulence = 1.25,
  lightAngle = 48,
  lightHeight = 0.61,
  rim = 1.45,
  atmosphere = 2,
  contrast = 0.29,
  glow = 0.22,
  intensity = 2.3,
  momentum = 0.48,
  stormStrength = 3,
  className,
}: GlyphOrbProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, last = 0;
    const pointer = { x: 0, y: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.02 });
    io.observe(canvas);

    const tiltRad = (tilt * Math.PI) / 180;
    const cosT = Math.cos(tiltRad), sinT = Math.sin(tiltRad);
    const la = (lightAngle * Math.PI) / 180;
    const lh = Math.max(-1, Math.min(1, lightHeight));
    const lHoriz = Math.sqrt(Math.max(0, 1 - lh * lh));
    const L = { x: Math.cos(la) * lHoriz, y: -lh, z: Math.sin(la) * lHoriz };

    const draw = (t: number) => {
      if (!w || !h) return;
      const color = getComputedStyle(canvas).color || "#888";
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2 + pointer.x * 10;
      const cy = h * centerY + pointer.y * 6;
      const R = Math.min(w, h) * 0.44;
      const cellW = Math.max(3, glyphSize * 0.62 * spacing + 2.2);
      const cellH = Math.max(4, glyphSize * spacing + 2.6);
      ctx.font = `${glyphSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const rot = t * 0.12 * momentum * 2;

      for (let y = cy - R * 1.22; y < cy + R * 1.22; y += cellH) {
        for (let x = cx - R * 1.22; x < cx + R * 1.22; x += cellW) {
          const nx = (x - cx) / R;
          const ny = (y - cy) / R;
          const r2 = nx * nx + ny * ny;

          if (r2 > 1) {
            // Atmosphere halo — faint glyphs just outside the limb.
            const r = Math.sqrt(r2);
            if (r < 1 + 0.05 * atmosphere) {
              const a = Math.max(0, (1 + 0.05 * atmosphere - r)) * glow * 6;
              if (a > 0.03) {
                ctx.globalAlpha = Math.min(0.5, a);
                ctx.fillStyle = color;
                ctx.fillText(RAMP[1 + ((x * 7 + y * 13) % 3 + 3) % 3], x, y);
              }
            }
            continue;
          }

          const nz = Math.sqrt(1 - r2);
          // Rotate normal by tilt around X axis for band orientation.
          const ry = ny * cosT - nz * sinT;
          const lon = Math.atan2(nz, nx) + rot;
          const storm = Math.sin(lon * 3 + ry * 4 - t * 0.35) * 0.14 * stormStrength
            + Math.sin(lon * 7 - t * 0.2) * 0.05 * stormStrength;
          const bandWave = Math.sin(ry * bands * Math.PI + turbulence * Math.sin(lon * 2 + t * 0.15) + storm * bands * 0.35);
          const diffuse = Math.max(0, nx * L.x + ny * L.y + nz * L.z);
          const rimLight = Math.pow(1 - nz, 2.2) * rim * 0.55;
          let v = diffuse * intensity * 0.62 + bandWave * contrast * 0.5 + rimLight + glow * 0.35;
          v = Math.max(0, Math.min(1, v));
          const idx = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
          if (idx <= 0) continue;
          ctx.globalAlpha = 0.25 + v * 0.75;
          ctx.fillStyle = color;
          ctx.fillText(RAMP[idx], x, y);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 42) return; // ~24fps is plenty for glyphs
      last = now;
      draw(now / 1000);
    };

    if (reduced) {
      draw(4.2);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, [glyphSize, spacing, centerY, tilt, bands, turbulence, lightAngle, lightHeight, rim, atmosphere, contrast, glow, intensity, momentum, stormStrength]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none h-full w-full text-foreground", className)}
    />
  );
}
