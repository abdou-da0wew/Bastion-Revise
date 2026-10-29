"use client";

import { useState } from "react";
import { AsciiCardSkeleton } from "@/components/ui/ascii";
import Link from "next/link";
import {
  FileIcon,
  ImageIcon,
  FileText,
  Code,
  Film,
  FileArchive,
  Music,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Settings2,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FileRecord, FileStatus } from "@/lib/types";

const statusVariant: Record<FileStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  disabled: "secondary",
  pending: "outline",
};

const statusColors: Record<FileStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  disabled: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

function getFileIcon(mimeType: string, extension: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("7z"))
    return FileArchive;
  if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("xml") || mimeType.includes("css"))
    return Code;
  if (mimeType.startsWith("text/")) return FileText;
  if (extension === ".wasm") return Code;
  return FileIcon;
}

interface FileCardProps {
  file: FileRecord;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopyUrl?: (url: string) => void;
}

export function FileCard({ file, onToggleStatus, onDelete, onCopyUrl }: FileCardProps) {
  const [copied, setCopied] = useState(false);

  const Icon = getFileIcon(file.mimeType, file.extension);

  const handleCopyUrl = () => {
    if (onCopyUrl) {
      onCopyUrl(file.url);
    } else {
      navigator.clipboard.writeText(file.url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/files/${file.id}`}
            className="font-medium truncate hover:underline"
          >
            {file.originalName}
          </Link>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {file.extension}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{formatBytes(file.sizeBytes)}</span>
          <span className="hidden sm:inline">&middot;</span>
          <span className="hidden sm:inline">{formatDate(file.createdAt)}</span>
          <span>&middot;</span>
          <span>{file.downloads} downloads</span>
        </div>
      </div>

      {/* Status badge */}
      <Badge
        variant={statusVariant[file.status]}
        className={cn("hidden sm:inline-flex", statusColors[file.status])}
      >
        {file.status}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopyUrl}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy URL</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                render={<a href={file.url} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open URL</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
           <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href={`/dashboard/files/${file.id}`} />}>
              <Settings2 className="mr-2 h-4 w-4" />
              Edit Config
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus?.(file.id)}>
              {file.status === "active" ? (
                <>
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  Disable File
                </>
              ) : (
                <>
                  <ToggleRight className="mr-2 h-4 w-4" />
                  Enable File
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(file.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function FileCardSkeleton() {
  return <AsciiCardSkeleton seed={9} />;
}
