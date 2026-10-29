import { writeFile, mkdir, unlink, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { FileRecord } from "./types";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data", "uploads");
const BASE_URL = process.env.NEXT_PUBLIC_BASTION_URL || "http://localhost:3000";

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function getFilePath(fileId: string, extension: string): string {
  // Split into subdirectories to avoid too many files in one dir
  const prefix = fileId.slice(0, 2);
  const subdir = fileId.slice(2, 4);
  return join(UPLOAD_DIR, prefix, subdir, `${fileId}${extension}`);
}

function getPublicUrl(fileId: string, originalName: string): string {
  return `${BASE_URL}/cdn/${fileId}/${encodeURIComponent(originalName)}`;
}

export async function storeFile(
  fileId: string,
  buffer: Buffer,
  extension: string
): Promise<void> {
  const filePath = getFilePath(fileId, extension);
  await ensureDir(join(filePath, ".."));
  await writeFile(filePath, buffer);
}

export async function readFile(
  fileId: string,
  extension: string
): Promise<Buffer | null> {
  try {
    const filePath = getFilePath(fileId, extension);
    const { readFile: rf } = await import("node:fs/promises");
    return await rf(filePath);
  } catch {
    return null;
  }
}

export async function deleteFile(fileId: string, extension: string): Promise<boolean> {
  try {
    const filePath = getFilePath(fileId, extension);
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function fileExists(fileId: string, extension: string): Promise<boolean> {
  const filePath = getFilePath(fileId, extension);
  return existsSync(filePath);
}

export function buildFileRecord(params: {
  id: string;
  userId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  extension: string;
}): FileRecord {
  const hash = createHash("sha256").update(params.buffer).digest("hex");
  const url = getPublicUrl(params.id, params.originalName);

  return {
    id: params.id,
    userId: params.userId,
    name: `${params.id}${params.extension}`,
    originalName: params.originalName,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.length,
    hash,
    extension: params.extension,
    url,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloads: 0,
    config: {
      allowedDomains: [],
      blockedDomains: [],
      allowedUserAgents: [],
      blockedUserAgents: [],
      allowedIPs: [],
      blockedIPs: [],
      maxRequestsPerDay: 10000,
      maxRequestsPerHour: 1000,
      maxRequestsPerMinute: 100,
      requireAuth: false,
      requireApiKey: false,
      refererCheck: false,
      corsEnabled: true,
      cacheTTL: 86400,
      hotlinkProtection: false,
    },
  };
}

export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalBytes: number;
}> {
  let totalFiles = 0;
  let totalBytes = 0;

  async function walkDir(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          totalFiles++;
          const { stat } = await import("node:fs/promises");
          const stats = await stat(fullPath);
          totalBytes += stats.size;
        }
      }
    } catch {
      // directory doesn't exist yet
    }
  }

  await walkDir(UPLOAD_DIR);
  return { totalFiles, totalBytes };
}
