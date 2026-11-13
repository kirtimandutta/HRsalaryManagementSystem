import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compensationSnapshot } from "@/lib/currency";
import { getEmployeeDetail, updateCompensation } from "@/lib/employees";
import { answerOrgQuestion } from "@/lib/org-query";
import { prisma } from "@/lib/prisma";
import { getOrgStats } from "@/lib/stats";

const hasDatabase = existsSync(new URL("../prisma/dev.db", import.meta.url));

describe.skipIf(!hasDatabase)("seeded compensation database", () => {
  it("loads exactly 10,000 employees across every country, department, and band", async () => {
    const [count, countries, departments, bands, currencies] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({ by: ["country"], _count: { _all: true } }),
      prisma.employee.groupBy({ by: ["department"], _count: { _all: true } }),
      prisma.employee.groupBy({ by: ["seniority"], _count: { _all: true } }),
      prisma.employee.groupBy({ by: ["currency"], _count: { _all: true } }),
    ]);

    expect(count).toBe(10_000);
    expect(countries).toHaveLength(7);
    expect(departments).toHaveLength(8);
    expect(bands).toHaveLength(5);
    expect(currencies).toHaveLength(7);
  });

  it("keeps stored USD totals aligned with the rate card", async () => {
    const sample = await prisma.employee.findMany({ take: 25 });
    for (const employee of sample) {
      const snapshot = compensationSnapshot(employee);
      expect(employee.totalCompUsd).toBeCloseTo(snapshot.totalCompUsd, 2);
    }
  });

  it("excludes terminated employees from payroll headcount", async () => {
    const [stats, terminated] = await Promise.all([
      getOrgStats(),
      prisma.employee.count({ where: { status: "Terminated" } }),
    ]);
    expect(stats.headcount + terminated).toBe(10_000);
    expect(stats.terminatedCount).toBe(terminated);
    expect(stats.totalAnnualUsd).toBeGreaterThan(0);
  });

  it("answers an engineering question and filters the directory", async () => {
    const answer = await answerOrgQuestion("What is the average salary in Engineering in the US?");
    expect(answer.ok).toBe(true);
    expect(answer.intent).toBe("average");
    expect(answer.summary).toContain("Engineering");
    expect(answer.summary).toContain("the US");

    const engineering = await prisma.employee.count({
      where: { department: "Engineering", status: { in: ["Active", "On Leave"] } },
    });
    expect(engineering).toBeGreaterThan(0);
  });

  it("writes an audit line when compensation changes and then restores the row", async () => {
    const employee = await prisma.employee.findUniqueOrThrow({ where: { employeeId: "ACME-00001" } });
    const original = {
      baseSalary: employee.baseSalary,
      bonus: employee.bonus,
      allowance: employee.allowance,
      currency: employee.currency,
      baseSalaryUsd: employee.baseSalaryUsd,
      bonusUsd: employee.bonusUsd,
      allowanceUsd: employee.allowanceUsd,
      totalCompUsd: employee.totalCompUsd,
    };

    try {
      const updated = await updateCompensation(employee.id, {
        baseSalary: original.baseSalary + 1000,
        changedBy: "Test Runner",
      });
      expect(updated.baseSalary).toBe(original.baseSalary + 1000);
      const detail = await getEmployeeDetail(employee.id);
      expect(detail.audits[0]?.changedBy).toBe("Test Runner");
      expect(detail.audits[0]?.field).toBe("baseSalary");
    } finally {
      await prisma.employee.update({ where: { id: employee.id }, data: original });
      await prisma.auditLog.deleteMany({ where: { employeeId: employee.id, changedBy: "Test Runner" } });
    }
  });
});
