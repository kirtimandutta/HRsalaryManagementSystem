import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CompensationRejectedError, updateCompensation } from "@/lib/employees";
import { answerOrgQuestion } from "@/lib/org-query";
import { parseOrgQuestion } from "@/lib/parse-question";
import { prisma } from "@/lib/prisma";
import { compensationPatchSchema, orgQuestionSchema } from "@/lib/validators";

const hasDatabase = existsSync(new URL("../prisma/dev.db", import.meta.url));

function firstIssue(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string {
  return result.success ? "" : (result.error?.issues[0]?.message ?? "");
}

describe("QA edge cases", () => {
  it("rejects negative, non-numeric, empty, and extreme salary payloads", () => {
    expect(firstIssue(compensationPatchSchema.safeParse({ baseSalary: -50_000 }))).toMatch(/greater than zero/);
    expect(firstIssue(compensationPatchSchema.safeParse({ baseSalary: "-50000" }))).toMatch(/must be a number/);
    expect(firstIssue(compensationPatchSchema.safeParse({ baseSalary: "abc" }))).toMatch(/must be a number/);
    expect(firstIssue(compensationPatchSchema.safeParse({ baseSalary: null }))).toMatch(/must be a number/);
    expect(firstIssue(compensationPatchSchema.safeParse({}))).toMatch(/at least one compensation field/);
    expect(firstIssue(compensationPatchSchema.safeParse({ baseSalary: 999_999_999 }))).toMatch(/too large/);
    expect(firstIssue(orgQuestionSchema.safeParse({ question: "   " }))).toMatch(/more specific/);
    expect(firstIssue(orgQuestionSchema.safeParse({ question: "ab" }))).toMatch(/more specific/);
  });

  it("strips identity fields so a salary patch cannot rewrite email or employee id", () => {
    const parsed = compensationPatchSchema.safeParse({
      baseSalary: 120_000,
      email: "attacker@example.com",
      employeeId: "ACME-99999",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ baseSalary: 120_000 });
  });

  it("refuses unknown populations and questions that name two groups", async () => {
    expect(parseOrgQuestion("Show me salaries for Martians in Atlantis")).toEqual({ type: "unknown" });

    const martians = await answerOrgQuestion("Show me salaries for Martians in Atlantis");
    expect(martians.ok).toBe(false);
    expect(martians.intent).toBe("unknown");
    expect(martians.employees).toEqual([]);

    const departments = await answerOrgQuestion("How many people work in Sales and Marketing?");
    expect(departments.ok).toBe(false);
    expect(departments.intent).toBe("ambiguous");
    expect(departments.summary).toContain("Sales");
    expect(departments.summary).toContain("Marketing");
    expect(departments.summary).not.toMatch(/1,720/);

    const countries = await answerOrgQuestion("What is the average salary in the US and the UK?");
    expect(countries.ok).toBe(false);
    expect(countries.intent).toBe("ambiguous");
    expect(countries.summary).toContain("US");
    expect(countries.summary).toContain("UK");
    expect(countries.summary).not.toMatch(/166,186/);

    expect(parseOrgQuestion("Compare Engineering and Sales").type).toBe("compare_departments");
    expect(parseOrgQuestion("Who are the top 5 highest earners earning more than 200k in the UK?")).toEqual({
      type: "top_earners",
      limit: 5,
      country: "UK",
      minUsd: 200_000,
    });
  });

  describe.skipIf(!hasDatabase)("persisted compensation guards", () => {
    it("does not reinterpret local amounts when the currency tag changes", async () => {
      const employee = await prisma.employee.findFirstOrThrow({
        where: { currency: "GBP", status: "Active" },
      });
      await expect(updateCompensation(employee.id, { currency: "INR" })).rejects.toBeInstanceOf(CompensationRejectedError);
      const after = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
      expect(after.currency).toBe("GBP");
      expect(after.baseSalary).toBe(employee.baseSalary);
      expect(after.totalCompUsd).toBe(employee.totalCompUsd);
    });

    it("rejects a 100 million local salary before it can inflate payroll", async () => {
      const employee = await prisma.employee.findFirstOrThrow({
        where: { currency: "GBP", status: "Active" },
      });
      expect(compensationPatchSchema.safeParse({ baseSalary: 100_000_000 }).success).toBe(true);
      await expect(updateCompensation(employee.id, { baseSalary: 100_000_000 })).rejects.toThrow(/\$2,000,000/);
      const after = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
      expect(after.baseSalary).toBe(employee.baseSalary);
      expect(after.totalCompUsd).toBe(employee.totalCompUsd);
      expect(after.currency).toBe(employee.currency);
    });
  });
});
