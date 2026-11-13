import { NextResponse } from "next/server";
import { isDatabaseUnavailable } from "@/lib/db-error";
import { EmployeeNotFoundError, NoCompensationChangeError } from "@/lib/employees";

export function errorResponse(error: unknown, fallback: string) {
  if (error instanceof EmployeeNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof NoCompensationChangeError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (isDatabaseUnavailable(error)) {
    return NextResponse.json(
      { error: "Compensation database is not ready. Run npm run db:setup." },
      { status: 503 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
