import { type NextRequest } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { getUsers, getAllFiles } from "@/lib/db";
import { getStorageStats } from "@/lib/storage";
import { createTraceId, writeAuditLog } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS, ROLES, BASTION } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

function ok<T>(data: T): Response {
  return Response.json({ success: true, data } satisfies ApiResponse<T>);
}

function err(code: string, message: string, status: number): Response {
  return Response.json(
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

    const [usersResult, filesResult, storageStats] = await Promise.all([
      getUsers({ pageSize: 10000 }),
      getAllFiles({ pageSize: 10000 }),
      getStorageStats(),
    ]);

    const users = usersResult.data;
    const files = filesResult.data;

    const totalUsers = users.length;
    const totalFiles = files.length;
    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    const roleCounts = {
      superadmin: users.filter((u) => u.role === "superadmin").length,
      admin: users.filter((u) => u.role === ROLES.ADMIN).length,
      moderator: users.filter((u) => u.role === "moderator").length,
      user: users.filter((u) => u.role === ROLES.USER).length,
    };

    const activeFiles = files.filter((f) => f.status === "active").length;
    const totalDownloads = files.reduce((sum, f) => sum + f.downloads, 0);

    const fileTypeBreakdown: Record<string, number> = {};
    for (const f of files) {
      const cat = f.mimeType.split("/")[0] || "unknown";
      fileTypeBreakdown[cat] = (fileTypeBreakdown[cat] || 0) + 1;
    }

    const statusCounts = {
      active: activeFiles,
      disabled: files.filter((f) => f.status === "disabled").length,
      pending: files.filter((f) => f.status === "pending").length,
    };

    const duration = Math.round(performance.now() - start);

    await writeAuditLog({
      traceId,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      actorId: session.userId,
      actorEmail: session.email,
      actorIp: ip,
      metadata: { adminAction: "view_config" },
      success: true,
      durationMs: duration,
    });

    return ok({
      system: {
        name: BASTION.name,
        tagline: BASTION.tagline,
        description: BASTION.description,
        url: BASTION.url,
      },
      stats: {
        totalUsers,
        totalFiles,
        totalBytes,
        storageUsed: storageStats.totalBytes,
        storageFiles: storageStats.totalFiles,
        totalDownloads,
        roleCounts,
        statusCounts,
        fileTypeBreakdown,
      },
    });
  } catch (error) {
    console.error("Admin config error [traceId=%s]:", traceId, error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
