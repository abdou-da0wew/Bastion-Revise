import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { getUsers, createAuditLog } from "@/lib/db";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

function ok<T>(data: T): NextResponse { return NextResponse.json({ success: true, data } satisfies ApiResponse<T>); }
function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse, { status });
}

/** Admin user listing: any admin level (moderator+) may view accounts. */
export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  try {
    const actor = await getActor();
    if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    if (roleLevel(actor.role) < 1) return err(ERROR_CODES.FORBIDDEN, "Admin access required", 403);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const result = await getUsers({ page, pageSize });
    await createAuditLog({
      traceId, action: AUDIT_ACTIONS.ADMIN_ACTION, actorId: actor.userId, actorEmail: actor.email, actorIp: ip,
      metadata: { adminAction: "list_users", page, pageSize, actorRole: actor.role }, success: true,
      durationMs: Math.round(performance.now() - start),
    });
    return ok(result);
  } catch (error) {
    console.error("Admin list users error [traceId=%s]:", traceId, error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
