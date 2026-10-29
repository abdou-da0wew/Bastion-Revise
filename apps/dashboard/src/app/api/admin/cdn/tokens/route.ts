import { type NextRequest, NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { cdnTokens } from "@/lib/cdn";
import { ERROR_CODES } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";
function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse, { status });
}
/** CDN service-token management — superadmin only (these tokens guard the infra). */
async function guard() {
  const actor = await getActor();
  if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
  if (roleLevel(actor.role) < 3) return err(ERROR_CODES.FORBIDDEN, "Superadmin (level 3) required", 403);
  return null;
}
export async function GET() {
  const g = await guard(); if (g) return g;
  const res = await cdnTokens("GET");
  return NextResponse.json(await res.json(), { status: res.status });
}
export async function POST(request: NextRequest) {
  const g = await guard(); if (g) return g;
  const res = await cdnTokens("POST", "", await request.json());
  return NextResponse.json(await res.json(), { status: res.status });
}
export async function DELETE(request: NextRequest) {
  const g = await guard(); if (g) return g;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err(ERROR_CODES.VALIDATION_ERROR, "id query parameter required", 400);
  const res = await cdnTokens("DELETE", `/${encodeURIComponent(id)}`);
  return new NextResponse(null, { status: res.status });
}
