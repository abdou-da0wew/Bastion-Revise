import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { countUsers, countFiles, getStorageTotal, getTotalDownloads, createAuditLog } from "@/lib/db";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS, ROLES, BASTION } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

function ok<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>);
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }
    if (roleLevel(session.role) < 1) {
      return err(ERROR_CODES.FORBIDDEN, "Admin access required", 403);
    }

    const [totalUsers, totalFiles, totalStorage, totalDownloads] = await Promise.all([
      countUsers(),
      countFiles(),
      getStorageTotal(),
      getTotalDownloads(),
    ]);

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      actorId: session.userId,
      actorEmail: session.email,
      actorIp: ip,
      metadata: { adminAction: "view_stats" },
      success: true,
      durationMs: duration,
    });

    return ok({
      system: {
        name: BASTION.name,
        tagline: BASTION.tagline,
      },
      stats: {
        totalUsers,
        totalFiles,
        totalStorage,
        totalDownloads,
        systemUptime: Math.floor(process.uptime()),
      },
    });
  } catch (error) {
    console.error("Admin stats error [traceId=%s]:", traceId, error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
