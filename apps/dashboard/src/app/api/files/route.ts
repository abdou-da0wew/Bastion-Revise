import { type NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth";
import { getFilesByUser } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const search = searchParams.get("search") || undefined;
    const sort = searchParams.get("sort") || "createdAt";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const validSortFields = ["createdAt", "updatedAt", "name", "sizeBytes", "downloads", "originalName"];
    const sortField = validSortFields.includes(sort) ? sort : "createdAt";

    const result = await getFilesByUser(session.userId, {
      page,
      pageSize,
      search: search || undefined,
      sort: sortField,
      order,
    });

    return ok(result);
  } catch (error) {
    console.error("List files error:", error);
    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
