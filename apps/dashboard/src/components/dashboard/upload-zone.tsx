"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, FileIcon, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ALLOWED_MIME_TYPES, BLOCKED_EXTENSIONS, LIMITS } from "@/lib/constants";

interface UploadZoneProps {
  onUpload?: (file: File) => Promise<void>;
}

interface UploadState {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

const allowedExtensions = ALLOWED_MIME_TYPES.map((t) => t.split("/").pop());

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext as typeof BLOCKED_EXTENSIONS[number])) {
      return `File type "${ext}" is not allowed.`;
    }
    if (file.size > LIMITS.maxFileSize) {
      return `File is too large. Maximum size is ${(LIMITS.maxFileSize / 1024 / 1024).toFixed(0)}MB.`;
    }
    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newUploads: UploadState[] = [];
      for (const file of Array.from(files)) {
        const error = validateFile(file);
        if (error) {
          newUploads.push({ file, progress: 0, status: "error", error });
        } else {
          newUploads.push({ file, progress: 0, status: "uploading" });
        }
      }
      setUploads((prev) => [...prev, ...newUploads]);

      for (let i = 0; i < newUploads.length; i++) {
        const state = newUploads[i];
        if (state.status === "error") continue;

        try {
          // Simulate progress
          let progress = 0;
          const interval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 30, 90);
            setUploads((prev) =>
              prev.map((u) =>
                u.file === state.file ? { ...u, progress } : u
              )
            );
          }, 200);

          if (onUpload) {
            await onUpload(state.file);
          } else {
            // Simulate upload
            await new Promise((r) => setTimeout(r, 1500));
          }

          clearInterval(interval);
          setUploads((prev) =>
            prev.map((u) =>
              u.file === state.file ? { ...u, progress: 100, status: "success" } : u
            )
          );
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === state.file
                ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
                : u
            )
          );
        }
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeUpload = (file: File) => {
    setUploads((prev) => prev.filter((u) => u.file !== file));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 hover:bg-accent/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">
          {dragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse &mdash; max {(LIMITS.maxFileSize / 1024 / 1024).toFixed(0)}MB per file
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {allowedExtensions.slice(0, 8).map((ext) => (
            <span
              key={ext}
              className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              .{ext}
            </span>
          ))}
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            +{allowedExtensions.length - 8} more
          </span>
        </div>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((state) => (
            <div
              key={state.file.name + state.file.size}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                state.status === "error" && "border-destructive/50 bg-destructive/5",
                state.status === "success" && "border-emerald-500/50 bg-emerald-500/5"
              )}
            >
              {state.status === "uploading" && (
                <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              {state.status === "success" && (
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              )}
              {state.status === "error" && (
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {state.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {state.status === "uploading" && "Uploading..."}
                  {state.status === "success" && "Upload complete"}
                  {state.status === "error" && state.error}
                </p>
                {state.status === "uploading" && (
                  <Progress value={state.progress} className="mt-1 h-1" />
                )}
              </div>

              <button
                onClick={() => removeUpload(state.file)}
                className="shrink-0 rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
