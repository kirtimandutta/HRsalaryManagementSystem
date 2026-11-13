"use client";

import { useState } from "react";
import { Badge, Button, TextInput } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import { SAMPLE_QUESTIONS } from "@/lib/parse-question";
import type { OrgQueryResponse } from "@/lib/types";

export function QueryPanel() {
  const [question, setQuestion] = useState<string>(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrgQueryResponse | null>(null);

  async function ask(nextQuestion: string = question) {
    const trimmed = nextQuestion.trim();
    setQuestion(trimmed);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const body = (await response.json()) as OrgQueryResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not answer that question.");
      setResult(body);
    } catch (askError) {
      setResult(null);
      setError(askError instanceof Error ? askError.message : "Could not answer that question.");
    } finally {
      setLoading(false);
    }
  }

  const maxBreakdown = Math.max(...(result?.breakdown.map((row) => row.value) ?? [0]), 1);

  return (
    <div className="space-y-5">
      <form
        className="rounded-2xl border border-line bg-card p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="org-question" className="text-sm font-medium">
          Question
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <TextInput
            id="org-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What is the average salary in Engineering in the US?"
          />
          <Button type="submit" className="w-full sm:w-auto" disabled={loading || question.trim().length < 3}>
            {loading ? "Looking up…" : "Ask"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Matches a fixed set of questions. Payroll figures exclude terminated employees.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sample) => (
            <button
              key={sample}
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 py-2 text-left text-sm text-stone-700 hover:border-accent hover:text-accent"
              onClick={() => void ask(sample)}
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {result ? (
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={result.ok ? "good" : "warn"}>{result.label}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted">{result.interpretation}</p>
          <p className="mt-2 font-display text-xl font-medium leading-snug sm:text-2xl">{result.summary}</p>

          {result.metrics.length > 0 ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl bg-stone-50 px-3 py-3">
                  <dt className="text-xs uppercase tracking-wide text-muted">{metric.label}</dt>
                  <dd className="mt-1 text-lg font-medium tabular-nums">{metric.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {result.breakdown.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {result.breakdown.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-muted">{row.display}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-info"
                      style={{ width: `${Math.max(4, (row.value / maxBreakdown) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {result.employees.length > 0 ? (
            <>
            <ul className="mt-5 space-y-3 sm:hidden">
              {result.employees.map((employee) => (
                <li key={employee.id} className="rounded-xl border border-line px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{employee.fullName}</p>
                      <p className="text-xs text-muted">{employee.title}</p>
                      <p className="mt-1 text-sm text-muted">{employee.department} · {employee.country}</p>
                    </div>
                    <p className="shrink-0 tabular-nums">{formatUsd(employee.totalCompUsd)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="scroll-fade mt-5 hidden sm:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Matching employees</caption>
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 font-medium">Employee</th>
                    <th className="py-2 font-medium">Department</th>
                    <th className="py-2 font-medium">Country</th>
                    <th className="py-2 text-right font-medium">Total USD</th>
                  </tr>
                </thead>
                <tbody>
                  {result.employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-line">
                      <td className="py-2">
                        <p className="font-medium">{employee.fullName}</p>
                        <p className="text-xs text-muted">{employee.title}</p>
                      </td>
                      <td className="py-2">{employee.department}</td>
                      <td className="py-2">{employee.country}</td>
                      <td className="py-2 text-right tabular-nums">{formatUsd(employee.totalCompUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : null}

          {!result.ok && result.suggestions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="text-sm text-accent underline-offset-2 hover:underline"
                  onClick={() => void ask(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
