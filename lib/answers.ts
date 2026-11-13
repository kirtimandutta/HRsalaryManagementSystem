import { formatNumber, formatPercent, formatUsd } from "@/lib/format";

export function populationPhrase(department?: string, country?: string): string {
  const place =
    country === "US" ? "the US" : country === "UK" ? "the UK" : country;
  if (department && place) return `${department} in ${place}`;
  if (department) return department;
  if (place) return place;
  return "the organization";
}

function peopleLabel(headcount: number): string {
  return `${formatNumber(headcount)} ${headcount === 1 ? "person" : "people"}`;
}

export function emptyPopulation(population: string): string {
  return `No active or on-leave employees match ${population}.`;
}

export function averageSummary(population: string, average: number, headcount: number): string {
  if (headcount === 0) return emptyPopulation(population);
  return `Average total compensation for ${population} is ${formatUsd(average)} across ${peopleLabel(headcount)}.`;
}

export function medianSummary(population: string, medianValue: number, headcount: number): string {
  if (headcount === 0) return emptyPopulation(population);
  return `Median total compensation for ${population} is ${formatUsd(medianValue)} across ${peopleLabel(headcount)}.`;
}

export function totalSummary(population: string, total: number, headcount: number): string {
  if (headcount === 0) return emptyPopulation(population);
  return `Annual payroll for ${population} is ${formatUsd(total)} across ${peopleLabel(headcount)}.`;
}

export function headcountSummary(population: string, headcount: number): string {
  if (headcount === 0) return emptyPopulation(population);
  return `${peopleLabel(headcount)} in ${population} are on payroll.`;
}

export function topEarnersSummary(population: string, highest: number, shown: number): string {
  if (shown === 0) return emptyPopulation(population);
  return `Highest total compensation in ${population} is ${formatUsd(highest)}. Showing ${formatNumber(shown)}.`;
}

export function thresholdSummary(population: string, amountUsd: number, headcount: number): string {
  if (headcount === 0) {
    return `Nobody on payroll in ${population} earns at least ${formatUsd(amountUsd)}.`;
  }
  return `${peopleLabel(headcount)} in ${population} earn at least ${formatUsd(amountUsd)} in total compensation.`;
}

export function compareSummary(
  left: { name: string; average: number; headcount: number },
  right: { name: string; average: number; headcount: number },
): string {
  return `${left.name} averages ${formatUsd(left.average)} across ${peopleLabel(left.headcount)}. ${right.name} averages ${formatUsd(right.average)} across ${peopleLabel(right.headcount)}.`;
}

export function rankingSummary(kind: "department" | "country", leader: string, total: number): string {
  return `${leader} carries the largest annual payroll by ${kind} at ${formatUsd(total)}.`;
}

export function mixSummary(population: string, baseShare: number, bonusShare: number, allowanceShare: number): string {
  return `For ${population}, base pay is ${formatPercent(baseShare)} of gross compensation, bonus is ${formatPercent(bonusShare)}, and allowances are ${formatPercent(allowanceShare)}.`;
}

export function snapshotSummary(
  population: string,
  average: number,
  medianValue: number,
  total: number,
  headcount: number,
): string {
  if (headcount === 0) return emptyPopulation(population);
  return `${population} averages ${formatUsd(average)} (median ${formatUsd(medianValue)}). Annual payroll is ${formatUsd(total)} across ${peopleLabel(headcount)}.`;
}

export function unknownSummary(): string {
  return "That question does not match a known compensation query. Try a sample, or name a department, a country, and the figure you want.";
}
