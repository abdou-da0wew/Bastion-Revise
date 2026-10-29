export const BASTION = {
  name: "Bastion",
  tagline: "Fortified file delivery.",
  description: "Secure, fast, and fully audited CDN for your assets.",
  url: process.env.NEXT_PUBLIC_BASTION_URL || "http://localhost:3000",
} as const;

export const LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB (Bastion CDN core cap)
  maxStoragePerUser: 500 * 1024 * 1024, // 500MB
  maxFilesPerUser: 1000,
  maxRequestsPerDay: 10000,
  maxRequestsPerHour: 1000,
  maxRequestsPerMinute: 100,
  uploadTimeout: 30000,
  cacheTTL: 86400, // 24 hours
} as const;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/json",
  "application/xml",
  "text/plain",
  "text/csv",
  "font/woff",
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/wasm",
] as const;

/** Secrets can never be published; executables/scripts/archives ARE allowed via the CDN registry. */
export const BLOCKED_EXTENSIONS = [
  ".env", ".pem", ".key", ".p12", ".pfx", ".cer", ".der", ".lnk", ".inf", ".reg",
] as const;
/** Extensions accepted for dashboard uploads (mirrors the CDN package allowlist). */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".css", ".js", ".mjs", ".json", ".txt", ".md", ".csv", ".xml", ".html", ".wasm",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".mov", ".pdf", ".woff", ".woff2", ".ttf", ".otf",
  ".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".appimage", ".apk", ".ipa", ".bin", ".run", ".jar", ".dll", ".so", ".dylib",
  ".sh", ".bash", ".ps1", ".bat", ".cmd", ".py", ".rb", ".pl", ".ts",
  ".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z",
] as const;

export const BLOCKED_MAGIC_BYTES: Array<{ bytes: number[]; offset: number; name: string }> = [
  { bytes: [0x7F, 0x45, 0x4C, 0x46], offset: 0, name: "ELF" },
  { bytes: [0x4D, 0x5A], offset: 0, name: "PE (exe/dll)" },
  { bytes: [0x23, 0x21], offset: 0, name: "Shebang script" },
  { bytes: [0xCA, 0xFE, 0xBA, 0xBE], offset: 0, name: "Java class" },
  { bytes: [0xCF, 0xFA, 0xED, 0xFE], offset: 0, name: "Mach-O" },
  { bytes: [0xCE, 0xFA, 0xED, 0xFE], offset: 0, name: "Mach-O reverse" },
  { bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0, name: "ZIP/PK" },
  { bytes: [0x1F, 0x8B], offset: 0, name: "GZIP" },
  { bytes: [0x52, 0x61, 0x72, 0x21], offset: 0, name: "RAR" },
  { bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], offset: 0, name: "7z" },
  { bytes: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257, name: "TAR" },
];

export const ROLES = {
  USER: "user" as const,
  MODERATOR: "moderator" as const,
  ADMIN: "admin" as const,
  SUPERADMIN: "superadmin" as const,
} as const;
export const ADMIN_ROLES = ["moderator", "admin", "superadmin"] as const;

export const FILE_STATUS = {
  ACTIVE: "active" as const,
  DISABLED: "disabled" as const,
  PENDING: "pending" as const,
};

export const ERROR_CODES = {
  UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  FORBIDDEN: "AUTH_FORBIDDEN",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  USER_EXISTS: "AUTH_USER_EXISTS",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TYPE_BLOCKED: "FILE_TYPE_BLOCKED",
  FILE_MALICIOUS: "FILE_MALICIOUS",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  DOMAIN_BLOCKED: "DOMAIN_BLOCKED",
  USER_AGENT_BLOCKED: "USER_AGENT_BLOCKED",
  IP_BLOCKED: "IP_BLOCKED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export const AUDIT_ACTIONS = {
  USER_LOGIN: "user.login",
  USER_REGISTER: "user.register",
  USER_LOGOUT: "user.logout",
  FILE_UPLOAD: "file.upload",
  FILE_DELETE: "file.delete",
  FILE_UPDATE: "file.update",
  FILE_ACCESS: "file.access",
  CONFIG_UPDATE: "config.update",
  ADMIN_ACTION: "admin.action",
  API_KEY_CREATE: "api_key.create",
  API_KEY_REVOKE: "api_key.revoke",
} as const;
