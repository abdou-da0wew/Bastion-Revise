"use client";

/**
 * Publish review — multi-step wizard (Access → Protection → Delivery → Review)
 * adapted from the reference "Business → Coverage → Property → Review" flow:
 * completed steps get checkmarks, summary cards carry Edit buttons, a sticky
 * summary/pricing panel sits on the right, the final CTA stays disabled until
 * every confirmation checkbox is ticked, and a device-width preview (animated
 * container) shows the public download page.
 */
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Check, ChevronLeft, ChevronRight, Download, FileVideo, Globe2, KeyRound,
  Monitor, Rocket, ShieldCheck, Smartphone, Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STEPS = ["Access", "Protection", "Delivery", "Review"] as const;

const SUMMARY = [
  { step: 0, title: "Access", lines: ["Anyone with the link", "Guest uploads allowed"] },
  { step: 1, title: "Protection", lines: ["Password required", "Expires in 7 days", "Max 100 downloads"] },
  { step: 2, title: "Delivery", lines: ["Pinned at v1.4.0 (+ latest alias)", "Custom domain: files.yourco.com", "Range streaming on"] },
];

export function ReviewWizard() {
  const [step, setStep] = useState(3); // land on Review, like the reference screen
  const [done, setDone] = useState<Set<number>>(new Set([0, 1, 2]));
  const [confirm, setConfirm] = useState({ rules: false, checksum: false, expiry: false });
  const [published, setPublished] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const allConfirmed = confirm.rules && confirm.checksum && confirm.expiry;
  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "560px" : "330px";

  const goStep = (i: number) => setStep(i);
  const completeStep = () => {
    setDone((prev) => new Set(prev).add(step));
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Publish a file</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Walk the walls before anything goes public — access, protection, delivery, then one honest review.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2" aria-label="Publish progress">
        {STEPS.map((label, i) => {
          const isDone = done.has(i);
          const isCurrent = step === i;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                onClick={() => goStep(i)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                  isCurrent ? "border-primary bg-primary text-primary-foreground shadow" : isDone ? "bg-accent" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  isDone && !isCurrent ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary-foreground/25" : "bg-muted"
                )}>
                  {isDone && !isCurrent ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" />}
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step < 3 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{STEPS[step]}</CardTitle>
                    <CardDescription>
                      {step === 0 && "Who can reach this file once it's live?"}
                      {step === 1 && "Guardrails that are enforced before the first byte moves."}
                      {step === 2 && "How the file is delivered from the Bastion CDN core."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {step === 0 && (
                      <>
                        <StepRow icon={Globe2} title="Anyone with the link" desc="The /dl/ URL works for anyone who has it." on />
                        <StepRow icon={KeyRound} title="Guest uploads into this folder" desc="People can add files without an account." on />
                      </>
                    )}
                    {step === 1 && (
                      <>
                        <StepRow icon={KeyRound} title="Password required" desc="Recipients enter a password before downloading." on />
                        <StepRow icon={ShieldCheck} title="SHA-256 checksum published" desc="Recipients can verify the file bit-for-bit." on />
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <StepRow icon={Rocket} title="Pin version + latest alias" desc="/dl/u-you/1.4.0/… stays immutable; /latest always tracks newest." on />
                        <StepRow icon={Globe2} title="Range streaming" desc="Multi-gigabyte downloads resume instead of restarting." on />
                      </>
                    )}
                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={completeStep}>
                        Looks right — continue <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : published ? (
                <Card className="border-emerald-500/40">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    <h2 className="text-xl font-semibold">Published behind the walls</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      launch-cut_final_v12.mp4 is live at <code className="font-mono text-xs">/dl/u-you/1.4.0/launch-cut_final_v12.mp4</code> — every download will land in your audit log.
                    </p>
                    <div className="flex gap-2">
                      <Button render={<Link href="/dashboard/files" />}>View in My Files</Button>
                      <Button variant="outline" render={<Link href="/dashboard/logs" />}>Watch the audit log</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Review &amp; publish</CardTitle>
                    <CardDescription>Everything below applies the moment you publish. Edit anything that looks wrong.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SUMMARY.map((s) => (
                      <div key={s.title} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" /></span>
                            {s.title}
                          </p>
                          <ul className="mt-1.5 space-y-0.5 pl-7 text-sm text-muted-foreground">
                            {s.lines.map((l) => <li key={l}>{l}</li>)}
                          </ul>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => goStep(s.step)}>Edit</Button>
                      </div>
                    ))}

                    <div className="space-y-3 rounded-xl border border-dashed p-4">
                      <p className="text-sm font-medium">Before you publish, confirm:</p>
                      {([
                        ["rules", "The access rules above are the ones I intend — public link, password on."],
                        ["checksum", "I understand the SHA-256 checksum will be published for verification."],
                        ["expiry", "I accept this link expires in 7 days unless I extend it."],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-start gap-3 text-sm">
                          <Checkbox
                            checked={confirm[key]}
                            onCheckedChange={(v) => setConfirm((c) => ({ ...c, [key]: Boolean(v) }))}
                            className="mt-0.5"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!allConfirmed}
                      onClick={() => setPublished(true)}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      {allConfirmed ? "Publish launch-cut_final_v12.mp4" : "Confirm all three statements to publish"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Device preview — resizable preview container */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Public download page</CardTitle>
                  <CardDescription>Exactly what recipients see. Switch devices to check the fit.</CardDescription>
                </div>
                <div className="flex rounded-full border p-0.5" role="group" aria-label="Preview device">
                  {([
                    ["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone],
                  ] as const).map(([d, Icon]) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      aria-pressed={device === d}
                      aria-label={`${d} preview`}
                      className={cn("rounded-full p-2 transition-colors", device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative flex w-full items-start justify-center overflow-hidden rounded-xl border bg-white px-4 py-6 dark:bg-neutral-950">
                <div
                  className="overflow-hidden rounded-lg border bg-background shadow-xl transition-all duration-500 ease-in-out"
                  style={{ width: previewWidth, maxWidth: "100%" }}
                >
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-[11px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    files.yourco.com/dl/launch-cut_final_v12.mp4
                    <Badge variant="secondary" className="ml-auto text-[9px]">password protected</Badge>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <FileVideo className="h-8 w-8 text-muted-foreground" />
                    <p className="max-w-full truncate text-sm font-semibold">launch-cut_final_v12.mp4</p>
                    <p className="text-xs text-muted-foreground">2.4 GB · v1.4.0 · sha-256 verified</p>
                    <Button size="sm" className="mt-2"><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
                    <p className="text-[10px] text-muted-foreground">Expires in 7 days · served by Bastion</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary / pricing panel */}
        <Card className="xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle>Publish summary</CardTitle>
            <CardDescription>launch-cut_final_v12.mp4 · 2.4 GB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Storage after publish", "312 GB of 500 GB"],
              ["Version", "1.4.0 (pinned) + latest"],
              ["Access", "Link + password"],
              ["Expiry", "7 days"],
              ["Download cap", "100"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium">{v}</span>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Plan impact</span>
                <span className="font-semibold">$0 — within Studio quota</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Bandwidth beyond 1 TB/mo is billed at $0.02/GB. This file won&apos;t change your tier.</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mb-1 h-4 w-4 text-foreground" />
              Every download of this file is written to your audit log with actor, IP and trace ID.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepRow({ icon: Icon, title, desc, on }: { icon: typeof Globe2; title: string; desc: string; on?: boolean }) {
  const [value, setValue] = useState(Boolean(on));
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></span>
      <div className="flex-1">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={setValue} aria-label={title} />
    </div>
  );
}
