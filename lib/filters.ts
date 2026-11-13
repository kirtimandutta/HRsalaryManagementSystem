import {
  COUNTRIES,
  CURRENCIES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  SENIORITY_BANDS,
  STATUSES,
  type Country,
  type CurrencyCode,
  type Department,
  type EmploymentStatus,
  type EmploymentType,
  type Seniority,
} from "@/lib/constants";

export const SORT_KEYS = ["name", "salary", "department", "country", "hireDate", "employeeId"] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export type EmployeeQuery = {
  page: number;
  pageSize: number;
  search?: string;
  department?: Department;
  country?: Country;
  currency?: CurrencyCode;
  seniority?: Seniority;
  employmentType?: EmploymentType;
  status?: EmploymentStatus;
  minSalaryUsd?: number;
  maxSalaryUsd?: number;
  sort: SortKey;
  dir: SortDirection;
};

type TextFilter = { contains: string };

export type EmployeeWhere = {
  AND?: EmployeeWhere[];
  OR?: EmployeeWhere[];
  department?: string;
  country?: string;
  currency?: string;
  seniority?: string;
  employmentType?: string;
  status?: string;
  totalCompUsd?: { gte?: number; lte?: number };
  firstName?: TextFilter;
  lastName?: TextFilter;
  email?: TextFilter;
  employeeId?: TextFilter;
  title?: TextFilter;
};

export type OrderField =
  | { lastName: SortDirection }
  | { firstName: SortDirection }
  | { department: SortDirection }
  | { country: SortDirection }
  | { hireDate: SortDirection }
  | { employeeId: SortDirection }
  | { totalCompUsd: SortDirection };

export type ParseResult = { ok: true; query: EmployeeQuery } | { ok: false; error: string };

function readEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  label: string,
): { ok: true; value?: T } | { ok: false; error: string } {
  if (!value || value === "all") return { ok: true };
  if ((allowed as readonly string[]).includes(value)) {
    return { ok: true, value: value as T };
  }
  return { ok: false, error: `${label} must be one of: ${allowed.join(", ")}.` };
}

function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  max: number,
  label: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!value?.trim()) return { ok: true, value: fallback };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    return { ok: false, error: `${label} must be an integer from 1 to ${max}.` };
  }
  return { ok: true, value: parsed };
}

function readMoney(
  value: string | undefined,
  label: string,
): { ok: true; value?: number } | { ok: false; error: string } {
  if (!value?.trim()) return { ok: true };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false, error: `${label} must be a non-negative number.` };
  }
  return { ok: true, value: parsed };
}

export function parseEmployeeQuery(input: Record<string, string | undefined>): ParseResult {
  const page = readBoundedInteger(input.page, 1, 100_000, "Page");
  if (!page.ok) return page;
  const pageSize = readBoundedInteger(input.pageSize, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, "Page size");
  if (!pageSize.ok) return pageSize;

  const department = readEnum(input.department, DEPARTMENTS, "Department");
  if (!department.ok) return department;
  const country = readEnum(input.country, COUNTRIES, "Country");
  if (!country.ok) return country;
  const currency = readEnum(input.currency, CURRENCIES, "Currency");
  if (!currency.ok) return currency;
  const seniority = readEnum(input.seniority, SENIORITY_BANDS, "Salary band");
  if (!seniority.ok) return seniority;
  const employmentType = readEnum(input.employmentType, EMPLOYMENT_TYPES, "Employment type");
  if (!employmentType.ok) return employmentType;
  const status = readEnum(input.status, STATUSES, "Status");
  if (!status.ok) return status;

  const minSalaryUsd = readMoney(input.minSalaryUsd, "Minimum salary");
  if (!minSalaryUsd.ok) return minSalaryUsd;
  const maxSalaryUsd = readMoney(input.maxSalaryUsd, "Maximum salary");
  if (!maxSalaryUsd.ok) return maxSalaryUsd;
  if (
    minSalaryUsd.value !== undefined &&
    maxSalaryUsd.value !== undefined &&
    minSalaryUsd.value > maxSalaryUsd.value
  ) {
    return { ok: false, error: "Minimum salary cannot be greater than maximum salary." };
  }

  const sort = readEnum(input.sort, SORT_KEYS, "Sort");
  if (!sort.ok) return sort;
  const dir = readEnum(input.dir, ["asc", "desc"] as const, "Sort direction");
  if (!dir.ok) return dir;

  const resolvedSort = sort.value ?? "name";
  const resolvedDir = dir.value ?? (resolvedSort === "salary" ? "desc" : "asc");
  const search = input.search?.trim();

  return {
    ok: true,
    query: {
      page: page.value,
      pageSize: pageSize.value,
      ...(search ? { search } : {}),
      ...(department.value ? { department: department.value } : {}),
      ...(country.value ? { country: country.value } : {}),
      ...(currency.value ? { currency: currency.value } : {}),
      ...(seniority.value ? { seniority: seniority.value } : {}),
      ...(employmentType.value ? { employmentType: employmentType.value } : {}),
      ...(status.value ? { status: status.value } : {}),
      ...(minSalaryUsd.value !== undefined ? { minSalaryUsd: minSalaryUsd.value } : {}),
      ...(maxSalaryUsd.value !== undefined ? { maxSalaryUsd: maxSalaryUsd.value } : {}),
      sort: resolvedSort,
      dir: resolvedDir,
    },
  };
}

export function buildEmployeeWhere(query: EmployeeQuery): EmployeeWhere {
  const where: EmployeeWhere = {};
  const and: EmployeeWhere[] = [];

  if (query.search) {
    for (const token of query.search.split(/\s+/).filter(Boolean)) {
      and.push({
        OR: [
          { firstName: { contains: token } },
          { lastName: { contains: token } },
          { email: { contains: token } },
          { employeeId: { contains: token } },
          { title: { contains: token } },
        ],
      });
    }
  }

  if (query.department) where.department = query.department;
  if (query.country) where.country = query.country;
  if (query.currency) where.currency = query.currency;
  if (query.seniority) where.seniority = query.seniority;
  if (query.employmentType) where.employmentType = query.employmentType;
  if (query.status) where.status = query.status;

  if (query.minSalaryUsd !== undefined || query.maxSalaryUsd !== undefined) {
    where.totalCompUsd = {
      ...(query.minSalaryUsd !== undefined ? { gte: query.minSalaryUsd } : {}),
      ...(query.maxSalaryUsd !== undefined ? { lte: query.maxSalaryUsd } : {}),
    };
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export function buildEmployeeOrderBy(query: EmployeeQuery): OrderField[] {
  const dir = query.dir;
  switch (query.sort) {
    case "salary":
      return [{ totalCompUsd: dir }, { employeeId: "asc" }];
    case "department":
      return [{ department: dir }, { lastName: "asc" }, { employeeId: "asc" }];
    case "country":
      return [{ country: dir }, { lastName: "asc" }, { employeeId: "asc" }];
    case "hireDate":
      return [{ hireDate: dir }, { employeeId: "asc" }];
    case "employeeId":
      return [{ employeeId: dir }];
    case "name":
    default:
      return [{ lastName: dir }, { firstName: dir }, { employeeId: "asc" }];
  }
}
