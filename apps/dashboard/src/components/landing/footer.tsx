import Link from "next/link";
import { AtSign, Globe, Play, Rss, Shield } from "lucide-react";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Send & store", href: "#library" },
      { label: "Formats", href: "#formats" },
      { label: "Benchmarks", href: "#benchmarks" },
      { label: "Teams", href: "#teams" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Encryption", href: "#security" },
      { label: "Access rules", href: "#security" },
      { label: "Audit logs", href: "#security" },
      { label: "System status", href: "/dashboard/status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", href: "#library" },
      { label: "Customer stories", href: "#teams" },
      { label: "FAQ", href: "#faq" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "GitHub", href: "https://github.com/abdou-da0wew/hk-cdn" },
    ],
  },
];

const SOCIALS = [
  { icon: Globe, label: "GitHub", href: "https://github.com/abdou-da0wew/hk-cdn" },
  { icon: AtSign, label: "Twitter / X", href: "#" },
  { icon: Rss, label: "Blog", href: "#" },
  { icon: Play, label: "YouTube", href: "#" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t">
      {/* Giant background wordmark */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-10 select-none text-center font-bold leading-none tracking-tighter text-foreground/[0.04]" style={{ fontSize: "clamp(6rem, 18vw, 17rem)" }}>
        BASTION
      </div>
      <div className="relative mx-auto max-w-6xl px-6 pb-40 pt-16 sm:pb-48">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold tracking-tight">Bastion</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Send anything to anyone, keep it forever — fortified file delivery with
              per-file access rules and a complete audit trail.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5 hover:bg-accent"
                >
                  <s.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {year} Bastion. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational · 99.98% uptime
          </span>
        </div>
      </div>
    </footer>
  );
}
