import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { queryAuditLogs, getFilesByUser, getAllFiles } from "@/lib/db";
import { ERROR_CODES, AUDIT_ACTIONS } from "@/lib/constants";
import type { ApiResponse, AuditLog } from "@/lib/types";

function ok<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>);
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

function getTimeframeRange(timeframe: string): { startDate: string } {
  const now = Date.now();
  const msMap: Record<string, number> = {
    "24h": 86_400_000,
    "7d": 7 * 86_400_000,
    "30d": 30 * 86_400_000,
  };
  const ms = msMap[timeframe] || 86_400_000;
  return { startDate: new Date(now - ms).toISOString() };
}

interface RequestsByTime {
  labels: string[];
  values: number[];
}

interface TopFile {
  id: string;
  name: string;
  mimeType: string;
  downloads: number;
  sizeBytes: number;
}

interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }

    const { searchParams } = request.nextUrl;
    const timeframe = searchParams.get("timeframe") || "24h";

    if (!["24h", "7d", "30d"].includes(timeframe)) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Invalid timeframe. Use: 24h, 7d, or 30d", 400);
    }

    const isAdmin = roleLevel(session.role) >= 1;
    const { startDate } = getTimeframeRange(timeframe);

    // Get user's files
    const userFilesResult = isAdmin
      ? await getAllFiles({ pageSize: 1000 })
      : await getFilesByUser(session.userId, { pageSize: 1000 });

    const userFiles = userFilesResult.data;

    // Query audit logs for file access events within timeframe
    const { logs: accessLogs } = await queryAuditLogs({
      startDate,
      action: AUDIT_ACTIONS.FILE_ACCESS,
      pageSize: 5000,
    });

    // Filter logs to only include this user's files (or all for admin)
    const userFileIds = new Set(userFiles.map((f) => f.id));
    const filteredLogs: AuditLog[] = isAdmin
      ? accessLogs
      : accessLogs.filter((l) => l.fileId && userFileIds.has(l.fileId));

    // File type distribution
    const typeCount: Record<string, number> = {};
    for (const f of userFiles) {
      const mimeGroup = f.mimeType.split("/")[0] || "unknown";
      typeCount[mimeGroup] = (typeCount[mimeGroup] || 0) + 1;
    }
    const totalInView = userFiles.length;
    const typeDistribution: TypeDistribution[] = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalInView > 0 ? Math.round((count / totalInView) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Requests over time (grouped in buckets)
    const requestsOverTime = buildTimeBuckets(filteredLogs, timeframe);

    // Top files by downloads
    const topFiles: TopFile[] = [...userFiles]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10)
      .map((f) => ({
        id: f.id,
        name: f.originalName,
        mimeType: f.mimeType,
        downloads: f.downloads,
        sizeBytes: f.sizeBytes,
      }));

    return ok({
      timeframe,
      requestsOverTime,
      topFiles,
      typeDistribution,
      summary: {
        totalRequests: filteredLogs.length,
        totalFiles: userFiles.length,
        totalDownloads: userFiles.reduce((s, f) => s + f.downloads, 0),
        totalStorageBytes: userFiles.reduce((s, f) => s + f.sizeBytes, 0),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}

function buildTimeBuckets(logs: AuditLog[], timeframe: string): RequestsByTime {
  const now = Date.now();
  const windowMs =
    timeframe === "24h" ? 86_400_000 :
    timeframe === "7d" ? 7 * 86_400_000 :
    30 * 86_400_000;

  const bucketMs =
    timeframe === "24h" ? 3_600_000 :   // hourly for 24h
    timeframe === "7d" ? 86_400_000 :   // daily for 7d
    86_400_000;                          // daily for 30d

  const start = now - windowMs;
  const bucketCount = Math.ceil(windowMs / bucketMs);
  const buckets: number[] = new Array(bucketCount).fill(0);

  for (const log of logs) {
    const ts = new Date(log.timestamp).getTime();
    if (ts >= start) {
      const idx = Math.min(Math.floor((ts - start) / bucketMs), bucketCount - 1);
      buckets[idx]++;
    }
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: timeframe === "24h" ? "numeric" : undefined,
  });

  const labels: string[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketTime = new Date(start + i * bucketMs);
    labels.push(formatter.format(bucketTime));
  }

  return { labels, values: buckets };
}
