import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { getUserById, updateUser, deleteUser, getFilesByUser, createAuditLog } from "@/lib/db";
import { cdnDeleteFile } from "@/lib/cdn";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS } from "@/lib/constants";
import { isRole, type ApiResponse, type Role } from "@/lib/types";

function ok<T>(data: T): NextResponse { return NextResponse.json({ success: true, data } satisfies ApiResponse<T>); }
function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse, { status });
}
const ipOf = (r: NextRequest) => r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || r.headers.get("x-real-ip") || "unknown";

/**
 * Hierarchy rules (user 0 < moderator 1 < admin 2 < superadmin 3):
 * - You can only manage accounts strictly below your level.
 * - You can only grant roles strictly below your level.
 * - Role changes require admin (2)+; suspend/quota/expiry: moderator (1)+ for plain users.
 * - Deletion: admin (2)+, and only superadmin can delete another admin-level account.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = createTraceId(); const start = performance.now(); const ip = ipOf(request);
  try {
    const actor = await getActor();
    if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    if (roleLevel(actor.role) < 1) return err(ERROR_CODES.FORBIDDEN, "Admin access required", 403);
    const { id } = await params;
    if (id === actor.userId) return err(ERROR_CODES.VALIDATION_ERROR, "Cannot modify your own account via this endpoint", 400);
    const user = await getUserById(id);
    if (!user) return err(ERROR_CODES.FILE_NOT_FOUND, "User not found", 404);
    if (roleLevel(user.role) >= roleLevel(actor.role)) return err(ERROR_CODES.FORBIDDEN, "You can only manage accounts below your admin level", 403);

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (body.role !== undefined) {
      if (!isRole(body.role)) return err(ERROR_CODES.VALIDATION_ERROR, "Invalid role", 400);
      if (roleLevel(actor.role) < 2) return err(ERROR_CODES.FORBIDDEN, "Role changes require admin (level 2)+", 403);
      if (roleLevel(body.role as Role) >= roleLevel(actor.role)) return err(ERROR_CODES.FORBIDDEN, "You cannot grant a role at or above your own level", 403);
      updates.role = body.role;
    }
    if (typeof body.active === "boolean") updates.active = body.active;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 100);
    if (body.expiresAt !== undefined) {
      if (body.expiresAt !== null && typeof body.expiresAt !== "string") return err(ERROR_CODES.VALIDATION_ERROR, "expiresAt must be an ISO date or null", 400);
      updates.expiresAt = body.expiresAt === null ? null : new Date(body.expiresAt as string);
      if (updates.expiresAt instanceof Date && Number.isNaN(updates.expiresAt.getTime())) return err(ERROR_CODES.VALIDATION_ERROR, "expiresAt is not a valid date", 400);
    }
    if (body.quota !== undefined) {
      if (roleLevel(actor.role) < 2) return err(ERROR_CODES.FORBIDDEN, "Quota changes require admin (level 2)+", 403);
      const q = body.quota as Record<string, unknown>;
      const quota: Record<string, number> = {};
      for (const k of ["maxFiles", "maxStorageBytes", "maxRequestsPerDay"] as const) {
        if (q[k] !== undefined) {
          const n = Number(q[k]);
          if (!Number.isInteger(n) || n < 0) return err(ERROR_CODES.VALIDATION_ERROR, `quota.${k} must be a non-negative integer`, 400);
          quota[`quota.${k}`] = n;
        }
      }
      Object.assign(updates, quota);
    }
    if (Object.keys(updates).length === 0) return err(ERROR_CODES.VALIDATION_ERROR, "No valid fields to update: role, active, name, expiresAt, quota", 400);

    const updated = await updateUser(id, updates as never);
    await createAuditLog({
      traceId, action: AUDIT_ACTIONS.ADMIN_ACTION, actorId: actor.userId, actorEmail: actor.email, actorIp: ip,
      metadata: { adminAction: "update_user", targetUserId: id, targetEmail: user.email, updates: Object.keys(updates), actorRole: actor.role },
      success: true, durationMs: Math.round(performance.now() - start),
    });
    return ok({ user: updated });
  } catch (error) {
    console.error("Admin update user error [traceId=%s]:", traceId, error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = createTraceId(); const start = performance.now(); const ip = ipOf(request);
  try {
    const actor = await getActor();
    if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    if (roleLevel(actor.role) < 2) return err(ERROR_CODES.FORBIDDEN, "Deletion requires admin (level 2)+", 403);
    const { id } = await params;
    if (id === actor.userId) return err(ERROR_CODES.VALIDATION_ERROR, "Cannot delete your own account", 400);
    const user = await getUserById(id);
    if (!user) return err(ERROR_CODES.FILE_NOT_FOUND, "User not found", 404);
    if (roleLevel(user.role) >= roleLevel(actor.role)) return err(ERROR_CODES.FORBIDDEN, "You can only delete accounts below your admin level", 403);

    const { data: userFiles } = await getFilesByUser(id, { pageSize: 1000 });
    for (const file of userFiles) {
      if (file.cdn) await cdnDeleteFile(file.cdn.package, file.cdn.version, file.cdn.filename).catch(() => undefined);
    }
    await deleteUser(id);
    await createAuditLog({
      traceId, action: AUDIT_ACTIONS.ADMIN_ACTION, actorId: actor.userId, actorEmail: actor.email, actorIp: ip,
      metadata: { adminAction: "delete_user", targetUserId: id, targetEmail: user.email, filesDeleted: userFiles.length, actorRole: actor.role },
      success: true, durationMs: Math.round(performance.now() - start),
    });
    return ok({ deleted: true, userEmail: user.email, filesDeleted: userFiles.length });
  } catch (error) {
    console.error("Admin delete user error [traceId=%s]:", traceId, error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
