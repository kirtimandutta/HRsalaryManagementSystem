import { describe, expect, it } from "vitest";
import { describeIntent, parseOrgQuestion, SAMPLE_QUESTIONS } from "@/lib/parse-question";

describe("Ask the Org parser", () => {
  it("maps the questions HR asks in the product brief", () => {
    expect(parseOrgQuestion("What is the average salary in Engineering in the US?")).toEqual({
      type: "average",
      department: "Engineering",
      country: "US",
    });
    expect(parseOrgQuestion("Who are the top 5 highest earners in UK?")).toEqual({
      type: "top_earners",
      limit: 5,
      country: "UK",
    });
    expect(parseOrgQuestion("Show me engineering salaries in the UK")).toEqual({
      type: "snapshot",
      department: "Engineering",
      country: "UK",
    });
    expect(parseOrgQuestion("What is the total payroll for Sales?")).toEqual({
      type: "total_payroll",
      department: "Sales",
    });
  });

  it("covers medians, headcount, mix, rank, thresholds, and comparisons", () => {
    expect(parseOrgQuestion("What is the median salary in Germany?")).toMatchObject({
      type: "median",
      country: "Germany",
    });
    expect(parseOrgQuestion("How many people work in HR in India?")).toMatchObject({
      type: "headcount",
      department: "HR",
      country: "India",
    });
    expect(parseOrgQuestion("What is the compensation mix for Sales?")).toMatchObject({
      type: "comp_mix",
      department: "Sales",
    });
    expect(parseOrgQuestion("Which department has the highest payroll?")).toEqual({
      type: "department_ranking",
    });
    expect(parseOrgQuestion("Who earns more than 200k in Engineering?")).toEqual({
      type: "threshold",
      amountUsd: 200_000,
      department: "Engineering",
    });
    expect(parseOrgQuestion("Compare Sales and Engineering")).toEqual({
      type: "compare_departments",
      departments: ["Sales", "Engineering"],
    });
  });

  it("caps a long top-earner list and leaves unknown questions unmatched", () => {
    expect(parseOrgQuestion("top 100 highest earners")).toMatchObject({ type: "top_earners", limit: 25 });
    expect(parseOrgQuestion("hello there")).toEqual({ type: "unknown" });
    expect(describeIntent({ type: "unknown" })).toMatch(/did not match/);
  });

  it("keeps every sample question on a known intent", () => {
    for (const question of SAMPLE_QUESTIONS) {
      expect(parseOrgQuestion(question).type).not.toBe("unknown");
    }
  });
});
