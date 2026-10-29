import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { queryAuditLogs } from "@/lib/db";
import { ERROR_CODES, ROLES } from "@/lib/constants";
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
  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const action = searchParams.get("action") || undefined;
    const fileId = searchParams.get("fileId") || undefined;
    const successParam = searchParams.get("success");
    const success = successParam !== null ? successParam === "true" : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const isAdmin = roleLevel(session.role) >= 1;

    const result = await queryAuditLogs({
      page,
      pageSize,
      action,
      actorId: isAdmin ? undefined : session.userId,
      fileId,
      success,
      startDate,
      endDate,
    });

    return ok(result);
  } catch (error) {
    console.error("Logs query error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
