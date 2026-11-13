import type { Prisma } from "@prisma/client";
import {
  averageSummary,
  compareSummary,
  emptyPopulation,
  headcountSummary,
  medianSummary,
  mixSummary,
  populationPhrase,
  rankingSummary,
  snapshotSummary,
  thresholdSummary,
  topEarnersSummary,
  totalSummary,
  unknownSummary,
} from "@/lib/answers";
import { PAYROLL_STATUSES, SENIORITY_BANDS, type Country, type Department } from "@/lib/constants";
import { median } from "@/lib/compensation";
import { toEmployeeDto } from "@/lib/dto";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";
import { describeIntent, intentLabel, parseOrgQuestion, SAMPLE_QUESTIONS, type OrgIntent } from "@/lib/parse-question";
import { prisma } from "@/lib/prisma";
import type { EmployeeDto, OrgQueryResponse, QueryBreakdown, QueryMetric } from "@/lib/types";

type Scope = { department?: Department; country?: Country };

type Totals = {
  headcount: number;
  average: number;
  total: number;
  base: number;
  bonus: number;
  allowance: number;
};

function payrollWhere(scope: Scope = {}, extra: Prisma.EmployeeWhereInput = {}): Prisma.EmployeeWhereInput {
  return {
    status: { in: [...PAYROLL_STATUSES] },
    ...(scope.department ? { department: scope.department } : {}),
    ...(scope.country ? { country: scope.country } : {}),
    ...extra,
  };
}

async function totals(where: Prisma.EmployeeWhereInput): Promise<Totals> {
  const aggregate = await prisma.employee.aggregate({
    where,
    _avg: { totalCompUsd: true },
    _sum: { totalCompUsd: true, baseSalaryUsd: true, bonusUsd: true, allowanceUsd: true },
    _count: { _all: true },
  });
  return {
    headcount: aggregate._count._all,
    average: aggregate._avg.totalCompUsd ?? 0,
    total: aggregate._sum.totalCompUsd ?? 0,
    base: aggregate._sum.baseSalaryUsd ?? 0,
    bonus: aggregate._sum.bonusUsd ?? 0,
    allowance: aggregate._sum.allowanceUsd ?? 0,
  };
}

async function medianOf(where: Prisma.EmployeeWhereInput): Promise<number> {
  const rows = await prisma.employee.findMany({
    where,
    select: { totalCompUsd: true },
  });
  return median(rows.map((row) => row.totalCompUsd));
}

async function people(where: Prisma.EmployeeWhereInput, take: number): Promise<EmployeeDto[]> {
  const rows = await prisma.employee.findMany({
    where,
    orderBy: [{ totalCompUsd: "desc" }, { employeeId: "asc" }],
    take,
  });
  return rows.map(toEmployeeDto);
}

async function seniorityBreakdown(where: Prisma.EmployeeWhereInput): Promise<QueryBreakdown[]> {
  const grouped = await prisma.employee.groupBy({
    by: ["seniority"],
    where,
    _avg: { totalCompUsd: true },
    _count: { _all: true },
  });
  const byBand = new Map(grouped.map((row) => [row.seniority, row]));
  return SENIORITY_BANDS.flatMap((band) => {
    const row = byBand.get(band);
    if (!row) return [];
    const average = row._avg.totalCompUsd ?? 0;
    return [
      {
        label: band,
        value: average,
        display: `${formatUsd(average)} · ${formatNumber(row._count._all)}`,
      },
    ];
  });
}

function response(question: string, intent: OrgIntent, partial: Omit<OrgQueryResponse, "question" | "intent" | "label" | "interpretation" | "ok" | "suggestions"> & { ok?: boolean }): OrgQueryResponse {
  const unknown = intent.type === "unknown";
  return {
    ok: partial.ok ?? !unknown,
    question,
    intent: intent.type,
    label: intentLabel(intent),
    interpretation: describeIntent(intent),
    summary: partial.summary,
    metrics: partial.metrics,
    breakdown: partial.breakdown,
    employees: partial.employees,
    suggestions: unknown ? [...SAMPLE_QUESTIONS] : [],
  };
}

const emptyLists = { metrics: [] as QueryMetric[], breakdown: [] as QueryBreakdown[], employees: [] as EmployeeDto[] };

async function rankPopulation(field: "department" | "country") {
  if (field === "department") {
    const grouped = await prisma.employee.groupBy({
      by: ["department"],
      where: payrollWhere(),
      _sum: { totalCompUsd: true },
      _avg: { totalCompUsd: true },
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      label: row.department,
      total: row._sum.totalCompUsd ?? 0,
      average: row._avg.totalCompUsd ?? 0,
      headcount: row._count._all,
    }));
  }

  const grouped = await prisma.employee.groupBy({
    by: ["country"],
    where: payrollWhere(),
    _sum: { totalCompUsd: true },
    _avg: { totalCompUsd: true },
    _count: { _all: true },
  });
  return grouped.map((row) => ({
    label: row.country,
    total: row._sum.totalCompUsd ?? 0,
    average: row._avg.totalCompUsd ?? 0,
    headcount: row._count._all,
  }));
}

export async function answerOrgQuestion(question: string): Promise<OrgQueryResponse> {
  const intent = parseOrgQuestion(question);

  switch (intent.type) {
    case "unknown":
      return response(question, intent, { ...emptyLists, summary: unknownSummary(), ok: false });

    case "average": {
      const population = populationPhrase(intent.department, intent.country);
      const where = payrollWhere(intent);
      const [stats, breakdown] = await Promise.all([totals(where), seniorityBreakdown(where)]);
      return response(question, intent, {
        summary: averageSummary(population, stats.average, stats.headcount),
        metrics: [
          { label: "Average", value: formatUsd(stats.average) },
          { label: "Headcount", value: formatNumber(stats.headcount) },
          { label: "Annual payroll", value: formatUsd(stats.total) },
        ],
        breakdown,
        employees: [],
      });
    }

    case "median": {
      const population = populationPhrase(intent.department, intent.country);
      const where = payrollWhere(intent);
      const [stats, medianValue] = await Promise.all([totals(where), medianOf(where)]);
      return response(question, intent, {
        summary: medianSummary(population, medianValue, stats.headcount),
        metrics: [
          { label: "Median", value: formatUsd(medianValue) },
          { label: "Average", value: formatUsd(stats.average) },
          { label: "Headcount", value: formatNumber(stats.headcount) },
        ],
        breakdown: [],
        employees: [],
      });
    }

    case "total_payroll": {
      const population = populationPhrase(intent.department, intent.country);
      const stats = await totals(payrollWhere(intent));
      return response(question, intent, {
        summary: totalSummary(population, stats.total, stats.headcount),
        metrics: [
          { label: "Annual payroll", value: formatUsd(stats.total) },
          { label: "Headcount", value: formatNumber(stats.headcount) },
          { label: "Average", value: formatUsd(stats.average) },
        ],
        breakdown: [],
        employees: [],
      });
    }

    case "headcount": {
      const population = populationPhrase(intent.department, intent.country);
      const stats = await totals(payrollWhere(intent));
      return response(question, intent, {
        summary: headcountSummary(population, stats.headcount),
        metrics: [
          { label: "Headcount", value: formatNumber(stats.headcount) },
          { label: "Annual payroll", value: formatUsd(stats.total) },
          { label: "Average", value: formatUsd(stats.average) },
        ],
        breakdown: [],
        employees: [],
      });
    }

    case "top_earners": {
      const population = populationPhrase(intent.department, intent.country);
      const employees = await people(payrollWhere(intent), intent.limit);
      const highest = employees[0]?.totalCompUsd ?? 0;
      const lowest = employees.at(-1)?.totalCompUsd ?? 0;
      return response(question, intent, {
        summary: topEarnersSummary(population, highest, employees.length),
        metrics: [
          { label: "Highest", value: formatUsd(highest) },
          { label: "Lowest shown", value: formatUsd(lowest) },
          { label: "Shown", value: formatNumber(employees.length) },
        ],
        breakdown: [],
        employees,
      });
    }

    case "threshold": {
      const population = populationPhrase(intent.department, intent.country);
      const where = payrollWhere(intent, { totalCompUsd: { gte: intent.amountUsd } });
      const [stats, employees] = await Promise.all([totals(where), people(where, 10)]);
      const suffix = stats.headcount > employees.length ? ` Showing the top ${formatNumber(employees.length)}.` : "";
      return response(question, intent, {
        summary: `${thresholdSummary(population, intent.amountUsd, stats.headcount)}${suffix}`,
        metrics: [
          { label: "People", value: formatNumber(stats.headcount) },
          { label: "Threshold", value: formatUsd(intent.amountUsd) },
          { label: "Their payroll", value: formatUsd(stats.total) },
        ],
        breakdown: [],
        employees,
      });
    }

    case "comp_mix": {
      const population = populationPhrase(intent.department, intent.country);
      const stats = await totals(payrollWhere(intent));
      const parts = stats.base + stats.bonus + stats.allowance;
      const baseShare = parts === 0 ? 0 : stats.base / parts;
      const bonusShare = parts === 0 ? 0 : stats.bonus / parts;
      const allowanceShare = parts === 0 ? 0 : stats.allowance / parts;
      const summary =
        stats.headcount === 0
          ? emptyPopulation(population)
          : mixSummary(population, baseShare, bonusShare, allowanceShare);
      return response(question, intent, {
        summary,
        metrics: [
          { label: "Base", value: formatPercent(baseShare) },
          { label: "Bonus", value: formatPercent(bonusShare) },
          { label: "Allowance", value: formatPercent(allowanceShare) },
        ],
        breakdown: [
          { label: "Base", value: stats.base, display: formatUsd(stats.base) },
          { label: "Bonus", value: stats.bonus, display: formatUsd(stats.bonus) },
          { label: "Allowance", value: stats.allowance, display: formatUsd(stats.allowance) },
        ],
        employees: [],
      });
    }

    case "compare_departments": {
      const [leftName, rightName] = intent.departments;
      const [left, right] = await Promise.all([
        totals(payrollWhere({ department: leftName })),
        totals(payrollWhere({ department: rightName })),
      ]);
      return response(question, intent, {
        summary: compareSummary(
          { name: leftName, average: left.average, headcount: left.headcount },
          { name: rightName, average: right.average, headcount: right.headcount },
        ),
        metrics: [
          { label: `${leftName} average`, value: formatUsd(left.average) },
          { label: `${rightName} average`, value: formatUsd(right.average) },
          { label: "Headcount", value: `${formatNumber(left.headcount)} / ${formatNumber(right.headcount)}` },
        ],
        breakdown: [
          { label: leftName, value: left.average, display: formatUsd(left.average) },
          { label: rightName, value: right.average, display: formatUsd(right.average) },
        ],
        employees: [],
      });
    }

    case "department_ranking":
    case "country_ranking": {
      const kind = intent.type === "department_ranking" ? "department" : "country";
      const ranked = (await rankPopulation(kind)).sort((left, right) => right.total - left.total);
      const leader = ranked[0];
      return response(question, intent, {
        summary: leader ? rankingSummary(kind, leader.label, leader.total) : "No active or on-leave employees to rank.",
        metrics: leader
          ? [
              { label: "Largest payroll", value: leader.label },
              { label: "Annual payroll", value: formatUsd(leader.total) },
              { label: "Average", value: formatUsd(leader.average) },
            ]
          : [],
        breakdown: ranked.map((row) => ({
          label: row.label,
          value: row.total,
          display: `${formatUsd(row.total)} · ${formatNumber(row.headcount)}`,
        })),
        employees: [],
      });
    }

    case "snapshot": {
      const population = populationPhrase(intent.department, intent.country);
      const where = payrollWhere(intent);
      const [stats, medianValue, breakdown, employees] = await Promise.all([
        totals(where),
        medianOf(where),
        seniorityBreakdown(where),
        people(where, 5),
      ]);
      return response(question, intent, {
        summary: snapshotSummary(population, stats.average, medianValue, stats.total, stats.headcount),
        metrics: [
          { label: "Headcount", value: formatNumber(stats.headcount) },
          { label: "Average", value: formatUsd(stats.average) },
          { label: "Median", value: formatUsd(medianValue) },
          { label: "Annual payroll", value: formatUsd(stats.total) },
        ],
        breakdown,
        employees,
      });
    }
  }
}
