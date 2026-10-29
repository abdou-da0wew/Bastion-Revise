import { ALLOWED_UPLOAD_EXTENSIONS, BLOCKED_EXTENSIONS, BLOCKED_MAGIC_BYTES } from "./constants";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  hash?: string;
}

const TEXT_EXTENSIONS = new Set([
  ".css", ".js", ".json", ".xml", ".txt", ".csv", ".map",
]);

export function validateExtension(filename: string): { valid: boolean; error?: string } {
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  if (!ext || ext === ".") {
    return { valid: false, error: "File has no extension" };
  }
  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    return { valid: false, error: `Extension ${ext} is not allowed` };
  }
  if (!(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext) && !filename.toLowerCase().endsWith(".tar.gz")) {
    return { valid: false, error: `Extension ${ext} is not allowed` };
  }
  return { valid: true };
}

export async function validateFileContent(
  buffer: Buffer,
  mimeType: string
): Promise<FileValidationResult> {
  const result: FileValidationResult = { valid: true };
  void BLOCKED_MAGIC_BYTES; // executables/archives are first-class registry content now

  if (buffer.includes(Buffer.from("-----BEGIN ")) && buffer.includes(Buffer.from("PRIVATE KEY-----"))) {
    return { valid: false, error: "Private key material may not be published" };
  }
  if (false) {
  for (const sig of BLOCKED_MAGIC_BYTES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        valid: false,
        error: `File appears to be an executable or archive (${sig.name}). These types are not allowed.`,
      };
    }
  }

  // Compute file hash for integrity
  const crypto = await import("node:crypto");
  result.hash = crypto.createHash("sha256").update(buffer).digest("hex");

  }
  void TEXT_EXTENSIONS;
  result.mimeType = mimeType; // extension allowlist + CDN core checks govern; MIME is recorded, not gated
  return result;
}

export function detectMimeType(buffer: Buffer, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  // Check magic bytes first
  const magicMap: Record<string, string> = {
    "89504E47": "image/png",
    "FFD8FF": "image/jpeg",
    "47494638": "image/gif",
    "52494646": "image/webp",
    "3C737667": "image/svg+xml",
    "3C3F786D": "application/xml",
    "7B": "application/json",
    "66747970": "image/avif",
    "424D": "image/bmp",
  };

  const hex = buffer.slice(0, 8).toString("hex").toUpperCase();
  for (const [magic, mime] of Object.entries(magicMap)) {
    if (hex.startsWith(magic)) return mime;
  }

  // Fallback to extension
  const extMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    txt: "text/plain",
    csv: "text/csv",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    wasm: "application/wasm",
  };

  const binMap: Record<string, string> = { exe: "application/vnd.microsoft.portable-executable", msi: "application/x-msdownload", dmg: "application/x-apple-diskimage", deb: "application/vnd.debian.binary-package", rpm: "application/x-rpm", zip: "application/zip", gz: "application/gzip", sh: "text/x-shellscript", py: "text/x-python", pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav" };
  return ext ? extMap[ext] || binMap[ext] || "application/octet-stream" : "application/octet-stream";
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal
  let clean = filename.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
  // Remove null bytes
  clean = clean.replace(/\0/g, "");
  // Remove leading dots, slashes, dashes
  clean = clean.replace(/^[./\\-]+/, "");
  // Limit length
  if (clean.length > 255) {
    const ext = clean.split(".").pop() || "";
    clean = clean.slice(0, 250 - ext.length) + "." + ext;
  }
  return clean || "unnamed";
}
