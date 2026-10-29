"use client";

/**
 * Preferences — settings form in the style of the reference set:
 * theme radio pills, density/language selects, switches with
 * Recommended/Changed badges, and a sticky "Unsaved preferences" footer.
 * Persists to localStorage; Theme is wired to next-themes for real.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Prefs {
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  language: string;
  emailDigest: boolean;
  downloadAlerts: boolean;
  publicProfile: boolean;
  betaFeatures: boolean;
  digestOptIn: boolean;
}

const DEFAULTS: Prefs = {
  theme: "system",
  density: "comfortable",
  language: "en",
  emailDigest: true,
  downloadAlerts: true,
  publicProfile: false,
  betaFeatures: false,
  digestOptIn: true,
};

const KEY = "bastion-preferences";

const SWITCHES: Array<{
  key: keyof Prefs;
  label: string;
  desc: string;
  recommended?: boolean;
}> = [
  { key: "emailDigest", label: "Weekly email digest", desc: "Downloads, uploads and storage in one calm summary.", recommended: true },
  { key: "downloadAlerts", label: "Instant download alerts", desc: "Get pinged the moment a shared file is downloaded.", recommended: true },
  { key: "publicProfile", label: "Public file profile", desc: "Let anyone browse your public files from one page." },
  { key: "betaFeatures", label: "Beta features", desc: "Try experimental delivery features before they ship." },
];

export function PreferencesCard() {
  const { setTheme } = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [saved, setSaved] = useState<Prefs>(DEFAULTS);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
        setPrefs(parsed);
        setSaved(parsed);
      }
    } catch { /* defaults */ }
  }, []);

  const dirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(saved), [prefs, saved]);
  const changedKeys = useMemo(
    () => (Object.keys(DEFAULTS) as Array<keyof Prefs>).filter((k) => prefs[k] !== DEFAULTS[k]),
    [prefs]
  );

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    setTheme(prefs.theme);
    document.documentElement.dataset.density = prefs.density;
    setSaved(prefs);
    setMsg("Preferences saved");
    setTimeout(() => setMsg(""), 2500);
  };

  const cancel = () => setPrefs(saved);

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>How Bastion looks and talks to you. Theme applies instantly on save.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-24">
        {/* Theme radio pills */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex w-fit rounded-full border p-1" role="radiogroup" aria-label="Theme">
            {(["system", "light", "dark"] as const).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={prefs.theme === t}
                onClick={() => set("theme", t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all",
                  prefs.theme === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pref-density">Density</Label>
            <select
              id="pref-density"
              value={prefs.density}
              onChange={(e) => set("density", e.target.value as Prefs["density"])}
              className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pref-lang">Language</Label>
            <select
              id="pref-lang"
              value={prefs.language}
              onChange={(e) => set("language", e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        {/* Switches with Recommended / Changed badges */}
        <div className="divide-y rounded-xl border">
          {SWITCHES.map((s) => {
            const changed = changedKeys.includes(s.key);
            return (
              <div key={s.key} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {s.label}
                    {s.recommended && <Badge variant="secondary" className="text-[10px]">Recommended</Badge>}
                    {changed && <Badge className="bg-amber-500/15 text-[10px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">Changed</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <Switch
                  checked={Boolean(prefs[s.key])}
                  onCheckedChange={(v) => set(s.key, v as never)}
                  aria-label={s.label}
                />
              </div>
            );
          })}
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            checked={prefs.digestOptIn}
            onCheckedChange={(v) => set("digestOptIn", Boolean(v))}
            className="mt-0.5"
          />
          <span>
            Email me product updates and security notices
            {changedKeys.includes("digestOptIn") && (
              <Badge className="ml-2 bg-amber-500/15 text-[10px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">Changed</Badge>
            )}
            <span className="block text-xs text-muted-foreground">Security notices are rare and always important. Unsubscribe anytime.</span>
          </span>
        </label>
      </CardContent>

      {/* Sticky unsaved-changes footer */}
      <div
        className={cn(
          "sticky bottom-4 mx-4 flex items-center gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur transition-all duration-300",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
        aria-live="polite"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <p className="flex-1 text-sm font-medium">Unsaved preferences{msg ? ` — ${msg}` : ""}</p>
        <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
        <Button size="sm" onClick={save}>Save changes</Button>
      </div>
      {msg && !dirty && <p className="px-6 pb-4 text-sm text-emerald-600 dark:text-emerald-400">{msg}</p>}
    </Card>
  );
}
