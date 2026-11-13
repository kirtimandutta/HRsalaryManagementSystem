import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listEmployees } from "@/lib/employees";
import { parseEmployeeQuery } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseEmployeeQuery(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await listEmployees(parsed.query);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Could not load employees.");
  }
}
