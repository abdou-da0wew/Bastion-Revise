"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";

const stats = [
  { value: "10K+", label: "files served" },
  { value: "99.9%", label: "uptime" },
  { value: "190+", label: "edge locations" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.04] dark:opacity-[0.08]"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 flex items-center justify-center animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Shield className="h-3 w-3" />
              Secure CDN for modern applications
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl animate-fade-in"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            Fortified File Delivery
          </h1>

          {/* Subheadline */}
          <p
            className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            Upload once. Deliver everywhere. Bastion is a secure CDN with per-file
            access rules, rate limiting, hotlink protection, and full audit trails
            — all running on the Vercel edge network.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-10 flex items-center justify-center gap-4 animate-fade-in"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            <Button size="lg" className="px-8" render={<Link href="/dashboard" />}>
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" className="px-8" render={<Link href="#features" />}>
              View Docs
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="mt-20 grid grid-cols-3 gap-8 border-t border-border pt-10 animate-fade-in"
          style={{ animationDelay: "0.4s", animationFillMode: "both" }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
