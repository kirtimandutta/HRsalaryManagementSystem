import { describe, expect, it } from "vitest";
import { averageSummary, thresholdSummary, totalSummary } from "@/lib/answers";

describe("answer copy", () => {
  it("states the population, the figure, and the headcount", () => {
    expect(averageSummary("Engineering in the US", 184220, 812)).toBe(
      "Average total compensation for Engineering in the US is $184,220 across 812 people.",
    );
    expect(totalSummary("Sales", 2500000, 40)).toBe(
      "Annual payroll for Sales is $2,500,000 across 40 people.",
    );
    expect(thresholdSummary("Engineering", 200000, 42)).toBe(
      "42 people in Engineering earn at least $200,000 in total compensation.",
    );
    expect(averageSummary("Antarctica", 0, 0)).toBe("No active or on-leave employees match Antarctica.");
  });
});
