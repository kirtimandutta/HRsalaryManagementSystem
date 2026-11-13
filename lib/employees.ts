import type { Prisma } from "@prisma/client";
import { compensationSnapshot, MAX_TOTAL_COMP_USD } from "@/lib/currency";
import { employeeListSelect, toEmployeeDto } from "@/lib/dto";
import { invalidatePayrollCache } from "@/lib/payroll-cache";
import { buildEmployeeOrderBy, buildEmployeeWhere, type EmployeeQuery } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import type { AuditDto, EmployeeDto, EmployeeListResponse } from "@/lib/types";
import type { CompensationPatch } from "@/lib/validators";

export class EmployeeNotFoundError extends Error {
  constructor() {
    super("Employee not found.");
    this.name = "EmployeeNotFoundError";
  }
}

export class NoCompensationChangeError extends Error {
  constructor() {
    super("No compensation changes to save.");
    this.name = "NoCompensationChangeError";
  }
}

export class CompensationRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompensationRejectedError";
  }
}

function sameMoney(left: number, right: number): boolean {
  return Math.round(left) === Math.round(right);
}

export async function listEmployees(query: EmployeeQuery): Promise<EmployeeListResponse> {
  const where = buildEmployeeWhere(query) as Prisma.EmployeeWhereInput;
  const orderBy = buildEmployeeOrderBy(query) as Prisma.EmployeeOrderByWithRelationInput[];
  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: employeeListSelect,
    }),
  ]);

  return {
    data: rows.map(toEmployeeDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getEmployeeDetail(id: string): Promise<{ employee: EmployeeDto; audits: AuditDto[] }> {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      ...employeeListSelect,
      auditLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!employee) throw new EmployeeNotFoundError();

  const { auditLogs, ...record } = employee;
  return {
    employee: toEmployeeDto(record),
    audits: auditLogs.map((entry) => ({
      id: entry.id,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function updateCompensation(id: string, input: CompensationPatch): Promise<EmployeeDto> {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new EmployeeNotFoundError();

  if (input.currency !== undefined && input.currency !== existing.currency) {
    throw new CompensationRejectedError(
      "Currency cannot be changed on an existing salary. Enter the new amounts in the current currency so the USD total is not reinterpreted.",
    );
  }

  const next = {
    baseSalary: Math.round(input.baseSalary ?? existing.baseSalary),
    bonus: Math.round(input.bonus ?? existing.bonus),
    allowance: Math.round(input.allowance ?? existing.allowance),
    currency: input.currency ?? existing.currency,
  };

  const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
  if (input.baseSalary !== undefined && !sameMoney(input.baseSalary, existing.baseSalary)) {
    changes.push({ field: "baseSalary", oldValue: String(existing.baseSalary), newValue: String(next.baseSalary) });
  }
  if (input.bonus !== undefined && !sameMoney(input.bonus, existing.bonus)) {
    changes.push({ field: "bonus", oldValue: String(existing.bonus), newValue: String(next.bonus) });
  }
  if (input.allowance !== undefined && !sameMoney(input.allowance, existing.allowance)) {
    changes.push({ field: "allowance", oldValue: String(existing.allowance), newValue: String(next.allowance) });
  }
  if (changes.length === 0) throw new NoCompensationChangeError();

  const changedBy = (input.changedBy ?? "HR Manager").replace(/[\u0000-\u001F]/g, "").trim() || "HR Manager";
  const snapshot = compensationSnapshot(next);
  if (snapshot.totalCompUsd > MAX_TOTAL_COMP_USD) {
    throw new CompensationRejectedError(
      `Total compensation would exceed $${MAX_TOTAL_COMP_USD.toLocaleString("en-US")} USD. Keep the gross amount inside that ceiling.`,
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.employee.update({
      where: { id },
      data: { ...next, ...snapshot },
    }),
    prisma.auditLog.createMany({
      data: changes.map((change) => ({
        employeeId: id,
        action: "compensation.update",
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedBy,
      })),
    }),
  ]);

  invalidatePayrollCache();
  return toEmployeeDto(updated);
}
