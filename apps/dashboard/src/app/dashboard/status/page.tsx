import { Metadata } from "next";
import { UptimeGrid, ServiceHealth } from "@/components/dashboard/viz";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "System Status" };

export default function StatusPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoring for the Bastion CDN core and dashboard — 90 days of history, per service.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
        </Badge>
      </div>
      <UptimeGrid />
      <ServiceHealth />
    </div>
  );
}
