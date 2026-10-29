"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, LogOut, User, Settings, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ShellUser { name: string; email: string; role: string; expiresAt: string | null }
const ADMIN = new Set(["moderator", "admin", "superadmin"]);

export function DashboardShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const router = useRouter();
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const signOut = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={ADMIN.has(user.role)} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="relative h-9 w-9"><Bell className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="py-2 text-center text-sm text-muted-foreground">No new notifications</div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                  <div className="hidden text-left text-sm md:block">
                    <p className="font-medium leading-none">{user.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.role}{user.expiresAt ? ` · expires ${new Date(user.expiresAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard/settings" />}><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/dashboard/settings" />}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                {ADMIN.has(user.role) && (
                  <DropdownMenuItem render={<Link href="/dashboard/admin" />}><Shield className="mr-2 h-4 w-4" />Admin Panel</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
