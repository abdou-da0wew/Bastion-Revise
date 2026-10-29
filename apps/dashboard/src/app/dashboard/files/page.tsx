import { Metadata } from "next";
import { FilesList } from "./files-list";
export const metadata: Metadata = { title: "My Files" };
export default function FilesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Files</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage files published to the Bastion CDN core.</p>
      </div>
      <FilesList />
    </div>
  );
}
