import { type NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth";
import { getUserById, createFile, createAuditLog, countFiles, getStorageTotal } from "@/lib/db";
import { buildFileRecord } from "@/lib/storage";
import { cdnUpload, CDN_PUBLIC_URL } from "@/lib/cdn";
import { validateExtension, validateFileContent, detectMimeType, sanitizeFilename } from "@/lib/security";
import { createTraceId } from "@/lib/audit";
import { generateId } from "@/lib/utils";
import { ERROR_CODES, AUDIT_ACTIONS, LIMITS } from "@/lib/constants";
import type { ApiResponse, CDNConfig, FileStatus } from "@/lib/types";

function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, init);
}

function err(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status }
  );
}

const CDN_CONFIG_FIELDS: (keyof CDNConfig)[] = [
  "allowedDomains", "blockedDomains", "allowedUserAgents", "blockedUserAgents",
  "allowedIPs", "blockedIPs", "maxRequestsPerDay", "maxRequestsPerHour",
  "maxRequestsPerMinute", "requireAuth", "requireApiKey", "refererCheck",
  "corsEnabled", "cacheTTL", "hotlinkProtection",
];

function parseOptionalConfig(raw: string | null): Partial<CDNConfig> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    const config: Partial<CDNConfig> = {};
    for (const field of CDN_CONFIG_FIELDS) {
      if (parsed[field] !== undefined) {
        (config as any)[field] = parsed[field];
      }
    }
    return Object.keys(config).length > 0 ? config : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const start = performance.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  try {
    const session = await getActor();
    if (!session) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication required", 401);
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return err(ERROR_CODES.UNAUTHORIZED, "User not found", 401);
    }

    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField || !(fileField instanceof File)) {
      return err(ERROR_CODES.VALIDATION_ERROR, "A file is required", 400);
    }

    const uploadedFile = fileField as File;
    const originalName = sanitizeFilename(uploadedFile.name);

    const extCheck = validateExtension(originalName);
    if (!extCheck.valid) {
      return err(ERROR_CODES.FILE_TYPE_BLOCKED, extCheck.error || "File extension not allowed", 400);
    }

    if (uploadedFile.size > LIMITS.maxFileSize) {
      return err(
        ERROR_CODES.FILE_TOO_LARGE,
        `File exceeds maximum size of ${LIMITS.maxFileSize / 1024 / 1024}MB`,
        413
      );
    }
    const versionRaw = (formData.get("version") as string | null)?.trim() || "1.0.0";
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/.test(versionRaw) || versionRaw === "latest") {
      return err(ERROR_CODES.VALIDATION_ERROR, "Invalid version (use e.g. 1.2.3 — 'latest' is reserved)", 400);
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    const detectedMime = detectMimeType(buffer, originalName);

    const contentCheck = await validateFileContent(buffer, detectedMime);
    if (!contentCheck.valid) {
      return err(ERROR_CODES.FILE_MALICIOUS, contentCheck.error || "File content validation failed", 400);
    }

    const [fileCount, storageUsed] = await Promise.all([
      countFiles(user.id),
      getStorageTotal(user.id),
    ]);

    if (fileCount >= user.quota.maxFiles) {
      return err(ERROR_CODES.QUOTA_EXCEEDED, `Maximum of ${user.quota.maxFiles} files reached`, 429);
    }

    if (storageUsed + buffer.length > user.quota.maxStorageBytes) {
      return err(
        ERROR_CODES.QUOTA_EXCEEDED,
        `Storage quota of ${(user.quota.maxStorageBytes / 1024 / 1024).toFixed(0)}MB exceeded`,
        429
      );
    }

    const fileId = generateId();
    const extension = "." + (originalName.split(".").pop()?.toLowerCase() || "bin");
    const mimeType = contentCheck.mimeType || detectedMime;

    // Publish the bytes to the Bastion CDN core registry under the user's namespace.
    const pkg = user.cdnPackage || `u-${user.id.slice(0, 12)}`;
    const uploaded = await cdnUpload(pkg, versionRaw, originalName, buffer);

    const record = buildFileRecord({
      id: fileId,
      userId: user.id,
      buffer,
      originalName,
      mimeType,
      extension,
    });
    record.url = `${process.env.NEXT_PUBLIC_BASTION_URL || ""}/cdn/${fileId}/${encodeURIComponent(originalName)}`;

    const configOverride = parseOptionalConfig(formData.get("config") as string | null);
    if (configOverride) {
      Object.assign(record.config, configOverride);
    }

    const statusRaw = formData.get("status") as string | null;
    if (statusRaw && ["active", "disabled", "pending"].includes(statusRaw)) {
      record.status = statusRaw as FileStatus;
    }

    const created = await createFile({
      userId: user.id,
      name: record.name,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: uploaded.size,
      hash: uploaded.sha256,
      extension: record.extension,
      url: record.url,
      cdn: { package: pkg, version: versionRaw, filename: originalName, publicUrl: uploaded.url },
      config: record.config,
    });

    const duration = Math.round(performance.now() - start);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_UPLOAD,
      actorId: user.id,
      actorEmail: user.email,
      actorIp: ip,
      fileId: created.id,
      metadata: {
        cdnUrl: created.cdn?.publicUrl,
        version: versionRaw,
        fileName: created.originalName,
        sizeBytes: created.sizeBytes,
        mimeType: created.mimeType,
      },
      success: true,
      durationMs: duration,
    });

    return ok({ file: created }, { status: 201 });
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.error("Upload error [traceId=%s]:", traceId, error);

    await createAuditLog({
      traceId,
      action: AUDIT_ACTIONS.FILE_UPLOAD,
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
