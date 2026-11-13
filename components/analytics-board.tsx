import { ValueBarChart } from "@/components/charts";
import { Card, SectionTitle } from "@/components/ui";
import { DEPARTMENTS, SENIORITY_BANDS } from "@/lib/constants";
import type { AnalyticsReport } from "@/lib/stats";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";

export function AnalyticsBoard({ report }: { report: AnalyticsReport }) {
  const orgAverage = report.averageAnnualUsd || 1;
  const equity = new Map(report.equity.map((cell) => [`${cell.department}::${cell.seniority}`, cell]));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle title="Department payroll" detail="Annual gross, USD" />
          <ValueBarChart data={report.byDepartment.map((row) => ({ name: row.key, value: row.totalAnnualUsd }))} />
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Org mix" />
          <MixBar base={report.baseShare} bonus={report.bonusShare} allowance={report.allowanceShare} />
          <dl className="mt-4 space-y-2 text-sm">
            <MixLine label="Base" value={report.baseUsd} share={report.baseShare} />
            <MixLine label="Bonus" value={report.bonusUsd} share={report.bonusShare} />
            <MixLine label="Allowance" value={report.allowanceUsd} share={report.allowanceShare} />
          </dl>
        </Card>
      </section>

      <Card>
        <SectionTitle
          title="Department spending"
          detail="Range includes the seniority mix, not only pay decisions"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 font-medium">Department</th>
                <th className="py-2 text-right font-medium">People</th>
                <th className="py-2 text-right font-medium">Payroll</th>
                <th className="py-2 text-right font-medium">Average</th>
                <th className="py-2 text-right font-medium">Low</th>
                <th className="py-2 text-right font-medium">High</th>
                <th className="py-2 font-medium">Mix</th>
              </tr>
            </thead>
            <tbody>
              {report.departments.map((row) => {
                const parts = row.baseUsd + row.bonusUsd + row.allowanceUsd;
                return (
                  <tr key={row.key} className="border-t border-line">
                    <td className="py-2 font-medium">{row.key}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(row.headcount)}</td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(row.totalAnnualUsd)}</td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(row.averageAnnualUsd)}</td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(row.minAnnualUsd)}</td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(row.maxAnnualUsd)}</td>
                    <td className="py-2">
                      <MixBar
                        base={parts === 0 ? 0 : row.baseUsd / parts}
                        bonus={parts === 0 ? 0 : row.bonusUsd / parts}
                        allowance={parts === 0 ? 0 : row.allowanceUsd / parts}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Geographic comparison" detail="Average total compensation" />
          <ValueBarChart
            color="#9a3412"
            data={[...report.byCountry]
              .sort((left, right) => right.averageAnnualUsd - left.averageAnnualUsd)
              .map((row) => ({ name: row.key, value: row.averageAnnualUsd }))}
          />
        </Card>
        <Card>
          <SectionTitle title="Highest earners" detail="On payroll" />
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 font-medium">Employee</th>
                <th className="py-2 font-medium">Where</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.topEarners.map((employee) => (
                <tr key={employee.id} className="border-t border-line">
                  <td className="py-2">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-xs text-muted">{employee.title}</p>
                  </td>
                  <td className="py-2">
                    {employee.department}
                    <span className="text-muted"> · {employee.country}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatUsd(employee.totalCompUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <Card>
        <SectionTitle
          title="Pay by department and band"
          detail="Cell color compares the band average with the org average"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-1 text-left text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted">Department</th>
                {SENIORITY_BANDS.map((band) => (
                  <th key={band} className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted">
                    {band}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((department) => (
                <tr key={department}>
                  <th className="px-2 py-2 text-left text-sm font-medium">{department}</th>
                  {SENIORITY_BANDS.map((band) => {
                    const cell = equity.get(`${department}::${band}`);
                    if (!cell) {
                      return (
                        <td key={band} className="rounded-lg bg-stone-50 px-2 py-2 text-muted">
                          —
                        </td>
                      );
                    }
                    const delta = Math.max(-0.45, Math.min(0.45, cell.averageAnnualUsd / orgAverage - 1));
                    const background =
                      delta >= 0
                        ? `rgba(15, 118, 110, ${0.12 + delta})`
                        : `rgba(154, 52, 18, ${0.12 + Math.abs(delta)})`;
                    return (
                      <td key={band} className="rounded-lg px-2 py-2" style={{ background }}>
                        <p className="tabular-nums">{formatUsd(cell.averageAnnualUsd)}</p>
                        <p className="text-xs text-muted">{formatNumber(cell.headcount)}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MixBar({ base, bonus, allowance }: { base: number; bonus: number; allowance: number }) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
      <div className="bg-info" style={{ width: `${base * 100}%` }} />
      <div className="bg-accent" style={{ width: `${bonus * 100}%` }} />
      <div className="bg-amber-300" style={{ width: `${allowance * 100}%` }} />
    </div>
  );
}

function MixLine({ label, value, share }: { label: string; value: number; share: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="tabular-nums text-muted">
        {formatUsd(value)} · {formatPercent(share)}
      </dd>
    </div>
  );
}
