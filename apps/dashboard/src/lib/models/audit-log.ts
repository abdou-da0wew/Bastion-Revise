import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
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
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    traceId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    actorIp: { type: String, required: true },
    fileId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    success: { type: Boolean, required: true, index: true },
    errorCode: { type: String },
    durationMs: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ fileId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
