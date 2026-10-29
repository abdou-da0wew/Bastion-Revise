import { Metadata } from "next";
import { ReviewWizard } from "./review-wizard";

export const metadata: Metadata = { title: "Publish — Review" };

export default function ReviewPage() {
  return <ReviewWizard />;
}
