import { type NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/db";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS } from "@/lib/constants";
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

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  try {
    const body = await request.json();
    const { email, password } = body as Record<string, string | undefined>;

    if (!email || !password) {
      return err(ERROR_CODES.VALIDATION_ERROR, "Email and password are required", 400);
    }

    await connectDB();
    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc) {
      return err(ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password", 401);
    }

    if (!userDoc.active) {
      return err(ERROR_CODES.FORBIDDEN, "This account is suspended. Contact an administrator.", 403);
    }
    if (userDoc.expiresAt && userDoc.expiresAt.getTime() < Date.now()) {
      return err(ERROR_CODES.FORBIDDEN, "This account has expired. Contact an administrator.", 403);
    }
    const valid = await verifyPassword(password, userDoc.passwordHash);
    if (!valid) {
      await createAuditLog({
        traceId,
        action: AUDIT_ACTIONS.USER_LOGIN,
        actorId: userDoc._id.toString(),
        actorEmail: userDoc.email,
        actorIp: ip,
        success: false,
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        durationMs: Math.round(performance.now() - start),
      });

      return err(ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password", 401);
    }

    const user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      role: userDoc.role,
      apiKey: userDoc.apiKey,
      active: userDoc.active,
      quota: userDoc.quota,
      expiresAt: userDoc.expiresAt ? userDoc.expiresAt.toISOString() : null,
      lastLoginAt: new Date().toISOString(),
      cdnPackage: userDoc.cdnPackage || `u-${userDoc._id.toString().slice(0, 12)}`,
      createdAt: userDoc.createdAt.toISOString(),
      updatedAt: userDoc.updatedAt.toISOString(),
    };

    userDoc.lastLoginAt = new Date();
    await userDoc.save();
    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.USER_LOGIN,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: ip,
      success: true,
      durationMs: duration,
    });

    return ok({ user, token });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("Login error [traceId=%s]:", traceId, error);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.USER_LOGIN,
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
