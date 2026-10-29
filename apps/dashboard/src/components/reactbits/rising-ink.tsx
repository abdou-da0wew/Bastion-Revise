"use client";

/**
 * RisingInk — hand-built equivalent of React Bits Pro `@reactbits-starter/rising-ink-tw`.
 * Letters near the cursor lift off the page in 3D (translateY + scale + rotateX
 * with a soft ink shadow), then settle back with a springy CSS transition.
 * Usage: <RisingInk text="Ship files like weather." /> or pass a string child.
 */
import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface RisingInkProps {
  text?: string;
  children?: string;
  className?: string;
  /** Max lift in px for the letter directly under the cursor. */
  lift?: number;
}

export function RisingInk({ text, children, className, lift = 14 }: RisingInkProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const chars = (text ?? children ?? "").split("");
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const update = (clientX: number, clientY: number) => {
    charRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = clientX - (r.left + r.width / 2);
      const dy = clientY - (r.top + r.height / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.exp(-(d * d) / (2 * 90 * 90)); // gaussian falloff
      const y = -lift * influence;
      const s = 1 + 0.22 * influence;
      const rx = -18 * influence * Math.sign(dy || 1);
      el.style.transition = "transform 90ms ease-out, text-shadow 90ms ease-out";
      el.style.transform = `translateY(${y}px) scale(${s}) rotateX(${rx}deg)`;
      el.style.textShadow = influence > 0.05
        ? `0 ${6 + lift * influence}px ${10 + 14 * influence}px rgb(0 0 0 / ${0.22 * influence})`
        : "none";
    });
  };

  const reset = () => {
    charRefs.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "transform 650ms cubic-bezier(.2,1.6,.3,1), text-shadow 500ms ease-out";
      el.style.transform = "translateY(0) scale(1) rotateX(0deg)";
      el.style.textShadow = "none";
    });
  };

  // Keep words intact for wrapping: render word groups of inline-block chars.
  const words = (text ?? children ?? "").split(" ");

  return (
    <span
      ref={rootRef}
      className={cn("inline [perspective:600px]", className)}
      onPointerMove={(e) => update(e.clientX, e.clientY)}
      onPointerLeave={reset}
      aria-label={text ?? children}
      role="text"
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden="true">
          {word.split("").map((ch, ci) => {
            const idx = words.slice(0, wi).join(" ").length + (wi > 0 ? 1 : 0) + ci;
            return (
              <span
                key={ci}
                ref={(el) => { charRefs.current[idx] = el; }}
                className="inline-block will-change-transform"
              >
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
      <span className="sr-only">{chars.join("")}</span>
    </span>
  );
}
