import { Globe2, Users, Wallet, CircleDollarSign } from "lucide-react";
import { ValueBarChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { Card, SectionTitle } from "@/components/ui";
import type { OrgStats } from "@/lib/compensation";
import { FX_AS_OF_LABEL, FX_TO_USD } from "@/lib/currency";
import { formatNumber, formatPercent, formatRate, formatUsd } from "@/lib/format";

export function DashboardView({ stats }: { stats: OrgStats }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Payroll headcount"
          value={formatNumber(stats.headcount)}
          hint={`${formatNumber(stats.activeCount)} active · ${formatNumber(stats.onLeaveCount)} on leave`}
        />
        <MetricCard
          icon={Wallet}
          label="Annual payroll"
          value={formatUsd(stats.totalAnnualUsd)}
          hint="Gross total compensation"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Monthly run-rate"
          value={formatUsd(stats.totalMonthlyUsd)}
          hint="Annual total divided by 12"
        />
        <MetricCard
          icon={Globe2}
          label="Average salary"
          value={formatUsd(stats.averageAnnualUsd)}
          hint={`Median ${formatUsd(stats.medianAnnualUsd)} · ${formatNumber(stats.countryCount)} countries`}
        />
      </section>

      <p className="text-sm text-muted">
        Figures use the {FX_AS_OF_LABEL} reference rates. {formatNumber(stats.terminatedCount)} terminated employees are
        excluded from payroll and remain in the directory.
      </p>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Payroll by department" detail="Annual USD" />
          <ValueBarChart
            data={stats.byDepartment.map((row) => ({ name: row.key, value: row.totalAnnualUsd }))}
          />
        </Card>
        <Card>
          <SectionTitle title="Average by country" detail="Annual USD" />
          <ValueBarChart
            color="#9a3412"
            data={stats.byCountry.map((row) => ({ name: row.key, value: row.averageAnnualUsd }))}
          />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle title="Salary bands" />
          <ShareList
            rows={stats.bySeniority.map((row) => ({
              label: row.key,
              display: formatUsd(row.averageAnnualUsd),
              share: stats.headcount === 0 ? 0 : row.headcount / stats.headcount,
            }))}
          />
        </Card>
        <Card>
          <SectionTitle title="Compensation mix" />
          <ShareList
            rows={[
              { label: "Base", display: formatPercent(stats.baseShare), share: stats.baseShare },
              { label: "Bonus", display: formatPercent(stats.bonusShare), share: stats.bonusShare },
              { label: "Allowance", display: formatPercent(stats.allowanceShare), share: stats.allowanceShare },
            ]}
          />
        </Card>
        <Card>
          <SectionTitle title="Rate card" detail={FX_AS_OF_LABEL} />
          <ul className="space-y-2 text-sm">
            {Object.entries(FX_TO_USD).map(([code, rate]) => (
              <li key={code} className="flex items-center justify-between gap-3">
                <span>{code}</span>
                <span className="tabular-nums text-muted">{formatRate(rate)} USD</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function ShareList({ rows }: { rows: Array<{ label: string; display: string; share: number }> }) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span>{row.label}</span>
            <span className="tabular-nums text-muted">{row.display}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full bg-info" style={{ width: `${Math.max(row.share * 100, row.share > 0 ? 2 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
