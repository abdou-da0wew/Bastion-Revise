import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "user" | "moderator" | "admin" | "superadmin";
  apiKey: string;
  quota: {
    maxFiles: number;
    maxStorageBytes: number;
    maxRequestsPerDay: number;
  };
  active: boolean;
  expiresAt: Date | null;
  lastLoginAt: Date | null;
  cdnPackage: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "moderator", "admin", "superadmin"], default: "user", index: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    quota: {
      maxFiles: { type: Number, default: 1000 },
      maxStorageBytes: { type: Number, default: 500 * 1024 * 1024 },
      maxRequestsPerDay: { type: Number, default: 10000 },
    },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    cdnPackage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
