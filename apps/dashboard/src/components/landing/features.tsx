"use client";

import {
  Shield,
  Zap,
  ScrollText,
  ScanEye,
  Timer,
  LayoutDashboard,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Per-File Access Rules",
    description:
      "Set allowed domains, user agents, IP ranges per file. Full hotlink protection.",
  },
  {
    icon: Zap,
    title: "Edge-Optimized Delivery",
    description:
      "Files served from 190+ Vercel edge locations worldwide. Low latency, high throughput.",
  },
  {
    icon: ScrollText,
    title: "Full Audit Trail",
    description:
      "Every request logged. Trace IDs, IPs, user agents, timestamps. Searchable and exportable.",
  },
  {
    icon: ScanEye,
    title: "Malware Scanning",
    description:
      "Automatic file validation. Executables, scripts, archives blocked at upload. SHA-256 integrity hashes.",
  },
  {
    icon: Timer,
    title: "Rate Limiting",
    description:
      "Per-file, per-IP, per-key rate limits. Configurable windows: minute, hour, day.",
  },
  {
    icon: LayoutDashboard,
    title: "Clean Dashboard",
    description:
      "Upload, manage, and monitor your files. Dark and light themes. Simple API for automation.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to deliver files securely
          </h2>
          <p className="mt-4 text-muted-foreground">
            Security and performance built into every layer. No compromises.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
