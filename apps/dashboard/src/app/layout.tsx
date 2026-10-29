import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted system font stack: builds must not depend on Google Fonts
// being reachable (offline/CI/Docker builders), and no font CSS is fetched
// from a third party at runtime.
export const metadata: Metadata = {
  title: "Bastion — Fortified File Delivery",
  description:
    "Secure, fast, and fully audited CDN for your assets. Upload once, deliver everywhere with per-file access rules, rate limiting, and full audit trails.",
  keywords: ["cdn", "file delivery", "secure cdn", "asset hosting"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
