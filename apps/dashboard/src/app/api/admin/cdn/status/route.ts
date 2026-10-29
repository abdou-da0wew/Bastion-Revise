import { NextResponse } from "next/server";
import { getActor, roleLevel } from "@/lib/auth";
import { cdnHealth, cdnListRegistry } from "@/lib/cdn";
import { ERROR_CODES } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";
function err(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse, { status });
}
export async function GET() {
  const actor = await getActor();
  if (!actor) return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
  if (roleLevel(actor.role) < 1) return err(ERROR_CODES.FORBIDDEN, "Admin access required", 403);
  const [health, registry] = await Promise.all([cdnHealth(), cdnListRegistry().catch(() => null)]);
  return NextResponse.json({ success: true, data: { cdn: health, registry } } satisfies ApiResponse);
}
