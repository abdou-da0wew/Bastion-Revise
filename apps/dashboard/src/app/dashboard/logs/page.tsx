import { Metadata } from "next";
import { LogsClient } from "./logs-client";

export const metadata: Metadata = {
  title: "Audit Logs",
};

export default function LogsPage() {
  return <LogsClient />;
}
