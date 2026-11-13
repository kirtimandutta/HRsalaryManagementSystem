import type { Metadata } from "next";
import { EmployeeDirectory } from "@/components/employee-directory";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Directory",
};

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Employee records"
        description="Search and correct gross pay. Terminated people stay visible here and drop out of payroll totals."
      />
      <EmployeeDirectory />
    </>
  );
}
