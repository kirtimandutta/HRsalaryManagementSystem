import type { Metadata } from "next";
import { AnalyticsBoard } from "@/components/analytics-board";
import { SetupNotice } from "@/components/setup-notice";
import { PageHeader } from "@/components/ui";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { getAnalytics } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const report = await loadReport();
  if (!report) return <SetupNotice />;

  return (
    <>
      <PageHeader
        eyebrow="Compensation"
        title="Pay structure"
        description="Department cost, geographic markets, and band-level averages. A wide range usually means the band mix, not a single pay decision."
      />
      <AnalyticsBoard report={report} />
    </>
  );
}

async function loadReport() {
  try {
    return await getAnalytics();
  } catch (error) {
    if (isDatabaseUnavailable(error)) return null;
    throw error;
  }
}
