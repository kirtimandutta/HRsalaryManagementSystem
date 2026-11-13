/** Workforce dimensions shared by the seed, filters, and UI. */

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
] as const;

export const COUNTRIES = [
  "US",
  "UK",
  "Germany",
  "India",
  "Canada",
  "Japan",
  "Australia",
] as const;

export const CURRENCIES = ["USD", "GBP", "EUR", "INR", "CAD", "JPY", "AUD"] as const;

export const SENIORITY_BANDS = ["Junior", "Mid", "Senior", "Lead", "Executive"] as const;

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract"] as const;

export const STATUSES = ["Active", "On Leave", "Terminated"] as const;

/** People who still sit on the gross-pay cost. Terminated employees stay in the directory only. */
export const PAYROLL_STATUSES = ["Active", "On Leave"] as const;

export const COUNTRY_CURRENCY = {
  US: "USD",
  UK: "GBP",
  Germany: "EUR",
  India: "INR",
  Canada: "CAD",
  Japan: "JPY",
  Australia: "AUD",
} as const;

export const COMP_FIELD_LABELS: Record<string, string> = {
  baseSalary: "Base salary",
  bonus: "Bonus",
  allowance: "Allowance",
  currency: "Currency",
};

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

export type Department = (typeof DEPARTMENTS)[number];
export type Country = (typeof COUNTRIES)[number];
export type CurrencyCode = (typeof CURRENCIES)[number];
export type Seniority = (typeof SENIORITY_BANDS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmploymentStatus = (typeof STATUSES)[number];
