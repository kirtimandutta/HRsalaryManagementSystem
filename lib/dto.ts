import type { EmployeeDto } from "@/lib/types";
import { totalCompLocal } from "@/lib/currency";

export const employeeListSelect = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  email: true,
  department: true,
  title: true,
  seniority: true,
  country: true,
  currency: true,
  employmentType: true,
  baseSalary: true,
  bonus: true,
  allowance: true,
  totalCompUsd: true,
  hireDate: true,
  status: true,
} as const;

export type EmployeeRecord = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  seniority: string;
  country: string;
  currency: string;
  employmentType: string;
  baseSalary: number;
  bonus: number;
  allowance: number;
  baseSalaryUsd?: number;
  bonusUsd?: number;
  allowanceUsd?: number;
  totalCompUsd: number;
  hireDate: Date | string;
  status: string;
};

export function toEmployeeDto(employee: EmployeeRecord): EmployeeDto {
  const hireDate =
    employee.hireDate instanceof Date
      ? employee.hireDate.toISOString().slice(0, 10)
      : new Date(employee.hireDate).toISOString().slice(0, 10);

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    department: employee.department,
    title: employee.title,
    seniority: employee.seniority,
    country: employee.country,
    currency: employee.currency,
    employmentType: employee.employmentType,
    baseSalary: employee.baseSalary,
    bonus: employee.bonus,
    allowance: employee.allowance,
    totalCompLocal: totalCompLocal(employee),
    totalCompUsd: employee.totalCompUsd,
    monthlyCompUsd: Math.round((employee.totalCompUsd / 12) * 100) / 100,
    hireDate,
    status: employee.status,
  };
}
