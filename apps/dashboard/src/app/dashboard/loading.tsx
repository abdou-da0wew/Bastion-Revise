import { AsciiCardSkeleton, AsciiLines } from "@/components/ui/ascii";

/**
 * Dashboard route loading state — ASCII skeletons (ascii-reveal) with mixed
 * variants so the shell never shows a plain gray shimmer.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="space-y-2">
        <AsciiLines lines={1} seed={11} />
        <AsciiLines lines={1} seed={12} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AsciiCardSkeleton seed={1} />
        <AsciiCardSkeleton seed={2} />
        <AsciiCardSkeleton seed={3} />
        <AsciiCardSkeleton seed={4} />
      </div>
      <AsciiCardSkeleton seed={7} />
    </div>
  );
}
