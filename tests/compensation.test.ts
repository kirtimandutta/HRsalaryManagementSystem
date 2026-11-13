import { describe, expect, it } from "vitest";
import { PAYROLL_STATUSES } from "@/lib/constants";
import {
  buildEquity,
  buildOrgStats,
  departmentDetails,
  median,
  type PayrollRow,
} from "@/lib/compensation";

function row(overrides: Partial<PayrollRow> & Pick<PayrollRow, "department" | "totalCompUsd">): PayrollRow {
  return {
    country: "US",
    currency: "USD",
    seniority: "Mid",
    employmentType: "Full-time",
    status: "Active",
    baseSalaryUsd: overrides.totalCompUsd,
    bonusUsd: 0,
    allowanceUsd: 0,
    ...overrides,
  };
}

describe("payroll aggregation", () => {
  it("computes an even and odd median", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 2, 3])).toBe(2);
    expect(median([])).toBe(0);
  });

  it("keeps terminated people out of the payroll population the caller passes in", () => {
    expect(PAYROLL_STATUSES).not.toContain("Terminated");
    const rows = [
      row({ department: "Engineering", seniority: "Senior", totalCompUsd: 100, baseSalaryUsd: 80, bonusUsd: 15, allowanceUsd: 5 }),
      row({ department: "Engineering", seniority: "Lead", totalCompUsd: 300, baseSalaryUsd: 200, bonusUsd: 80, allowanceUsd: 20 }),
      row({ department: "Sales", country: "UK", currency: "GBP", seniority: "Mid", totalCompUsd: 100, baseSalaryUsd: 50, bonusUsd: 40, allowanceUsd: 10 }),
    ];
    const stats = buildOrgStats(rows, [
      { status: "Active", count: 3 },
      { status: "Terminated", count: 2 },
    ]);

    expect(stats.headcount).toBe(3);
    expect(stats.totalAnnualUsd).toBe(500);
    expect(stats.averageAnnualUsd).toBe(166.67);
    expect(stats.medianAnnualUsd).toBe(100);
    expect(stats.terminatedCount).toBe(2);
    expect(stats.workforceCount).toBe(5);
    expect(stats.byDepartment[0]).toMatchObject({ key: "Engineering", totalAnnualUsd: 400, headcount: 2 });
    expect(stats.baseShare).toBeCloseTo(0.66, 5);
    expect(stats.countryCount).toBe(2);
  });

  it("reports department range and band averages from the same rows", () => {
    const rows = [
      row({ department: "HR", seniority: "Junior", totalCompUsd: 40 }),
      row({ department: "HR", seniority: "Junior", totalCompUsd: 60 }),
    ];
    expect(departmentDetails(rows)[0]).toMatchObject({
      key: "HR",
      minAnnualUsd: 40,
      maxAnnualUsd: 60,
      averageAnnualUsd: 50,
    });
    expect(buildEquity(rows)).toEqual([
      { department: "HR", seniority: "Junior", headcount: 2, averageAnnualUsd: 50 },
    ]);
  });
});
