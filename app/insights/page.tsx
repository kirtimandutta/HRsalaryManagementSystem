import type { Metadata } from "next";
import { QueryPanel } from "@/components/query-panel";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ask the Org",
};

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ask the Org"
        title="Questions HR already asks"
        description="The mapper matches a question to a fixed query and reads the same payroll population as the dashboard. It does not invent numbers."
      />
      <QueryPanel />
    </>
  );
}
