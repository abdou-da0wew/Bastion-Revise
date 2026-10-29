import { type NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth";
import { getFileById, updateFile, deleteFileRecord, createAuditLog } from "@/lib/db";
import { deleteFile as deleteFromStorage } from "@/lib/storage";
import { cdnDeleteFile } from "@/lib/cdn";
import { roleLevel } from "@/lib/auth";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS, ROLES, FILE_STATUS } from "@/lib/constants";
import type { ApiResponse, CDNConfig, FileRecord } from "@/lib/types";

function ok<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>);
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

const CDN_CONFIG_FIELDS: (keyof CDNConfig)[] = [
  "allowedDomains", "blockedDomains", "allowedUserAgents", "blockedUserAgents",
  "allowedIPs", "blockedIPs", "maxRequestsPerDay", "maxRequestsPerHour",
  "maxRequestsPerMinute", "requireAuth", "requireApiKey", "refererCheck",
  "corsEnabled", "cacheTTL", "hotlinkProtection",
];

async function checkOwnership(
  fileId: string,
  session: { userId: string; role: string }
): Promise<{ file: FileRecord } | NextResponse> {
  const file = await getFileById(fileId);
  if (!file) {
    return err(ERROR_CODES.FILE_NOT_FOUND, "File not found", 404);
  }
  if (file.userId !== session.userId && roleLevel(session.role) < 2) {
    return err(ERROR_CODES.FORBIDDEN, "You do not have permission to access this file", 403);
  }
  return { file };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }

    const { id } = await params;
    const result = await checkOwnership(id, session);
    if ("status" in result) return result;

    return ok({ file: result.file });
  } catch (error) {
    console.error("Get file error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const result = await checkOwnership(id, session);
    if ("status" in result) return result;

    const body = await request.json() as Record<string, unknown>;
    const dbUpdates: {
      status?: "active" | "disabled" | "pending";
      config?: Partial<CDNConfig>;
      originalName?: string;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      dbUpdates.originalName = body.name.trim();
    }

    const validStatuses = [FILE_STATUS.ACTIVE, FILE_STATUS.DISABLED, FILE_STATUS.PENDING];
    if (typeof body.status === "string" && validStatuses.includes(body.status as any)) {
      dbUpdates.status = body.status as "active" | "disabled" | "pending";
    }

    if (body.config && typeof body.config === "object") {
      const cfg = body.config as Record<string, unknown>;
      const configUpdates: Partial<CDNConfig> = {};
      for (const field of CDN_CONFIG_FIELDS) {
        if (cfg[field] !== undefined) {
          (configUpdates as any)[field] = cfg[field];
        }
      }
      if (Object.keys(configUpdates).length > 0) {
        dbUpdates.config = { ...result.file.config, ...configUpdates };
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return err(ERROR_CODES.VALIDATION_ERROR, "No valid fields to update", 400);
    }

    const updated = await updateFile(id, dbUpdates);
    if (!updated) {
      return err(ERROR_CODES.FILE_NOT_FOUND, "File not found", 404);
    }

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_UPDATE,
      actorId: session.userId,
      actorEmail: session.email,
      actorIp: ip,
      fileId: id,
      metadata: { updates: Object.keys(dbUpdates) },
      success: true,
      durationMs: duration,
    });

    return ok({ file: updated });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("Update file error [traceId=%s]:", traceId, error);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_UPDATE,
      actorId: "unknown",
      actorEmail: "unknown",
      actorIp: ip,
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      durationMs: duration,
    }).catch(() => {});

    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const result = await checkOwnership(id, session);
    if ("status" in result) return result;

    const file = result.file;

    let storageDeleted = false;
    if (file.cdn) {
      await cdnDeleteFile(file.cdn.package, file.cdn.version, file.cdn.filename);
      storageDeleted = true;
    } else {
      storageDeleted = await deleteFromStorage(file.id, file.extension);
    }
    await deleteFileRecord(id);

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_DELETE,
      actorId: session.userId,
      actorEmail: session.email,
      actorIp: ip,
      fileId: id,
      metadata: {
        fileName: file.originalName,
        storageDeleted,
        sizeBytes: file.sizeBytes,
      },
      success: true,
      durationMs: duration,
    });

    return ok({ deleted: true, storageDeleted });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("Delete file error [traceId=%s]:", traceId, error);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_DELETE,
      actorId: "unknown",
      actorEmail: "unknown",
      actorIp: ip,
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      durationMs: duration,
    }).catch(() => {});

    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
