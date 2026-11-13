import { SENIORITY_BANDS } from "@/lib/constants";

export type PayrollRow = {
  department: string;
  country: string;
  currency: string;
  seniority: string;
  employmentType: string;
  status: string;
  baseSalaryUsd: number;
  bonusUsd: number;
  allowanceUsd: number;
  totalCompUsd: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type GroupStat = {
  key: string;
  headcount: number;
  totalAnnualUsd: number;
  averageAnnualUsd: number;
};

export type DepartmentDetail = GroupStat & {
  minAnnualUsd: number;
  maxAnnualUsd: number;
  baseUsd: number;
  bonusUsd: number;
  allowanceUsd: number;
};

export type PayEquityCell = {
  department: string;
  seniority: string;
  headcount: number;
  averageAnnualUsd: number;
};

export type OrgStats = {
  headcount: number;
  activeCount: number;
  onLeaveCount: number;
  terminatedCount: number;
  workforceCount: number;
  countryCount: number;
  totalAnnualUsd: number;
  totalMonthlyUsd: number;
  averageAnnualUsd: number;
  medianAnnualUsd: number;
  baseUsd: number;
  bonusUsd: number;
  allowanceUsd: number;
  baseShare: number;
  bonusShare: number;
  allowanceShare: number;
  byDepartment: GroupStat[];
  byCountry: GroupStat[];
  byCurrency: GroupStat[];
  bySeniority: GroupStat[];
  byEmploymentType: GroupStat[];
};

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const lower = sorted[mid - 1] ?? 0;
    const upper = sorted[mid] ?? 0;
    return (lower + upper) / 2;
  }
  return sorted[mid] ?? 0;
}

export function groupStats(rows: PayrollRow[], keyOf: (row: PayrollRow) => string): GroupStat[] {
  const groups = new Map<string, { headcount: number; total: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const current = groups.get(key) ?? { headcount: 0, total: 0 };
    current.headcount += 1;
    current.total += row.totalCompUsd;
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      headcount: value.headcount,
      totalAnnualUsd: money(value.total),
      averageAnnualUsd: money(value.headcount === 0 ? 0 : value.total / value.headcount),
    }))
    .sort((left, right) => right.totalAnnualUsd - left.totalAnnualUsd || left.key.localeCompare(right.key));
}

export function departmentDetails(rows: PayrollRow[]): DepartmentDetail[] {
  const groups = new Map<
    string,
    { headcount: number; total: number; min: number; max: number; base: number; bonus: number; allowance: number }
  >();

  for (const row of rows) {
    const current = groups.get(row.department) ?? {
      headcount: 0,
      total: 0,
      min: row.totalCompUsd,
      max: row.totalCompUsd,
      base: 0,
      bonus: 0,
      allowance: 0,
    };
    current.headcount += 1;
    current.total += row.totalCompUsd;
    current.min = Math.min(current.min, row.totalCompUsd);
    current.max = Math.max(current.max, row.totalCompUsd);
    current.base += row.baseSalaryUsd;
    current.bonus += row.bonusUsd;
    current.allowance += row.allowanceUsd;
    groups.set(row.department, current);
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      headcount: value.headcount,
      totalAnnualUsd: money(value.total),
      averageAnnualUsd: money(value.headcount === 0 ? 0 : value.total / value.headcount),
      minAnnualUsd: money(value.min),
      maxAnnualUsd: money(value.max),
      baseUsd: money(value.base),
      bonusUsd: money(value.bonus),
      allowanceUsd: money(value.allowance),
    }))
    .sort((left, right) => right.totalAnnualUsd - left.totalAnnualUsd);
}

export function buildEquity(rows: PayrollRow[]): PayEquityCell[] {
  const groups = new Map<string, { department: string; seniority: string; headcount: number; total: number }>();
  for (const row of rows) {
    const id = `${row.department}::${row.seniority}`;
    const current = groups.get(id) ?? {
      department: row.department,
      seniority: row.seniority,
      headcount: 0,
      total: 0,
    };
    current.headcount += 1;
    current.total += row.totalCompUsd;
    groups.set(id, current);
  }

  return [...groups.values()].map((cell) => ({
    department: cell.department,
    seniority: cell.seniority,
    headcount: cell.headcount,
    averageAnnualUsd: money(cell.headcount === 0 ? 0 : cell.total / cell.headcount),
  }));
}

function countStatus(groups: StatusCount[], status: string): number {
  return groups.find((group) => group.status === status)?.count ?? 0;
}

/** Pure payroll rollup. Callers pass Active and On Leave rows only. */
export function buildOrgStats(rows: PayrollRow[], statusCounts: StatusCount[]): OrgStats {
  const totalAnnualUsd = rows.reduce((sum, row) => sum + row.totalCompUsd, 0);
  const baseUsd = rows.reduce((sum, row) => sum + row.baseSalaryUsd, 0);
  const bonusUsd = rows.reduce((sum, row) => sum + row.bonusUsd, 0);
  const allowanceUsd = rows.reduce((sum, row) => sum + row.allowanceUsd, 0);
  const partTotal = baseUsd + bonusUsd + allowanceUsd;
  const headcount = rows.length;
  const activeCount = countStatus(statusCounts, "Active");
  const onLeaveCount = countStatus(statusCounts, "On Leave");
  const terminatedCount = countStatus(statusCounts, "Terminated");

  return {
    headcount,
    activeCount,
    onLeaveCount,
    terminatedCount,
    workforceCount: activeCount + onLeaveCount + terminatedCount,
    countryCount: new Set(rows.map((row) => row.country)).size,
    totalAnnualUsd: money(totalAnnualUsd),
    totalMonthlyUsd: money(totalAnnualUsd / 12),
    averageAnnualUsd: money(headcount === 0 ? 0 : totalAnnualUsd / headcount),
    medianAnnualUsd: money(median(rows.map((row) => row.totalCompUsd))),
    baseUsd: money(baseUsd),
    bonusUsd: money(bonusUsd),
    allowanceUsd: money(allowanceUsd),
    baseShare: partTotal === 0 ? 0 : baseUsd / partTotal,
    bonusShare: partTotal === 0 ? 0 : bonusUsd / partTotal,
    allowanceShare: partTotal === 0 ? 0 : allowanceUsd / partTotal,
    byDepartment: groupStats(rows, (row) => row.department),
    byCountry: groupStats(rows, (row) => row.country),
    byCurrency: groupStats(rows, (row) => row.currency),
    bySeniority: SENIORITY_BANDS.map((band) => groupStats(rows, (row) => row.seniority).find((group) => group.key === band))
      .filter((group): group is GroupStat => group !== undefined),
    byEmploymentType: groupStats(rows, (row) => row.employmentType),
  };
}
