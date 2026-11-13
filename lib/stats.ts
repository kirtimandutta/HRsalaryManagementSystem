import type { Prisma } from "@prisma/client";
import { PAYROLL_STATUSES, SENIORITY_BANDS } from "@/lib/constants";
import { median, money, type DepartmentDetail, type GroupStat, type OrgStats, type PayEquityCell } from "@/lib/compensation";
import { employeeListSelect, toEmployeeDto } from "@/lib/dto";
import { remember, invalidatePayrollCache } from "@/lib/payroll-cache";
import { prisma } from "@/lib/prisma";
import type { EmployeeDto } from "@/lib/types";

export { invalidatePayrollCache };

const payrollWhere: Prisma.EmployeeWhereInput = { status: { in: [...PAYROLL_STATUSES] } };

export type AnalyticsReport = OrgStats & {
  departments: DepartmentDetail[];
  equity: PayEquityCell[];
  topEarners: EmployeeDto[];
};

function groupStat(key: string, headcount: number, total: number | null): GroupStat {
  const amount = total ?? 0;
  return {
    key,
    headcount,
    totalAnnualUsd: money(amount),
    averageAnnualUsd: money(headcount === 0 ? 0 : amount / headcount),
  };
}

function byTotal(left: GroupStat, right: GroupStat): number {
  return right.totalAnnualUsd - left.totalAnnualUsd || left.key.localeCompare(right.key);
}

export async function medianTotalComp(where: Prisma.EmployeeWhereInput): Promise<number> {
  const count = await prisma.employee.count({ where });
  if (count === 0) return 0;
  const rows = await prisma.employee.findMany({
    where,
    select: { totalCompUsd: true },
    orderBy: [{ totalCompUsd: "asc" }, { employeeId: "asc" }],
    skip: Math.floor((count - 1) / 2),
    take: count % 2 === 0 ? 2 : 1,
  });
  return median(rows.map((row) => row.totalCompUsd));
}

async function computeReport(): Promise<AnalyticsReport> {
  const [totals, statusGroups, departments, countries, currencies, seniorities, employmentTypes, equityGroups, medianAnnualUsd, topEarners] =
    await Promise.all([
      prisma.employee.aggregate({
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true, baseSalaryUsd: true, bonusUsd: true, allowanceUsd: true },
      }),
      prisma.employee.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.employee.groupBy({
        by: ["department"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true, baseSalaryUsd: true, bonusUsd: true, allowanceUsd: true },
        _min: { totalCompUsd: true },
        _max: { totalCompUsd: true },
      }),
      prisma.employee.groupBy({
        by: ["country"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true },
      }),
      prisma.employee.groupBy({
        by: ["currency"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true },
      }),
      prisma.employee.groupBy({
        by: ["seniority"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true },
      }),
      prisma.employee.groupBy({
        by: ["employmentType"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true },
      }),
      prisma.employee.groupBy({
        by: ["department", "seniority"],
        where: payrollWhere,
        _count: { _all: true },
        _sum: { totalCompUsd: true },
      }),
      medianTotalComp(payrollWhere),
      prisma.employee.findMany({
        where: payrollWhere,
        select: employeeListSelect,
        orderBy: [{ totalCompUsd: "desc" }, { employeeId: "asc" }],
        take: 8,
      }),
    ]);

  const statusCount = (status: string) => statusGroups.find((group) => group.status === status)?._count._all ?? 0;
  const totalAnnualUsd = totals._sum.totalCompUsd ?? 0;
  const baseUsd = totals._sum.baseSalaryUsd ?? 0;
  const bonusUsd = totals._sum.bonusUsd ?? 0;
  const allowanceUsd = totals._sum.allowanceUsd ?? 0;
  const partTotal = baseUsd + bonusUsd + allowanceUsd;
  const headcount = totals._count._all;
  const departmentDetails: DepartmentDetail[] = departments
    .map((row) => ({
      ...groupStat(row.department, row._count._all, row._sum.totalCompUsd),
      minAnnualUsd: money(row._min.totalCompUsd ?? 0),
      maxAnnualUsd: money(row._max.totalCompUsd ?? 0),
      baseUsd: money(row._sum.baseSalaryUsd ?? 0),
      bonusUsd: money(row._sum.bonusUsd ?? 0),
      allowanceUsd: money(row._sum.allowanceUsd ?? 0),
    }))
    .sort(byTotal);
  const seniorityByKey = new Map(
    seniorities.map((row) => [row.seniority, groupStat(row.seniority, row._count._all, row._sum.totalCompUsd)]),
  );

  const stats: OrgStats = {
    headcount,
    activeCount: statusCount("Active"),
    onLeaveCount: statusCount("On Leave"),
    terminatedCount: statusCount("Terminated"),
    workforceCount: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
    countryCount: countries.length,
    totalAnnualUsd: money(totalAnnualUsd),
    totalMonthlyUsd: money(totalAnnualUsd / 12),
    averageAnnualUsd: money(headcount === 0 ? 0 : totalAnnualUsd / headcount),
    medianAnnualUsd: money(medianAnnualUsd),
    baseUsd: money(baseUsd),
    bonusUsd: money(bonusUsd),
    allowanceUsd: money(allowanceUsd),
    baseShare: partTotal === 0 ? 0 : baseUsd / partTotal,
    bonusShare: partTotal === 0 ? 0 : bonusUsd / partTotal,
    allowanceShare: partTotal === 0 ? 0 : allowanceUsd / partTotal,
    byDepartment: departmentDetails.map(({ key, headcount: count, totalAnnualUsd: total, averageAnnualUsd }) => ({
      key,
      headcount: count,
      totalAnnualUsd: total,
      averageAnnualUsd,
    })),
    byCountry: countries.map((row) => groupStat(row.country, row._count._all, row._sum.totalCompUsd)).sort(byTotal),
    byCurrency: currencies.map((row) => groupStat(row.currency, row._count._all, row._sum.totalCompUsd)).sort(byTotal),
    bySeniority: SENIORITY_BANDS.flatMap((band) => {
      const group = seniorityByKey.get(band);
      return group ? [group] : [];
    }),
    byEmploymentType: employmentTypes
      .map((row) => groupStat(row.employmentType, row._count._all, row._sum.totalCompUsd))
      .sort(byTotal),
  };

  const equity: PayEquityCell[] = equityGroups.map((row) => ({
    department: row.department,
    seniority: row.seniority,
    headcount: row._count._all,
    averageAnnualUsd: money(row._count._all === 0 ? 0 : (row._sum.totalCompUsd ?? 0) / row._count._all),
  }));

  return { ...stats, departments: departmentDetails, equity, topEarners: topEarners.map(toEmployeeDto) };
}

function cachedReport(): Promise<AnalyticsReport> {
  return remember("payroll-report", computeReport);
}

export async function getOrgStats(): Promise<OrgStats> {
  const report = await cachedReport();
  return {
    headcount: report.headcount,
    activeCount: report.activeCount,
    onLeaveCount: report.onLeaveCount,
    terminatedCount: report.terminatedCount,
    workforceCount: report.workforceCount,
    countryCount: report.countryCount,
    totalAnnualUsd: report.totalAnnualUsd,
    totalMonthlyUsd: report.totalMonthlyUsd,
    averageAnnualUsd: report.averageAnnualUsd,
    medianAnnualUsd: report.medianAnnualUsd,
    baseUsd: report.baseUsd,
    bonusUsd: report.bonusUsd,
    allowanceUsd: report.allowanceUsd,
    baseShare: report.baseShare,
    bonusShare: report.bonusShare,
    allowanceShare: report.allowanceShare,
    byDepartment: report.byDepartment,
    byCountry: report.byCountry,
    byCurrency: report.byCurrency,
    bySeniority: report.bySeniority,
    byEmploymentType: report.byEmploymentType,
  };
}

export function getAnalytics(): Promise<AnalyticsReport> {
  return cachedReport();
}
