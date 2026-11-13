import { NextResponse } from "next/server";
import { FX_AS_OF } from "@/lib/currency";
import { errorResponse } from "@/lib/http";
import { getOrgStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getOrgStats();
    return NextResponse.json({ fxAsOf: FX_AS_OF, ...stats });
  } catch (error) {
    return errorResponse(error, "Could not load payroll statistics.");
  }
}
