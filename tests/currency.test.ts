import { describe, expect, it } from "vitest";
import { compensationSnapshot, FX_TO_USD, roundUsd, toUsd } from "@/lib/currency";

describe("currency normalization", () => {
  it("converts a local amount with the published rate", () => {
    expect(toUsd(100, "GBP")).toBe(127);
    expect(toUsd(100_000, "INR")).toBe(1200);
    expect(toUsd(10_000_000, "JPY")).toBeCloseTo(67_000, 5);
    expect(toUsd(50_000, "USD")).toBe(50_000);
  });

  it("rejects an unknown currency", () => {
    expect(() => toUsd(10, "CHF")).toThrow(/Unsupported currency/);
  });

  it("stores USD parts that add back to the total", () => {
    const snapshot = compensationSnapshot({
      baseSalary: 100_000,
      bonus: 15_000,
      allowance: 5_000,
      currency: "USD",
    });
    expect(snapshot).toEqual({
      baseSalaryUsd: 100_000,
      bonusUsd: 15_000,
      allowanceUsd: 5_000,
      totalCompUsd: 120_000,
    });
  });

  it("rounds converted GBP amounts to cents", () => {
    const snapshot = compensationSnapshot({
      baseSalary: 10,
      bonus: 1,
      allowance: 0,
      currency: "GBP",
    });
    expect(snapshot.baseSalaryUsd).toBe(roundUsd(10 * FX_TO_USD.GBP));
    expect(snapshot.totalCompUsd).toBe(roundUsd(snapshot.baseSalaryUsd + snapshot.bonusUsd + snapshot.allowanceUsd));
  });
});
