import { randomUUID } from "node:crypto";

// In-memory buffer for quick recent-log queries
// All logs are persisted to MongoDB via db.ts
let recentLogs: AuditLogEntry[] = [];
const MAX_RECENT = 500;

export interface AuditLogEntry {
  id: string;
  traceId: string;
  timestamp: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorIp: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  durationMs: number;
}

export function createTraceId(): string {
  return randomUUID();
}

export function makeAuditEntry(params: {
  traceId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorIp: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  durationMs: number;
}): AuditLogEntry {
  return {
    id: randomUUID(),
    traceId: params.traceId,
    timestamp: new Date().toISOString(),
    action: params.action,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorIp: params.actorIp,
    fileId: params.fileId,
    metadata: params.metadata,
    success: params.success,
    errorCode: params.errorCode,
    durationMs: params.durationMs,
  };
}

export function pushRecent(entry: AuditLogEntry): void {
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_RECENT) {
    recentLogs.pop();
  }
}

export function getRecentLogs(limit = 50): AuditLogEntry[] {
  return recentLogs.slice(0, limit);
}

/** Convenience: create entry, push to buffer, and persist to MongoDB. */
import { createAuditLog } from "./db";

export async function writeAuditLog(params: {
  traceId: string;
  action: string;
  actorId: string;
  actorEmail: string;
  actorIp: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  durationMs: number;
}): Promise<void> {
  const entry = makeAuditEntry(params);
  pushRecent(entry);
  // Fire-and-forget to MongoDB — don't block response
  createAuditLog(params).catch(() => {});
}
