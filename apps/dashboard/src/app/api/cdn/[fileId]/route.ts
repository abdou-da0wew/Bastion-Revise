import { type NextRequest, NextResponse } from "next/server";
import { getFileById, incrementFileDownloads, createAuditLog } from "@/lib/db";
import { CDN_PUBLIC_URL } from "@/lib/cdn";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTraceId } from "@/lib/audit";
import { ERROR_CODES, AUDIT_ACTIONS, LIMITS } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function matchPattern(value: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.startsWith("*.")) {
    return value.endsWith(pattern.slice(1));
  }
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  return value === pattern;
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((p) => matchPattern(value, p));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";

  try {
    const { fileId } = await params;

    const file = await getFileById(fileId);
    if (!file) {
      const duration = Math.round(performance.now() - start);
      await createAuditLog({
        traceId,
        action: AUDIT_ACTIONS.FILE_ACCESS,
        actorId: "anonymous",
        actorEmail: "anonymous",
        actorIp: ip,
        fileId,
        success: false,
        errorCode: ERROR_CODES.FILE_NOT_FOUND,
        durationMs: duration,
      }).catch(() => {});
      return err(ERROR_CODES.FILE_NOT_FOUND, "File not found", 404);
    }

    if (file.status !== "active") {
      return err(ERROR_CODES.FILE_NOT_FOUND, "File not found", 404);
    }

    const cfg = file.config;

    // Per-IP rate limit (file-level)
    const rateKey = `cdn:${fileId}:${ip}`;
    const fileRateLimit = await checkRateLimit({
      key: rateKey,
      max: cfg.maxRequestsPerMinute || LIMITS.maxRequestsPerMinute,
      windowMs: 60_000,
    });
    if (!fileRateLimit.allowed) {
      return err(ERROR_CODES.RATE_LIMITED, "Rate limit exceeded. Try again later.", 429);
    }

    // Global per-IP rate limit
    const globalRateKey = `cdn:global:${ip}`;
    const globalRateLimit = await checkRateLimit({
      key: globalRateKey,
      max: LIMITS.maxRequestsPerDay,
      windowMs: 86_400_000,
    });
    if (!globalRateLimit.allowed) {
      return err(ERROR_CODES.RATE_LIMITED, "Global rate limit exceeded. Try again later.", 429);
    }

    // IP allow list — if any are specified, only those IPs are allowed
    if (cfg.allowedIPs.length > 0 && !matchesAny(ip, cfg.allowedIPs)) {
      return err(ERROR_CODES.IP_BLOCKED, "Access denied from this IP address", 403);
    }

    // IP block list
    if (cfg.blockedIPs.length > 0 && matchesAny(ip, cfg.blockedIPs)) {
      return err(ERROR_CODES.IP_BLOCKED, "Access denied from this IP address", 403);
    }

    // User-Agent allow list
    if (cfg.allowedUserAgents.length > 0 && !matchesAny(userAgent, cfg.allowedUserAgents)) {
      return err(ERROR_CODES.USER_AGENT_BLOCKED, "Access denied for this client", 403);
    }

    // User-Agent block list
    if (cfg.blockedUserAgents.length > 0 && matchesAny(userAgent, cfg.blockedUserAgents)) {
      return err(ERROR_CODES.USER_AGENT_BLOCKED, "Access denied for this client", 403);
    }

    // Referer check
    if (cfg.refererCheck) {
      if (!referer) {
        return err(
          ERROR_CODES.DOMAIN_BLOCKED,
          "Direct access is not allowed. This file must be accessed from an authorized website.",
          403
        );
      }
      try {
        const refererOrigin = new URL(referer).origin;

        if (cfg.allowedDomains.length > 0 && !matchesAny(refererOrigin, cfg.allowedDomains)) {
          return err(ERROR_CODES.DOMAIN_BLOCKED, "Access denied from this referrer", 403);
        }

        if (cfg.blockedDomains.length > 0 && matchesAny(refererOrigin, cfg.blockedDomains)) {
          return err(ERROR_CODES.DOMAIN_BLOCKED, "Access denied from this referrer", 403);
        }
      } catch {
        return err(ERROR_CODES.DOMAIN_BLOCKED, "Invalid referrer", 403);
      }
    }

    // Hotlink protection
    if (cfg.hotlinkProtection) {
      if (!referer) {
        return err(ERROR_CODES.DOMAIN_BLOCKED, "Direct hotlinking is disabled for this file", 403);
      }
      try {
        const refererOrigin = new URL(referer).origin;
        if (cfg.allowedDomains.length > 0 && !matchesAny(refererOrigin, cfg.allowedDomains)) {
          return err(ERROR_CODES.DOMAIN_BLOCKED, "Hotlinking from this domain is not allowed", 403);
        }
      } catch {
        return err(ERROR_CODES.DOMAIN_BLOCKED, "Invalid referrer for hotlink check", 403);
      }
    }

    // Conditional GET via ETag
    const etag = `"${file.hash}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    if (!file.cdn) {
      return err(ERROR_CODES.FILE_NOT_FOUND, "File is not published to the CDN core", 404);
    }
    // Fire-and-forget: increment download counter
    incrementFileDownloads(file.id).catch(() => {});

    const duration = Math.round(performance.now() - start);

    // Log access as audit event
    createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_ACCESS,
      actorId: "anonymous",
      actorEmail: "anonymous",
      actorIp: ip,
      fileId: file.id,
      metadata: {
        userAgent,
        referer,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        fileName: file.originalName,
      },
      success: true,
      durationMs: duration,
    }).catch(() => {});

    // Access rules + audit are enforced/logged here; bytes are streamed by the
    // Bastion CDN core (Range/compression/caching) via redirect. Note: anyone
    // who learns the direct /dl/ URL bypasses dashboard rules — use requireAuth
    // + unguessable names for sensitive files, or keep them off `latest`.
    const target = file.cdn.publicUrl || `${CDN_PUBLIC_URL}/dl/${file.cdn.package}/${file.cdn.version}/${encodeURIComponent(file.cdn.filename)}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        "Cache-Control": cfg.cacheTTL > 0 ? `private, max-age=${Math.min(cfg.cacheTTL, 300)}` : "no-cache",
        "X-Trace-Id": traceId,
        "X-Bastion-File": file.id,
      },
    });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("CDN serve error [traceId=%s]:", traceId, error);

    createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_ACCESS,
      actorId: "anonymous",
      actorEmail: "anonymous",
      actorIp: ip,
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      durationMs: duration,
    }).catch(() => {});

    return err(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred", 500);
  }
}
