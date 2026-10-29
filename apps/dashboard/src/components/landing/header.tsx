"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const MENUS: Array<{
  label: string;
  href?: string;
  items?: Array<{ label: string; href: string; desc: string }>;
}> = [
  {
    label: "Product",
    items: [
      { label: "Send & store", href: "#library", desc: "One link, any size, kept forever" },
      { label: "Formats", href: "#formats", desc: "Every file type, bit for bit" },
      { label: "Benchmarks", href: "#benchmarks", desc: "Measured, not marketing" },
      { label: "Teams", href: "#teams", desc: "Shared workspaces & roles" },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Encryption", href: "#security", desc: "AES-256 at rest, TLS 1.3 in flight" },
      { label: "Access rules", href: "#security", desc: "Per-file passwords, expiry, allowlists" },
      { label: "Audit logs", href: "#security", desc: "Every access, traced end to end" },
    ],
  },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-6"
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 transition-all duration-500",
          scrolled
            ? "max-w-3xl rounded-2xl border bg-background/75 shadow-lg shadow-black/5 backdrop-blur-xl"
            : "max-w-6xl rounded-2xl border border-transparent bg-transparent"
        )}
      >
        <Link href="/" className="flex items-center gap-2 py-2.5 pl-3 pr-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </span>
          <span className={cn("text-base font-semibold tracking-tight transition-opacity", scrolled && "hidden sm:block")}>
            Bastion
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {MENUS.map((menu) =>
            "items" in menu && menu.items ? (
              <div key={menu.label} className="group relative">
                <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {menu.label}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
                    {menu.items.map((item) => (
                      <Link key={item.label} href={item.href} className="block rounded-lg px-3 py-2 transition-colors hover:bg-accent">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block text-xs text-muted-foreground">{item.desc}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={menu.label}
                href={(menu as { href: string }).href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {menu.label}
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 pr-2 lg:ml-0">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/register" />}>
            Start sending
          </Button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-3 top-full mt-2 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur-xl lg:hidden"
            aria-label="Mobile"
          >
            {MENUS.flatMap((m) => (m.items ? m.items : [{ label: m.label, href: m.href ?? "#", desc: "" }])).map(
              (item, i) => (
                <motion.div
                  key={item.label + i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                  >
                    {item.label}
                    {item.desc ? <span className="block text-xs font-normal text-muted-foreground">{item.desc}</span> : null}
                  </Link>
                </motion.div>
              )
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
