import { Metadata } from "next";
import { AdminClient } from "./admin-client";

export const metadata: Metadata = {
  title: "Admin Panel",
};

export default function AdminPage() {
  return <AdminClient />;
}
