import { NextResponse } from "next/server";
import { getEmployeeDetail, updateCompensation } from "@/lib/employees";
import { errorResponse } from "@/lib/http";
import { compensationPatchSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const detail = await getEmployeeDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    return errorResponse(error, "Could not load that employee.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = compensationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid compensation update." },
      { status: 400 },
    );
  }

  try {
    const employee = await updateCompensation(id, parsed.data);
    return NextResponse.json({ employee });
  } catch (error) {
    return errorResponse(error, "Could not update compensation.");
  }
}
