import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { DashboardView } from "@/components/dashboard-view";
import { SetupNotice } from "@/components/setup-notice";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { getOrgStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function HomePage() {
  const stats = await loadStats();
  if (!stats) return <SetupNotice />;

  return (
    <>
      <PageHeader
        eyebrow="Workforce payroll"
        title="How ACME pays people"
        description="Gross compensation for active and on-leave employees, normalized to US dollars."
      />
      <DashboardView stats={stats} />
    </>
  );
}

async function loadStats() {
  try {
    return await getOrgStats();
  } catch (error) {
    if (isDatabaseUnavailable(error)) return null;
    throw error;
  }
}
