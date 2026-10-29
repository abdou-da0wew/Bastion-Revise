import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { DashboardShell } from "./shell";

export const metadata: Metadata = {
  title: { default: "Dashboard — Bastion", template: "%s — Bastion" },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return (
    <DashboardShell user={{ name: actor.name, email: actor.email, role: actor.role, expiresAt: actor.expiresAt }}>
      {children}
    </DashboardShell>
  );
}
