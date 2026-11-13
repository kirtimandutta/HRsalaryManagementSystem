import { CURRENCIES, type CurrencyCode } from "@/lib/constants";

/**
 * Static reference rates, units of foreign currency to one USD.
 * Dated on purpose: dashboard, edits, and Ask the Org must agree.
 * This is not a market feed.
 */
export const FX_AS_OF = "2026-11-01";
export const FX_AS_OF_LABEL = "1 Nov 2026";

export const FX_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.08,
  INR: 0.012,
  CAD: 0.74,
  JPY: 0.0067,
  AUD: 0.66,
};

export function isCurrency(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function toUsd(amountLocal: number, currency: string): number {
  if (!isCurrency(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return amountLocal * FX_TO_USD[currency];
}

export function roundUsd(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function totalCompLocal(input: { baseSalary: number; bonus: number; allowance: number }): number {
  return input.baseSalary + input.bonus + input.allowance;
}

/**
 * Every compensation write (seed and salary edit) must persist this snapshot.
 * Aggregates read the stored USD columns and never sum mixed local currencies.
 */
export function compensationSnapshot(input: {
  baseSalary: number;
  bonus: number;
  allowance: number;
  currency: string;
}): {
  baseSalaryUsd: number;
  bonusUsd: number;
  allowanceUsd: number;
  totalCompUsd: number;
} {
  const baseSalaryUsd = roundUsd(toUsd(input.baseSalary, input.currency));
  const bonusUsd = roundUsd(toUsd(input.bonus, input.currency));
  const allowanceUsd = roundUsd(toUsd(input.allowance, input.currency));
  return {
    baseSalaryUsd,
    bonusUsd,
    allowanceUsd,
    totalCompUsd: roundUsd(baseSalaryUsd + bonusUsd + allowanceUsd),
  };
}
