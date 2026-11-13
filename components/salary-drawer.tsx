"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COMP_FIELD_LABELS } from "@/lib/constants";
import { compensationSnapshot, FX_TO_USD, isCurrency } from "@/lib/currency";
import { formatLocal, formatTimestamp, formatUsdPrecise } from "@/lib/format";
import type { AuditDto, EmployeeDto } from "@/lib/types";
import { Button, TextInput } from "@/components/ui";

export function SalaryDrawer({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeDto;
  onClose: () => void;
  onSaved: (employee: EmployeeDto) => void;
}) {
  const titleId = useId();
  const [baseSalary, setBaseSalary] = useState(String(employee.baseSalary));
  const [bonus, setBonus] = useState(String(employee.bonus));
  const [allowance, setAllowance] = useState(String(employee.allowance));
  const [audits, setAudits] = useState<AuditDto[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/employees/${employee.id}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { audits?: AuditDto[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load edit history.");
        setAudits(body.audits ?? []);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setAudits([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAudits(false);
      });
    return () => controller.abort();
  }, [employee.id]);

  const baseValue = Number(baseSalary);
  const bonusValue = Number(bonus);
  const allowanceValue = Number(allowance);
  const numbersValid =
    Number.isFinite(baseValue) &&
    baseValue > 0 &&
    Number.isFinite(bonusValue) &&
    bonusValue >= 0 &&
    Number.isFinite(allowanceValue) &&
    allowanceValue >= 0;
  const preview =
    numbersValid && isCurrency(employee.currency)
      ? compensationSnapshot({
          baseSalary: Math.round(baseValue),
          bonus: Math.round(bonusValue),
          allowance: Math.round(allowanceValue),
          currency: employee.currency,
        })
      : null;
  const rate = isCurrency(employee.currency) ? FX_TO_USD[employee.currency] : null;

  async function save() {
    if (!preview) {
      setError("Enter a base salary above zero. Bonus and allowance cannot be negative.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: Math.round(baseValue),
          bonus: Math.round(bonusValue),
          allowance: Math.round(allowanceValue),
          changedBy: "HR Manager",
        }),
      });
      const body = (await response.json()) as { employee?: EmployeeDto; error?: string };
      if (!response.ok || !body.employee) {
        throw new Error(body.error ?? "Could not save compensation.");
      }
      onSaved(body.employee);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save compensation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-stone-900/40" aria-label="Close salary editor" onClick={() => !saving && onClose()} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="drawer-in absolute inset-0 flex h-dvh w-full flex-col bg-card sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:max-w-md sm:shadow-2xl"
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="border-b border-line px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{employee.employeeId}</p>
            <h2 id={titleId} className="mt-1 font-display text-xl font-medium sm:text-2xl">
              {employee.fullName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {employee.title} · {employee.department} · {employee.country}
            </p>
            {employee.status === "Terminated" ? (
              <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
                This person is terminated and is excluded from payroll totals.
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            <MoneyField id="base-salary" label={`Annual base (${employee.currency})`} value={baseSalary} onChange={setBaseSalary} />
            <MoneyField id="bonus" label={`Annual bonus (${employee.currency})`} value={bonus} onChange={setBonus} />
            <MoneyField id="allowance" label={`Annual allowance (${employee.currency})`} value={allowance} onChange={setAllowance} />
            <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              <p className="text-muted">Normalized total</p>
              <p className="mt-1 break-words font-display text-xl tabular-nums sm:text-2xl">{preview ? formatUsdPrecise(preview.totalCompUsd) : "—"}</p>
              {rate !== null ? (
                <p className="mt-1 text-muted">
                  1 {employee.currency} = {rate} USD. Amounts are annual gross.
                </p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <div>
              <h3 className="text-sm font-medium">Recent edits</h3>
              {loadingAudits ? <p className="mt-2 text-sm text-muted">Loading history…</p> : null}
              {!loadingAudits && audits.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No compensation edits yet.</p>
              ) : null}
              <ul className="mt-2 space-y-2">
                {audits.map((audit) => (
                  <li key={audit.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                    <p>
                      {COMP_FIELD_LABELS[audit.field] ?? audit.field} changed from{" "}
                      {formatAuditValue(audit.field, audit.oldValue, employee.currency)} to{" "}
                      {formatAuditValue(audit.field, audit.newValue, employee.currency)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {audit.changedBy} · {formatTimestamp(audit.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex gap-2 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-5 sm:py-4">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={saving || !preview}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <TextInput
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}

function formatAuditValue(field: string, value: string, currency: string): string {
  if (field === "currency") return value;
  const amount = Number(value);
  if (!Number.isFinite(amount) || !isCurrency(currency)) return value;
  return formatLocal(amount, currency);
}
