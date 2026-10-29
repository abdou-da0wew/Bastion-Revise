"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";
import { RisingInk } from "@/components/reactbits/rising-ink";

const PLANS = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    blurb: "For sending your first heavy files.",
    features: ["500 MB storage", "10,000 requests / day", "500 MB max file size", "Per-file access rules", "Full audit log"],
    cta: "Start free",
  },
  {
    name: "Studio",
    monthly: 19,
    yearly: 15,
    blurb: "For teams shipping work every day.",
    features: ["200 GB storage", "Unlimited guest uploads", "Custom domain & branding", "Team workspaces & roles", "Benchmarks & analytics", "Priority support"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Fortress",
    monthly: 79,
    yearly: 63,
    blurb: "Self-hosted control, enterprise guardrails.",
    features: ["Unlimited storage (your infra)", "3-tier admin hierarchy", "Scoped service tokens", "Data residency controls", "SSO & advanced audit exports"],
    cta: "Talk to us",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="border-t py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <RisingInk text="Pricing that scales with your files" />
          </h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when the archive gets serious.</p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="relative flex rounded-full border bg-card p-1" role="group" aria-label="Billing period">
              {(["Monthly", "Yearly"] as const).map((label) => {
                const isYear = label === "Yearly";
                const selected = yearly === isYear;
                return (
                  <button
                    key={label}
                    onClick={() => setYearly(isYear)}
                    aria-pressed={selected}
                    className={cn("relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors", selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {selected && <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="relative">{label}{isYear ? " −20%" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <Reveal key={plan.name} delay={i * 0.08}>
                <div
                  data-ascii="surface"
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1",
                    plan.featured && "border-primary shadow-xl shadow-primary/10"
                  )}
                >
                  {plan.featured && <Badge className="absolute -top-3 left-6">Most popular</Badge>}
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                  <div className="mt-5 flex h-14 items-end gap-1 overflow-hidden">
                    <span className="text-lg text-muted-foreground">$</span>
                    <span className="relative inline-flex h-12 items-start overflow-hidden text-5xl font-bold tabular-nums">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={price}
                          initial={{ y: 26, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -26, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="block leading-none"
                        >
                          {price}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">/ mo{yearly && price > 0 ? ", billed yearly" : ""}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-7 w-full" variant={plan.featured ? "default" : "outline"} render={<Link href="/register" />}>
                    {plan.cta}
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
