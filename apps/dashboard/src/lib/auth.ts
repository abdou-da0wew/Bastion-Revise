import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Session, Role } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "bastion-dev-secret-change-in-production-min-32-chars!!"
);

const SESSION_COOKIE = "bastion_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Session["role"],
    };
  } catch {
    return null;
  }
}

/**
 * Session + live account state (active flag, account lifetime/expiry, current
 * role from DB — so suspending a user or changing their role takes effect
 * immediately, not at JWT expiry). Use this in API routes/layouts.
 */
export async function getActor(): Promise<(Session & { quota: unknown; expiresAt: string | null; cdnPackage: string }) | null> {
  const session = await getSession();
  if (!session) return null;
  const { getUserById } = await import("./db");
  const user = await getUserById(session.userId).catch(() => null);
  if (!user || !user.active) return null;
  if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) return null;
  return { ...session, role: user.role as Role, quota: user.quota, expiresAt: user.expiresAt, cdnPackage: user.cdnPackage };
}

export const roleLevel = (role: string): number =>
  ({ user: 0, moderator: 1, admin: 2, superadmin: 3 } as Record<string, number>)[role] ?? 0;

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function verifyApiKey(apiKey: string): Promise<Session | null> {
  // API key verification against stored keys
  // This is a placeholder — in production, check against a database
  if (!apiKey.startsWith("bastion_")) return null;

  try {
    const { payload } = await jwtVerify(apiKey, JWT_SECRET);
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Session["role"],
    };
  } catch {
    return null;
  }
}

/**
 * Session + live account state (active flag, account lifetime/expiry, current
 * role from DB — so suspending a user or changing their role takes effect
 * immediately, not at JWT expiry). Use this in API routes/layouts.
 */
