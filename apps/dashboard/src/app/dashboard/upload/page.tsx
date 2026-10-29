import { Metadata } from "next";
import { UploadPageClient } from "./upload-page-client";

export const metadata: Metadata = {
  title: "Upload",
};

export default function UploadPage() {
  return <UploadPageClient />;
}
