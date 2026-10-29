"use client";

import { FileIcon, HardDrive, Download, Shield } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AsciiCardSkeleton } from "@/components/ui/ascii";

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: { value: string; positive: boolean };
}

interface StatsCardsProps {
  data?: {
    totalFiles: number;
    totalStorage: number;
    totalDownloads: number;
    activeRules: number;
  };
  loading?: boolean;
}

const defaultData = {
  totalFiles: 0,
  totalStorage: 0,
  totalDownloads: 0,
  activeRules: 0,
};

export function StatsCards({ data, loading }: StatsCardsProps) {
  const stats = data ?? defaultData;

  const cards: Stat[] = [
    {
      label: "Total Files",
      value: stats.totalFiles.toLocaleString(),
      icon: FileIcon,
      trend: { value: `${stats.totalFiles > 0 ? "+" : ""}${stats.totalFiles}`, positive: stats.totalFiles >= 0 },
    },
    {
      label: "Storage Used",
      value: formatBytes(stats.totalStorage),
      icon: HardDrive,
      trend: { value: formatBytes(stats.totalStorage || 0), positive: true },
    },
    {
      label: "Total Downloads",
      value: stats.totalDownloads.toLocaleString(),
      icon: Download,
      trend: { value: `${stats.totalDownloads > 0 ? "+" : ""}${stats.totalDownloads}`, positive: stats.totalDownloads >= 0 },
    },
    {
      label: "Active Rules",
      value: stats.activeRules.toLocaleString(),
      icon: Shield,
      trend: { value: `${stats.activeRules > 0 ? "+" : ""}${stats.activeRules}`, positive: true },
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <AsciiCardSkeleton key={i} seed={20 + i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tracking-tight">
                      {card.value}
                    </p>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        card.trend.positive
                          ? "text-emerald-500"
                          : "text-red-500"
                      )}
                    >
                      {card.trend.value}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
