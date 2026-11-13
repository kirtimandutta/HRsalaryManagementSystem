export type EmployeeDto = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
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
  totalCompLocal: number;
  totalCompUsd: number;
  monthlyCompUsd: number;
  hireDate: string;
  status: string;
};

export type AuditDto = {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  createdAt: string;
};

export type EmployeeListResponse = {
  data: EmployeeDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type QueryMetric = {
  label: string;
  value: string;
};

export type QueryBreakdown = {
  label: string;
  value: number;
  display: string;
};

export type OrgQueryResponse = {
  ok: boolean;
  question: string;
  intent: string;
  label: string;
  interpretation: string;
  summary: string;
  metrics: QueryMetric[];
  breakdown: QueryBreakdown[];
  employees: EmployeeDto[];
  suggestions: string[];
};
