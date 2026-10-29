"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileIcon,
  ImageIcon,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  Hash,
  Clock,
  Download,
  Shield,
  Globe,
  Ban,
  Key,
  Sliders,
  Cpu,
  RefreshCw,
  X,
} from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FileRecord } from "@/lib/types";

interface Props {
  file: FileRecord;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileIcon;
}

type TagInputProps = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
};

function TagInput({ label, items, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInput("");
    }
  };

  const remove = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground">None</span>
        )}
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1">
            <span className="font-mono text-xs">{item}</span>
            <button
              onClick={() => remove(item)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder || "Add value..."}
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={add} type="button">
          Add
        </Button>
      </div>
    </div>
  );
}

export function FileDetailClient({ file }: Props) {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState(file.config);
  const [saving, setSaving] = useState(false);

  const Icon = getFileIcon(file.mimeType);

  const copyUrl = () => {
    navigator.clipboard.writeText((file as { cdn?: { publicUrl: string } | null }).cdn?.publicUrl || file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config }),
    }).catch(() => undefined);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/files" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Files
        </Button>
      </div>

      {/* File info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-background">
                <Icon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">{file.originalName}</CardTitle>
                <CardDescription className="mt-1">
                  {file.mimeType} &middot; {file.extension}
                </CardDescription>
              </div>
            </div>
            <Badge
              className={
                file.status === "active"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }
            >
              {file.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Size", value: formatBytes(file.sizeBytes), icon: FileIcon },
              { label: "Hash", value: file.hash.slice(0, 16) + "...", icon: Hash },
              { label: "Downloads", value: file.downloads.toLocaleString(), icon: Download },
              { label: "Created", value: formatDate(file.createdAt), icon: Clock },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <ItemIcon className="h-3 w-3" />
                    {item.label}
                  </div>
                  <p className="text-sm font-medium truncate">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button variant="default" size="sm" onClick={copyUrl}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy URL"}
            </Button>
            <Button variant="outline" size="sm" render={<a href={file.url} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CDN Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            CDN Configuration
          </CardTitle>
          <CardDescription>
            Access rules and delivery settings for this file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Domain rules */}
          <div className="space-y-6">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domain Rules
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <TagInput
                label="Allowed Domains"
                items={config.allowedDomains}
                onChange={(items) => setConfig({ ...config, allowedDomains: items })}
                placeholder="example.com"
              />
              <TagInput
                label="Blocked Domains"
                items={config.blockedDomains}
                onChange={(items) => setConfig({ ...config, blockedDomains: items })}
                placeholder="bad-site.com"
              />
            </div>
          </div>

          <Separator />

          {/* User agent rules */}
          <div className="space-y-6">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              User-Agent Rules
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <TagInput
                label="Allowed User-Agents"
                items={config.allowedUserAgents}
                onChange={(items) => setConfig({ ...config, allowedUserAgents: items })}
                placeholder="Mozilla/5.0*"
              />
              <TagInput
                label="Blocked User-Agents"
                items={config.blockedUserAgents}
                onChange={(items) => setConfig({ ...config, blockedUserAgents: items })}
                placeholder="curl/7.*"
              />
            </div>
          </div>

          <Separator />

          {/* IP rules */}
          <div className="space-y-6">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4" />
              IP Rules
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <TagInput
                label="Allowed IPs"
                items={config.allowedIPs}
                onChange={(items) => setConfig({ ...config, allowedIPs: items })}
                placeholder="192.168.1.0/24"
              />
              <TagInput
                label="Blocked IPs"
                items={config.blockedIPs}
                onChange={(items) => setConfig({ ...config, blockedIPs: items })}
                placeholder="10.0.0.0/8"
              />
            </div>
          </div>

          <Separator />

          {/* Rate limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Rate Limits
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Max Requests / Day</Label>
                <Input
                  type="number"
                  value={config.maxRequestsPerDay}
                  onChange={(e) =>
                    setConfig({ ...config, maxRequestsPerDay: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Requests / Hour</Label>
                <Input
                  type="number"
                  value={config.maxRequestsPerHour}
                  onChange={(e) =>
                    setConfig({ ...config, maxRequestsPerHour: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Requests / Minute</Label>
                <Input
                  type="number"
                  value={config.maxRequestsPerMinute}
                  onChange={(e) =>
                    setConfig({ ...config, maxRequestsPerMinute: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Cache TTL */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Cache TTL: {config.cacheTTL}s ({(config.cacheTTL / 3600).toFixed(1)}h)
            </h3>
            <input
              type="range"
              min={0}
              max={604800}
              step={3600}
              value={config.cacheTTL}
              onChange={(e) =>
                setConfig({ ...config, cacheTTL: parseInt(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0s (no cache)</span>
              <span>7 days</span>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Require Authentication",
                  key: "requireAuth" as const,
                  icon: Shield,
                },
                {
                  label: "Require API Key",
                  key: "requireApiKey" as const,
                  icon: Key,
                },
                {
                  label: "Referer Check",
                  key: "refererCheck" as const,
                  icon: Globe,
                },
                {
                  label: "CORS Enabled",
                  key: "corsEnabled" as const,
                  icon: Globe,
                },
                {
                  label: "Hotlink Protection",
                  key: "hotlinkProtection" as const,
                  icon: Shield,
                },
              ].map((setting) => {
                const SettingIcon = setting.icon;
                return (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <SettingIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{setting.label}</span>
                    </div>
                    <Switch
                      checked={config[setting.key]}
                      onCheckedChange={(v) =>
                        setConfig({ ...config, [setting.key]: v })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for this file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">
                {file.status === "active" ? "Disable File" : "Enable File"}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.status === "active"
                  ? "Make the file inaccessible via CDN."
                  : "Restore access to the file."}
              </p>
            </div>
            <Button variant="outline">
              {file.status === "active" ? (
                <>
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <ToggleRight className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <p className="text-sm font-medium text-destructive">
                Delete File
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this file and all its data.
              </p>
            </div>
            <Dialog>
               <DialogTrigger>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {file.originalName}?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The file and all its
                    configurations will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive">Delete Forever</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
