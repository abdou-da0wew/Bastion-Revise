import { type NextRequest, NextResponse } from "next/server";
import { getActor, hashPassword, verifyPassword } from "@/lib/auth";
import { getUserById, updateUser, createAuditLog } from "@/lib/db";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { generateApiKey } from "@/lib/utils";
import { createTraceId } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { ERROR_CODES } from "@/lib/constants";
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

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getActor();
    if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Not authenticated", 401);
    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 100);
    if (body.newPassword !== undefined) {
      if (typeof body.newPassword !== "string" || body.newPassword.length < 8) return err(ERROR_CODES.VALIDATION_ERROR, "Password must be at least 8 characters", 400);
      await connectDB();
      const doc = await User.findById(actor.userId);
      if (!doc || typeof body.currentPassword !== "string" || !(await verifyPassword(body.currentPassword, doc.passwordHash))) {
        return err(ERROR_CODES.INVALID_CREDENTIALS, "Current password is incorrect", 401);
      }
      updates.passwordHash = await hashPassword(body.newPassword);
    }
    if (body.regenerateApiKey === true) updates.apiKey = generateApiKey();
    if (Object.keys(updates).length === 0) return err(ERROR_CODES.VALIDATION_ERROR, "Nothing to update", 400);
    const user = await updateUser(actor.userId, updates as never);
    await createAuditLog({ traceId: createTraceId(), action: AUDIT_ACTIONS.CONFIG_UPDATE, actorId: actor.userId, actorEmail: actor.email, actorIp: "unknown", metadata: { fields: Object.keys(updates) }, success: true, durationMs: 0 }).catch(() => undefined);
    return ok({ user });
  } catch (error) {
    console.error("Me PATCH error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Not authenticated", 401);
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return err(ERROR_CODES.UNAUTHORIZED, "User not found", 401);
    }

    return ok({ user });
  } catch (error) {
    console.error("Me error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
