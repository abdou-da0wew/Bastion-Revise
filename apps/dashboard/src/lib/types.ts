export type Role = "user" | "moderator" | "admin" | "superadmin";
/** 3 admin levels above plain users: moderator(1) < admin(2) < superadmin(3). */
export const ROLE_LEVEL: Record<Role, number> = { user: 0, moderator: 1, admin: 2, superadmin: 3 };
export const isRole = (v: unknown): v is Role => v === "user" || v === "moderator" || v === "admin" || v === "superadmin";

export type FileStatus = "active" | "disabled" | "pending";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  apiKey: string;
  active: boolean;
  /** Account lifetime: null = never expires. Enforced at login + per-request. */
  expiresAt: string | null;
  lastLoginAt: string | null;
  /** CDN registry namespace owned by this user (e.g. u-64f1a2b3c4d5). */
  cdnPackage: string;
  createdAt: string;
  updatedAt: string;
  quota: {
    maxFiles: number;
    maxStorageBytes: number;
    maxRequestsPerDay: number;
  };
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface FileRecord {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  extension: string;
  url: string;
  /** Bastion CDN core coordinates; null for legacy local-storage files. */
  cdn?: { package: string; version: string; filename: string; publicUrl: string } | null;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  config: CDNConfig;
}

export interface CDNConfig {
  allowedDomains: string[];
  blockedDomains: string[];
  allowedUserAgents: string[];
  blockedUserAgents: string[];
  allowedIPs: string[];
  blockedIPs: string[];
  maxRequestsPerDay: number;
  maxRequestsPerHour: number;
  maxRequestsPerMinute: number;
  requireAuth: boolean;
  requireApiKey: boolean;
  refererCheck: boolean;
  corsEnabled: boolean;
  cacheTTL: number;
  hotlinkProtection: boolean;
}

export interface AccessRule {
  id: string;
  fileId: string;
  type: "allow" | "block" | "rate_limit";
  field: "domain" | "user_agent" | "ip" | "country" | "method";
  value: string;
  priority: number;
}

export interface AuditLog {
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

export interface AnalyticsEvent {
  id: string;
  fileId: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  referer: string;
  country?: string;
  duration: number;
  status: number;
  bytes: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
