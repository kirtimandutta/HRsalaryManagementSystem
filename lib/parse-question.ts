import type { Country, Department } from "@/lib/constants";
import { populationPhrase } from "@/lib/answers";

export const SAMPLE_QUESTIONS = [
  "What is the average salary in Engineering in the US?",
  "Who are the top 5 highest earners in UK?",
  "Show me engineering salaries in the UK",
  "What is the total payroll for Sales?",
  "What is the median salary in Germany?",
  "How many people work in HR in India?",
  "What is the compensation mix for Sales?",
  "Which department has the highest payroll?",
  "Who earns more than 200k in Engineering?",
  "Compare Engineering and Sales",
] as const;

const DEPARTMENT_RULES: Array<{ pattern: RegExp; name: Department }> = [
  { pattern: /\bengineering\b|\bengineers?\b/, name: "Engineering" },
  { pattern: /\bproduct\b/, name: "Product" },
  { pattern: /\bdesign\b/, name: "Design" },
  { pattern: /\bsales\b/, name: "Sales" },
  { pattern: /\bmarketing\b/, name: "Marketing" },
  { pattern: /\bhuman resources\b|\bhr\b/, name: "HR" },
  { pattern: /\bfinance\b/, name: "Finance" },
  { pattern: /\boperations\b|\bops\b/, name: "Operations" },
];

const COUNTRY_RULES: Array<{ pattern: RegExp; name: Country }> = [
  { pattern: /\bunited states\b|\busa\b|\bus\b|\bamerica\b/, name: "US" },
  { pattern: /\bunited kingdom\b|\buk\b|\bbritain\b|\bengland\b/, name: "UK" },
  { pattern: /\bgermany\b|\bdeutschland\b/, name: "Germany" },
  { pattern: /\bindia\b/, name: "India" },
  { pattern: /\bcanada\b/, name: "Canada" },
  { pattern: /\bjapan\b/, name: "Japan" },
  { pattern: /\baustralia\b/, name: "Australia" },
];

export type OrgIntent =
  | { type: "average"; department?: Department; country?: Country }
  | { type: "median"; department?: Department; country?: Country }
  | { type: "total_payroll"; department?: Department; country?: Country }
  | { type: "top_earners"; limit: number; department?: Department; country?: Country; minUsd?: number }
  | { type: "headcount"; department?: Department; country?: Country }
  | { type: "comp_mix"; department?: Department; country?: Country }
  | { type: "threshold"; amountUsd: number; department?: Department; country?: Country }
  | { type: "department_ranking" }
  | { type: "country_ranking" }
  | { type: "compare_departments"; departments: [Department, Department] }
  | { type: "snapshot"; department?: Department; country?: Country }
  | { type: "ambiguous"; reason: "departments" | "countries"; names: [string, string] }
  | { type: "unknown" };

type Scope = { department?: Department; country?: Country };

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[?!,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchRules<T extends string>(text: string, rules: Array<{ pattern: RegExp; name: T }>): T[] {
  return rules
    .map((rule) => ({ name: rule.name, index: text.search(rule.pattern) }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index)
    .map((match) => match.name);
}

export function findDepartments(text: string): Department[] {
  return matchRules(text, DEPARTMENT_RULES);
}

export function findCountries(text: string): Country[] {
  return matchRules(text, COUNTRY_RULES);
}

export function findCountry(text: string): Country | undefined {
  return findCountries(text)[0];
}

function readLimit(text: string): number {
  const match = text.match(/\btop\s+(\d+)\b/) ?? text.match(/\b(\d+)\s+highest\b/);
  const requested = match ? Number(match[1]) : 5;
  if (!Number.isFinite(requested)) return 5;
  return Math.min(25, Math.max(1, Math.round(requested)));
}

function findAmountUsd(text: string): number | undefined {
  const pattern = /(?:\$|usd\s*)?(\d{1,3}(?:,\d{3})+|\d+)(\s*[km])?\b/g;
  const amounts: number[] = [];
  for (const match of text.matchAll(pattern)) {
    let value = Number(match[1]?.replace(/,/g, ""));
    const suffix = match[2]?.trim();
    if (suffix === "k") value *= 1_000;
    if (suffix === "m") value *= 1_000_000;
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }
  if (amounts.length === 0) return undefined;
  const meaningful = amounts.filter((value) => value >= 1_000);
  return meaningful.at(-1) ?? amounts.at(-1);
}

/**
 * Maps an HR question onto a fixed intent. The matcher is deterministic so an
 * answer can be traced to a query. It is not a language model.
 */
export function parseOrgQuestion(question: string): OrgIntent {
  const normalized = normalizeQuestion(question);
  if (!normalized) return { type: "unknown" };

  const departments = findDepartments(normalized);
  const countries = findCountries(normalized);
  const country = countries[0];
  const department = departments[0];
  const scope: Scope = {
    ...(department ? { department } : {}),
    ...(country ? { country } : {}),
  };

  const compareRequested =
    /\b(compare|vs|versus)\b/.test(normalized) ||
    (/\b(average|avg|mean)\b/.test(normalized) && /\band\b/.test(normalized));

  if (departments.length >= 2 && compareRequested) {
    return { type: "compare_departments", departments: [departments[0], departments[1]] };
  }
  if (departments.length >= 2) {
    return { type: "ambiguous", reason: "departments", names: [departments[0], departments[1]] };
  }
  if (countries.length >= 2) {
    return { type: "ambiguous", reason: "countries", names: [countries[0], countries[1]] };
  }

  if (/\btop\s+\d+\b|\btop\s+earners\b|\bhighest\s+earners\b|\bhighest\s+paid\b/.test(normalized)) {
    const asksForFloor = /\bmore than\b|\bgreater than\b|\bover\b|\babove\b|\bat least\b/.test(normalized);
    const minUsd = asksForFloor ? findAmountUsd(normalized) : undefined;
    return {
      type: "top_earners",
      limit: readLimit(normalized),
      ...scope,
      ...(minUsd ? { minUsd } : {}),
    };
  }

  if (/\bmedian\b/.test(normalized)) return { type: "median", ...scope };
  if (/\b(average|avg|mean)\b/.test(normalized)) return { type: "average", ...scope };
  if (/\btotal payroll\b|\bpayroll cost\b|\btotal compensation cost\b|\bhow much do we pay\b|\bpayroll for\b/.test(normalized)) {
    return { type: "total_payroll", ...scope };
  }
  if (/\bhow many\b|\bheadcount\b|\bnumber of (employees|people)\b/.test(normalized)) {
    return { type: "headcount", ...scope };
  }
  if (/\bmix\b|\bbonus share\b|\ballowances?\b/.test(normalized)) return { type: "comp_mix", ...scope };

  if (/\bmore than\b|\bgreater than\b|\bover\b|\babove\b|\bat least\b/.test(normalized)) {
    const amountUsd = findAmountUsd(normalized);
    if (amountUsd === undefined) return { type: "unknown" };
    return { type: "threshold", amountUsd, ...scope };
  }

  if (/\bwhich department\b|\bby department\b|\bdepartment breakdown\b|\bhighest payroll\b/.test(normalized)) {
    return { type: "department_ranking" };
  }
  if (/\bby country\b|\bwhich country\b|\bcountry breakdown\b/.test(normalized)) {
    return { type: "country_ranking" };
  }
  if (department || country) return { type: "snapshot", ...scope };
  return { type: "unknown" };
}

export function intentLabel(intent: OrgIntent): string {
  switch (intent.type) {
    case "average":
      return "Average compensation";
    case "median":
      return "Median compensation";
    case "total_payroll":
      return "Total payroll";
    case "top_earners":
      return "Highest earners";
    case "headcount":
      return "Headcount";
    case "comp_mix":
      return "Compensation mix";
    case "threshold":
      return "Pay threshold";
    case "department_ranking":
      return "Department ranking";
    case "country_ranking":
      return "Country ranking";
    case "compare_departments":
      return "Department comparison";
    case "snapshot":
      return "Population snapshot";
    case "ambiguous":
      return "Needs a single population";
    case "unknown":
      return "Unrecognized question";
  }
}

export function describeIntent(intent: OrgIntent): string {
  switch (intent.type) {
    case "average":
      return `Average total compensation for ${populationPhrase(intent.department, intent.country)}, in USD.`;
    case "median":
      return `Median total compensation for ${populationPhrase(intent.department, intent.country)}, in USD.`;
    case "total_payroll":
      return `Annual gross payroll for ${populationPhrase(intent.department, intent.country)}.`;
    case "top_earners":
      return intent.minUsd
        ? `Top ${intent.limit} total-compensation earners in ${populationPhrase(intent.department, intent.country)} at or above ${intent.minUsd.toLocaleString("en-US")} USD.`
        : `Top ${intent.limit} total-compensation earners in ${populationPhrase(intent.department, intent.country)}.`;
    case "headcount":
      return `Payroll headcount for ${populationPhrase(intent.department, intent.country)}.`;
    case "comp_mix":
      return `Base, bonus, and allowance share for ${populationPhrase(intent.department, intent.country)}.`;
    case "threshold":
      return `People in ${populationPhrase(intent.department, intent.country)} at or above ${intent.amountUsd.toLocaleString("en-US")} USD total compensation.`;
    case "department_ranking":
      return "Departments ranked by annual gross payroll.";
    case "country_ranking":
      return "Countries ranked by annual gross payroll.";
    case "compare_departments":
      return `Average total compensation for ${intent.departments[0]} beside ${intent.departments[1]}.`;
    case "snapshot":
      return `Headcount, average, median, payroll, and top earners for ${populationPhrase(intent.department, intent.country)}.`;
    case "ambiguous":
      return intent.reason === "countries"
        ? `The question names ${intent.names[0]} and ${intent.names[1]}. Ask about one country at a time.`
        : `The question names ${intent.names[0]} and ${intent.names[1]}. Ask about one department at a time, or compare them explicitly.`;
    case "unknown":
      return "The question did not match a known compensation query.";
  }
}
