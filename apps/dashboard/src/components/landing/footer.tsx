"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

const footerLinks = [
  { label: "GitHub", href: "https://github.com/abdou-da0wew/bastion" },
  { label: "Docs", href: "#docs" },
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Bastion &mdash; Fortified File Delivery</span>
          </div>

          <nav className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground sm:text-left">
          &copy; {year} Bastion. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
