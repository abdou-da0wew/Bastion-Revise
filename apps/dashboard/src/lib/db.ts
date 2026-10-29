import { connectDB } from "./mongodb";
import { User, type IUser } from "./models/user";
import { File, type IFile, type ICDNConfig } from "./models/file";
import { AuditLog, type IAuditLog } from "./models/audit-log";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterQuery<T> = Record<string, any>;

// ── Connection ──

let connected = false;

async function ensureConnected() {
  if (!connected) {
    await connectDB();
    connected = true;
  }
}

// ── User Operations ──

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  role?: "user" | "moderator" | "admin" | "superadmin";
  apiKey: string;
  quota?: { maxFiles: number; maxStorageBytes: number; maxRequestsPerDay: number };
  expiresAt?: Date | null;
}) {
  await ensureConnected();
  const user = await User.create({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role || "user",
    apiKey: data.apiKey,
    ...(data.quota ? { quota: data.quota } : {}),
    ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
  });
  if (!user.cdnPackage) {
    user.cdnPackage = `u-${user._id.toString().slice(0, 12)}`;
    await user.save();
  }
  return sanitizeUser(user);
}

export async function countAllUsers() {
  await ensureConnected();
  return User.countDocuments();
}

export async function getUserById(id: string) {
  await ensureConnected();
  const user = await User.findById(id);
  return user ? sanitizeUser(user) : null;
}

export async function getUserByEmail(email: string) {
  await ensureConnected();
  const user = await User.findOne({ email: email.toLowerCase() });
  return user ? sanitizeUser(user) : null;
}

export async function getUserByApiKey(apiKey: string) {
  await ensureConnected();
  const user = await User.findOne({ apiKey, active: true });
  if (user && user.expiresAt && user.expiresAt.getTime() < Date.now()) return null;
  return user ? sanitizeUser(user) : null;
}

export async function getUsers(params?: { page?: number; pageSize?: number }) {
  await ensureConnected();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    User.countDocuments(),
  ]);

  return {
    data: users.map(sanitizeUser),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateUser(
  id: string,
  updates: Partial<{
    name: string;
    role: "user" | "moderator" | "admin" | "superadmin";
    active: boolean;
    passwordHash: string;
    apiKey: string;
    expiresAt: Date | null;
    lastLoginAt: Date | null;
    quota: Partial<{ maxFiles: number; maxStorageBytes: number; maxRequestsPerDay: number }>;
  }>
) {
  await ensureConnected();
  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
  return user ? sanitizeUser(user) : null;
}

export async function deleteUser(id: string) {
  await ensureConnected();
  await File.deleteMany({ userId: id });
  await User.findByIdAndDelete(id);
}

export async function countUsers() {
  await ensureConnected();
  return User.countDocuments({ active: true });
}

function sanitizeUser(user: IUser | Record<string, any>) {
  const doc = "toObject" in user ? user.toObject() : user;
  const { passwordHash, ...safe } = doc;
  return {
    id: safe._id.toString(),
    email: safe.email,
    name: safe.name,
    role: safe.role,
    apiKey: safe.apiKey,
    quota: safe.quota,
    active: safe.active !== false,
    expiresAt: safe.expiresAt ? new Date(safe.expiresAt).toISOString() : null,
    lastLoginAt: safe.lastLoginAt ? new Date(safe.lastLoginAt).toISOString() : null,
    cdnPackage: safe.cdnPackage || `u-${safe._id.toString().slice(0, 12)}`,
    createdAt: safe.createdAt?.toISOString?.() || safe.createdAt,
    updatedAt: safe.updatedAt?.toISOString?.() || safe.updatedAt,
  };
}

// ── File Operations ──

export async function createFile(data: {
  userId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  extension: string;
  url: string;
  cdn?: { package: string; version: string; filename: string; publicUrl: string } | null;
  config?: Partial<ICDNConfig>;
}) {
  await ensureConnected();
  const file = await File.create({
    userId: data.userId,
    name: data.name,
    originalName: data.originalName,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    hash: data.hash,
    extension: data.extension,
    url: data.url,
    cdn: data.cdn ?? null,
    config: data.config || {},
  });
  return sanitizeFile(file);
}

export async function getFilesByUser(
  userId: string,
  params?: { page?: number; pageSize?: number; search?: string; sort?: string; order?: "asc" | "desc" }
) {
  await ensureConnected();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const skip = (page - 1) * pageSize;
  const sortField = params?.sort || "createdAt";
  const sortOrder = params?.order === "asc" ? 1 : -1;

  const filter: FilterQuery<IFile> = { userId };
  if (params?.search) {
    filter.originalName = { $regex: params.search, $options: "i" };
  }

  const [files, total] = await Promise.all([
    File.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    File.countDocuments(filter),
  ]);

  return {
    data: files.map(sanitizeFile),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAllFiles(params?: { page?: number; pageSize?: number }) {
  await ensureConnected();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const [files, total] = await Promise.all([
    File.find().sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    File.countDocuments(),
  ]);

  return {
    data: files.map(sanitizeFile),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getFileById(id: string) {
  await ensureConnected();
  const file = await File.findById(id).lean();
  return file ? sanitizeFile(file) : null;
}

export async function getFilesByHash(hash: string) {
  await ensureConnected();
  const files = await File.find({ hash }).lean();
  return files.map(sanitizeFile);
}

export async function updateFile(
  id: string,
  updates: Partial<{
    status: "active" | "disabled" | "pending";
    config: Partial<ICDNConfig>;
    originalName: string;
  }>
) {
  await ensureConnected();
  const setData: Record<string, any> = {};
  if (updates.status) setData.status = updates.status;
  if (updates.originalName) setData.originalName = updates.originalName;
  if (updates.config) {
    for (const [key, value] of Object.entries(updates.config)) {
      setData[`config.${key}`] = value;
    }
  }

  const file = await File.findByIdAndUpdate(id, { $set: setData }, { new: true }).lean();
  return file ? sanitizeFile(file) : null;
}

export async function incrementFileDownloads(id: string) {
  await ensureConnected();
  await File.findByIdAndUpdate(id, { $inc: { downloads: 1 } });
}

export async function deleteFileRecord(id: string) {
  await ensureConnected();
  await File.findByIdAndDelete(id);
}

export async function countFiles(userId?: string) {
  await ensureConnected();
  const filter = userId ? { userId } : {};
  return File.countDocuments(filter);
}

export async function getStorageTotal(userId?: string) {
  await ensureConnected();
  const match = userId ? { $match: { userId: new (await import("mongoose")).Types.ObjectId(userId) } } : { $match: {} };
  const result = await File.aggregate([
    match,
    { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
  ]);
  return result[0]?.total || 0;
}

export async function getTotalDownloads(userId?: string) {
  await ensureConnected();
  const match = userId ? { $match: { userId: new (await import("mongoose")).Types.ObjectId(userId) } } : { $match: {} };
  const result = await File.aggregate([
    match,
    { $group: { _id: null, total: { $sum: "$downloads" } } },
  ]);
  return result[0]?.total || 0;
}

function sanitizeFile(file: Record<string, any>) {
  return {
    id: file._id.toString(),
    userId: typeof file.userId === "object" ? file.userId.toString() : file.userId,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    hash: file.hash,
    extension: file.extension,
    url: file.url,
    cdn: file.cdn ?? null,
    status: file.status,
    downloads: file.downloads || 0,
    config: file.config || {},
    createdAt: file.createdAt?.toISOString?.() || file.createdAt,
    updatedAt: file.updatedAt?.toISOString?.() || file.updatedAt,
  };
}

// ── Audit Log Operations ──

export async function createAuditLog(data: {
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
}) {
  await ensureConnected();
  const log = await AuditLog.create(data);
  return sanitizeAuditLog(log);
}

export async function queryAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  actorId?: string;
  fileId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  await ensureConnected();
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const skip = (page - 1) * pageSize;

  const filter: FilterQuery<IAuditLog> = {};
  if (params.action) filter.action = { $regex: params.action, $options: "i" };
  if (params.actorId) filter.actorId = params.actorId;
  if (params.fileId) filter.fileId = params.fileId;
  if (params.success !== undefined) filter.success = params.success;
  if (params.startDate || params.endDate) {
    filter.createdAt = {};
    if (params.startDate) filter.createdAt.$gte = new Date(params.startDate);
    if (params.endDate) filter.createdAt.$lte = new Date(params.endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs: logs.map(sanitizeAuditLog),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

function sanitizeAuditLog(log: Record<string, any>) {
  return {
    id: log._id.toString(),
    traceId: log.traceId,
    timestamp: log.createdAt?.toISOString?.() || log.createdAt,
    action: log.action,
    actorId: log.actorId,
    actorEmail: log.actorEmail,
    actorIp: log.actorIp,
    fileId: log.fileId,
    metadata: log.metadata,
    success: log.success,
    errorCode: log.errorCode,
    durationMs: log.durationMs,
  };
}
