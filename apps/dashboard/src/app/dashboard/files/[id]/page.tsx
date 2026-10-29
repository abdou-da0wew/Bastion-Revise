import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getFileById } from "@/lib/db";
import { FileDetailClient } from "./file-detail-client";

export const metadata: Metadata = { title: "File Details" };

export default async function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const { id } = await params;
  const file = await getFileById(id).catch(() => null);
  if (!file) notFound();
  return (
    <div className="space-y-6 animate-fade-in">
      <FileDetailClient file={file as never} />
    </div>
  );
}
