import { type NextRequest, NextResponse } from "next/server";
import { hashPassword, createSession } from "@/lib/auth";
import { getUserByEmail, createUser, createAuditLog, countAllUsers } from "@/lib/db";
import { createTraceId } from "@/lib/audit";
import { generateApiKey } from "@/lib/utils";
import { ERROR_CODES, AUDIT_ACTIONS } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, init);
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  try {
    const body = await request.json();
    const { email, password, name } = body as Record<string, string | undefined>;

    if (!email || !password || !name) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Email, password, and name are required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Invalid email format", 400);
    }

    if (password.length < 8) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Password must be at least 8 characters", 400);
    }

    if (name.trim().length === 0) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Name cannot be empty", 400);
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return err(ERROR_CODES.USER_EXISTS, "A user with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const apiKey = generateApiKey();
    // Bootstrap: the very first account — or an email listed in
    // BASTION_SUPERADMIN_EMAILS — becomes superadmin (level 3).
    const superEmails = (process.env.BASTION_SUPERADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const isFirst = (await countAllUsers()) === 0;
    const role = isFirst || superEmails.includes(email.toLowerCase()) ? "superadmin" : "user";

    const user = await createUser({
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      role,
      apiKey,
    });

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.USER_REGISTER,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: ip,
      success: true,
      durationMs: duration,
    });

    return ok({ user, token }, { status: 201 });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("Register error [traceId=%s]:", traceId, error);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.USER_REGISTER,
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
