import { PAYROLL_STATUSES } from "@/lib/constants";
import {
  buildEquity,
  buildOrgStats,
  departmentDetails,
  type DepartmentDetail,
  type OrgStats,
  type PayEquityCell,
  type PayrollRow,
} from "@/lib/compensation";
import { toEmployeeDto } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import type { EmployeeDto } from "@/lib/types";

const payrollSelect = {
  department: true,
  country: true,
  currency: true,
  seniority: true,
  employmentType: true,
  status: true,
  baseSalaryUsd: true,
  bonusUsd: true,
  allowanceUsd: true,
  totalCompUsd: true,
} as const;

async function loadPayrollRows(): Promise<PayrollRow[]> {
  return prisma.employee.findMany({
    where: { status: { in: [...PAYROLL_STATUSES] } },
    select: payrollSelect,
  });
}

async function loadStatusCounts() {
  const groups = await prisma.employee.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return groups.map((group) => ({ status: group.status, count: group._count._all }));
}

export async function getOrgStats(): Promise<OrgStats> {
  const [rows, statusCounts] = await Promise.all([loadPayrollRows(), loadStatusCounts()]);
  return buildOrgStats(rows, statusCounts);
}

export type AnalyticsReport = OrgStats & {
  departments: DepartmentDetail[];
  equity: PayEquityCell[];
  topEarners: EmployeeDto[];
};

export async function getAnalytics(): Promise<AnalyticsReport> {
  const [rows, statusCounts, topEarners] = await Promise.all([
    loadPayrollRows(),
    loadStatusCounts(),
    prisma.employee.findMany({
      where: { status: { in: [...PAYROLL_STATUSES] } },
      orderBy: [{ totalCompUsd: "desc" }, { employeeId: "asc" }],
      take: 8,
    }),
  ]);

  return {
    ...buildOrgStats(rows, statusCounts),
    departments: departmentDetails(rows),
    equity: buildEquity(rows),
    topEarners: topEarners.map(toEmployeeDto),
  };
}
