import { NextResponse } from "next/server";
import { answerOrgQuestion } from "@/lib/org-query";
import { errorResponse } from "@/lib/http";
import { orgQuestionSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = orgQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid question." },
      { status: 400 },
    );
  }

  try {
    const result = await answerOrgQuestion(parsed.data.question);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Could not answer that question.");
  }
}
