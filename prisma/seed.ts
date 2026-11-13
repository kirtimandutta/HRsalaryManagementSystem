/**
 * Deterministic workforce of exactly 10,000 employees.
 * Re-running the seed deletes compensation edits and audit history.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import type { Country, Department, EmploymentType, Seniority } from "../lib/constants";
import { COUNTRY_CURRENCY } from "../lib/constants";
import { compensationSnapshot, FX_TO_USD } from "../lib/currency";

const prisma = new PrismaClient();
const TARGET = 10_000;
const BATCH = 500;
const SEEDED_AT = new Date("2026-11-01T00:00:00.000Z");

const DEPARTMENTS: ReadonlyArray<readonly [Department, number]> = [
  ["Engineering", 0.32],
  ["Sales", 0.18],
  ["Operations", 0.17],
  ["Marketing", 0.09],
  ["Product", 0.08],
  ["Finance", 0.07],
  ["Design", 0.05],
  ["HR", 0.04],
];

const COUNTRIES: ReadonlyArray<readonly [Country, number]> = [
  ["US", 0.32],
  ["India", 0.25],
  ["UK", 0.12],
  ["Germany", 0.1],
  ["Canada", 0.08],
  ["Australia", 0.07],
  ["Japan", 0.06],
];

const BANDS: ReadonlyArray<readonly [Seniority, number]> = [
  ["Junior", 0.28],
  ["Mid", 0.34],
  ["Senior", 0.22],
  ["Lead", 0.12],
  ["Executive", 0.04],
];

const EMPLOYMENT: ReadonlyArray<readonly [EmploymentType, number]> = [
  ["Full-time", 0.86],
  ["Contract", 0.08],
  ["Part-time", 0.06],
];

const STATUS: ReadonlyArray<readonly ["Active" | "On Leave" | "Terminated", number]> = [
  ["Active", 0.92],
  ["On Leave", 0.05],
  ["Terminated", 0.03],
];

const SALARY_BANDS: Record<Seniority, { mean: number; sd: number; min: number; max: number }> = {
  Junior: { mean: 72_000, sd: 8_000, min: 48_000, max: 95_000 },
  Mid: { mean: 110_000, sd: 12_000, min: 80_000, max: 145_000 },
  Senior: { mean: 155_000, sd: 15_000, min: 120_000, max: 195_000 },
  Lead: { mean: 195_000, sd: 18_000, min: 155_000, max: 250_000 },
  Executive: { mean: 280_000, sd: 40_000, min: 210_000, max: 420_000 },
};

const DEPARTMENT_FACTOR: Record<Department, number> = {
  Engineering: 1.18,
  Product: 1.1,
  Design: 1.02,
  Sales: 0.92,
  Marketing: 0.96,
  HR: 0.88,
  Finance: 1.05,
  Operations: 0.84,
};

const LOCATION_FACTOR: Record<Country, number> = {
  US: 1.12,
  UK: 0.92,
  Germany: 0.95,
  Canada: 0.9,
  Australia: 0.93,
  Japan: 0.78,
  India: 0.32,
};

const BONUS_RATE: Record<Seniority, number> = {
  Junior: 0.08,
  Mid: 0.12,
  Senior: 0.15,
  Lead: 0.18,
  Executive: 0.28,
};

const ALLOWANCE_RATE: Record<Country, number> = {
  India: 0.12,
  Japan: 0.08,
  Germany: 0.05,
  Australia: 0.04,
  US: 0.03,
  UK: 0.03,
  Canada: 0.03,
};

const TITLES: Record<Department, Record<Seniority, readonly string[]>> = {
  Engineering: {
    Junior: ["Software Engineer I", "Junior QA Engineer", "Associate Developer"],
    Mid: ["Software Engineer II", "Backend Engineer", "Frontend Engineer"],
    Senior: ["Senior Software Engineer", "Senior Platform Engineer"],
    Lead: ["Engineering Lead", "Staff Engineer"],
    Executive: ["Director of Engineering", "VP of Engineering"],
  },
  Product: {
    Junior: ["Associate Product Manager", "Product Analyst"],
    Mid: ["Product Manager", "Technical Product Manager"],
    Senior: ["Senior Product Manager"],
    Lead: ["Group Product Manager", "Principal Product Manager"],
    Executive: ["Director of Product", "VP of Product"],
  },
  Design: {
    Junior: ["Junior Product Designer", "Visual Designer"],
    Mid: ["Product Designer", "UX Designer"],
    Senior: ["Senior Product Designer"],
    Lead: ["Design Lead", "Principal Designer"],
    Executive: ["Director of Design", "Head of Design"],
  },
  Sales: {
    Junior: ["Sales Development Representative", "Account Coordinator"],
    Mid: ["Account Executive", "Sales Manager"],
    Senior: ["Senior Account Executive"],
    Lead: ["Regional Sales Lead", "Enterprise Sales Lead"],
    Executive: ["Director of Sales", "VP of Sales"],
  },
  Marketing: {
    Junior: ["Marketing Coordinator", "Content Associate"],
    Mid: ["Marketing Manager", "Demand Generation Manager"],
    Senior: ["Senior Marketing Manager"],
    Lead: ["Marketing Lead", "Brand Lead"],
    Executive: ["Director of Marketing", "VP of Marketing"],
  },
  HR: {
    Junior: ["HR Coordinator", "People Operations Associate"],
    Mid: ["HR Business Partner", "Talent Partner"],
    Senior: ["Senior HR Business Partner"],
    Lead: ["HR Lead", "Head of Talent"],
    Executive: ["Director of People", "VP of People"],
  },
  Finance: {
    Junior: ["Financial Analyst", "Accountant"],
    Mid: ["Finance Manager", "Senior Accountant"],
    Senior: ["Senior Financial Analyst"],
    Lead: ["Finance Lead", "Controller"],
    Executive: ["Director of Finance", "VP of Finance"],
  },
  Operations: {
    Junior: ["Operations Coordinator", "Logistics Associate"],
    Mid: ["Operations Manager", "Program Manager"],
    Senior: ["Senior Operations Manager"],
    Lead: ["Operations Lead", "Regional Operations Lead"],
    Executive: ["Director of Operations", "VP of Operations"],
  },
};

const ANGLO = {
  first: ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Daniel", "Emily", "Matthew", "Ashley", "Andrew", "Hannah", "Joshua", "Olivia", "Christopher", "Emma", "Anthony", "Sophia", "Ryan", "Grace", "Nicholas", "Chloe", "Jonathan", "Abigail"],
  last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson", "Carter", "Mitchell"],
};

const INDIAN = {
  first: ["Aarav", "Vivaan", "Aditya", "Arjun", "Ishaan", "Ananya", "Diya", "Aadhya", "Priya", "Rahul", "Neha", "Amit", "Pooja", "Rohan", "Sneha", "Karan", "Isha", "Vikram", "Anjali", "Suresh", "Kavita", "Nikhil", "Shreya", "Meera", "Deepak"],
  last: ["Sharma", "Verma", "Patel", "Gupta", "Reddy", "Nair", "Iyer", "Singh", "Mehta", "Joshi", "Kapoor", "Rao", "Das", "Bose", "Banerjee", "Pillai", "Menon", "Kulkarni", "Ghosh", "Malhotra", "Bhat", "Agarwal", "Mishra", "Choudhury"],
};

const JAPANESE = {
  first: ["Haruto", "Yuto", "Sota", "Yuki", "Haruki", "Ren", "Takumi", "Yui", "Hina", "Aoi", "Sakura", "Akari", "Kenji", "Yoko", "Hiroshi", "Naomi", "Takeshi", "Emi", "Daiki", "Misaki", "Shota", "Rina"],
  last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Saito"],
};

const GERMAN = {
  first: ["Lukas", "Leon", "Finn", "Emil", "Mia", "Hanna", "Lina", "Sophie", "Lena", "Clara", "Markus", "Sabine", "Stefan", "Petra", "Andreas", "Julia", "Katharina", "Jonas", "Greta", "Felix"],
  last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Krüger"],
};

function mulberry32(seed: number) {
  let state = seed;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  const value = values[Math.floor(rng() * values.length)];
  if (value === undefined) throw new Error("Cannot pick from an empty list.");
  return value;
}

function pickWeighted<T extends string>(rng: () => number, table: readonly (readonly [T, number])[]): T {
  const roll = rng();
  let cursor = 0;
  for (const [value, weight] of table) {
    cursor += weight;
    if (roll <= cursor) return value;
  }
  const last = table[table.length - 1]?.[0];
  if (!last) throw new Error("Weight table is empty.");
  return last;
}

function assertWeights(label: string, table: readonly (readonly [string, number])[]) {
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`${label} weights sum to ${total}, expected 1.`);
  }
}

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

function namesFor(country: Country) {
  if (country === "India") return INDIAN;
  if (country === "Japan") return JAPANESE;
  if (country === "Germany") return GERMAN;
  return ANGLO;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hireDate(rng: () => number, seniority: Seniority): Date {
  const start =
    seniority === "Junior" ? Date.UTC(2021, 0, 1) : seniority === "Executive" ? Date.UTC(2012, 0, 1) : Date.UTC(2015, 0, 1);
  const end = Date.UTC(2026, 9, 1);
  return new Date(start + rng() * (end - start));
}

function buildRecords(rng: () => number): Prisma.EmployeeCreateManyInput[] {
  const records: Prisma.EmployeeCreateManyInput[] = [];

  for (let index = 0; index < TARGET; index += 1) {
    const department = pickWeighted(rng, DEPARTMENTS);
    const country = pickWeighted(rng, COUNTRIES);
    const seniority = pickWeighted(rng, BANDS);
    const employmentType = pickWeighted(rng, EMPLOYMENT);
    const status = pickWeighted(rng, STATUS);
    const currency = COUNTRY_CURRENCY[country];
    const names = namesFor(country);
    const firstName = pick(rng, names.first);
    const lastName = pick(rng, names.last);
    const employeeId = `ACME-${String(index + 1).padStart(5, "0")}`;
    const band = SALARY_BANDS[seniority];
    const scale = DEPARTMENT_FACTOR[department] * LOCATION_FACTOR[country];
    let baseUsd = clamp(band.mean * scale + gaussian(rng) * band.sd * scale, band.min * scale, band.max * scale);
    if (employmentType === "Part-time") baseUsd *= 0.55;
    if (employmentType === "Contract") baseUsd *= 1.08;

    let bonusRate = BONUS_RATE[seniority] * (0.85 + rng() * 0.3);
    if (department === "Sales") bonusRate += 0.12;
    if (employmentType === "Contract") bonusRate *= 0.35;
    let allowanceRate = ALLOWANCE_RATE[country];
    if (seniority === "Executive") allowanceRate += 0.02;
    if (employmentType === "Contract") allowanceRate = 0;

    const rate = FX_TO_USD[currency];
    const baseSalary = Math.round(baseUsd / rate);
    const bonus = Math.round((baseUsd * bonusRate) / rate);
    const allowance = Math.round((baseUsd * allowanceRate) / rate);
    const snapshot = compensationSnapshot({ baseSalary, bonus, allowance, currency });

    records.push({
      id: `emp_${String(index + 1).padStart(5, "0")}`,
      employeeId,
      firstName,
      lastName,
      email: `${slug(firstName)}.${slug(lastName)}.${employeeId.toLowerCase()}@acme.example`,
      department,
      title: pick(rng, TITLES[department][seniority]),
      seniority,
      country,
      currency,
      employmentType,
      baseSalary,
      bonus,
      allowance,
      ...snapshot,
      hireDate: hireDate(rng, seniority),
      status,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    });
  }

  return records;
}

function tally(records: Prisma.EmployeeCreateManyInput[], key: "country" | "department" | "seniority" | "status") {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = String(record[key]);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

async function main() {
  for (const [label, table] of [
    ["department", DEPARTMENTS],
    ["country", COUNTRIES],
    ["band", BANDS],
    ["employment", EMPLOYMENT],
    ["status", STATUS],
  ] as const) {
    assertWeights(label, table);
  }

  const records = buildRecords(mulberry32(20261113));
  if (records.length !== TARGET) {
    throw new Error(`Expected ${TARGET} records, built ${records.length}.`);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.auditLog.deleteMany();
      await tx.employee.deleteMany();
      for (let index = 0; index < records.length; index += BATCH) {
        await tx.employee.createMany({ data: records.slice(index, index + BATCH) });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  const count = await prisma.employee.count();
  if (count !== TARGET) {
    throw new Error(`Seed count mismatch: ${count}.`);
  }

  console.log(`Seeded ${count} employees.`);
  for (const key of ["country", "department", "seniority", "status"] as const) {
    console.log(key, Object.fromEntries(tally(records, key)));
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
