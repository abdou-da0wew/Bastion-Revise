import mongoose, { Schema, Document } from "mongoose";

export interface ICDNConfig {
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

export interface IFile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  extension: string;
  url: string;
  cdn?: { package: string; version: string; filename: string; publicUrl: string } | null;
  status: "active" | "disabled" | "pending";
  downloads: number;
  config: ICDNConfig;
  createdAt: Date;
  updatedAt: Date;
}

const CDNConfigSchema = new Schema<ICDNConfig>(
  {
    allowedDomains: { type: [String], default: [] },
    blockedDomains: { type: [String], default: [] },
    allowedUserAgents: { type: [String], default: [] },
    blockedUserAgents: { type: [String], default: [] },
    allowedIPs: { type: [String], default: [] },
    blockedIPs: { type: [String], default: [] },
    maxRequestsPerDay: { type: Number, default: 10000 },
    maxRequestsPerHour: { type: Number, default: 1000 },
    maxRequestsPerMinute: { type: Number, default: 100 },
    requireAuth: { type: Boolean, default: false },
    requireApiKey: { type: Boolean, default: false },
    refererCheck: { type: Boolean, default: false },
    corsEnabled: { type: Boolean, default: true },
    cacheTTL: { type: Number, default: 86400 },
    hotlinkProtection: { type: Boolean, default: false },
  },
  { _id: false }
);

const FileSchema = new Schema<IFile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    hash: { type: String, required: true, index: true },
    extension: { type: String, required: true },
    url: { type: String, required: true },
    cdn: {
      type: new Schema(
        {
          package: { type: String, required: true },
          version: { type: String, required: true },
          filename: { type: String, required: true },
          publicUrl: { type: String, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    status: { type: String, enum: ["active", "disabled", "pending"], default: "active", index: true },
    downloads: { type: Number, default: 0 },
    config: { type: CDNConfigSchema, default: () => ({}) },
  },
  { timestamps: true }
);

FileSchema.index({ userId: 1, createdAt: -1 });

export const File = mongoose.models.File || mongoose.model<IFile>("File", FileSchema);
