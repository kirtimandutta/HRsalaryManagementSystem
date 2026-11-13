"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SalaryDrawer } from "@/components/salary-drawer";
import { Badge, Button, SelectInput, statusTone, TextInput } from "@/components/ui";
import {
  COUNTRIES,
  CURRENCIES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  SENIORITY_BANDS,
  STATUSES,
} from "@/lib/constants";
import { formatLocal, formatUsd } from "@/lib/format";
import type { SortKey } from "@/lib/filters";
import type { EmployeeDto, EmployeeListResponse } from "@/lib/types";

const PAGE_SIZE = 20;

export function EmployeeDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [seniority, setSeniority] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [status, setStatus] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<EmployeeListResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeDto | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const appliedSearch = useRef(search);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (appliedSearch.current === next) return;
      appliedSearch.current = next;
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const minValue = readBound(minSalary);
  const maxValue = readBound(maxSalary);
  const rangeError =
    minValue === null || maxValue === null
      ? "Salary bounds must be non-negative numbers."
      : minValue !== undefined && maxValue !== undefined && minValue > maxValue
        ? "Minimum salary cannot be greater than maximum salary."
        : null;
  const queryKey = rangeError
    ? null
    : JSON.stringify({
        page,
        search,
        department,
        country,
        currency,
        seniority,
        employmentType,
        status,
        minValue,
        maxValue,
        sort,
        dir,
        refreshKey,
      });
  const loading = queryKey !== null && loadedKey !== queryKey;

  useEffect(() => {
    if (!queryKey) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort, dir });
    if (search) params.set("search", search);
    if (department) params.set("department", department);
    if (country) params.set("country", country);
    if (currency) params.set("currency", currency);
    if (seniority) params.set("seniority", seniority);
    if (employmentType) params.set("employmentType", employmentType);
    if (status) params.set("status", status);
    if (minValue !== undefined) params.set("minSalaryUsd", String(minValue));
    if (maxValue !== undefined) params.set("maxSalaryUsd", String(maxValue));

    fetch(`/api/employees?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as EmployeeListResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load employees.");
        setResult(body);
        setError(null);
        setLoadedKey(queryKey);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load employees.");
        setLoadedKey(queryKey);
      });

    return () => controller.abort();
  }, [queryKey, page, search, department, country, currency, seniority, employmentType, status, minValue, maxValue, sort, dir]);

  function chooseSort(next: SortKey) {
    setDir((current) => (sort === next ? (current === "asc" ? "desc" : "asc") : next === "salary" ? "desc" : "asc"));
    setSort(next);
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    appliedSearch.current = "";
    setSearch("");
    setDepartment("");
    setCountry("");
    setCurrency("");
    setSeniority("");
    setEmploymentType("");
    setStatus("");
    setMinSalary("");
    setMaxSalary("");
    setPage(1);
  }

  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const activeFilters = [department, country, currency, seniority, employmentType, status, minSalary, maxSalary, search].filter(
    (value) => value.trim() !== "",
  ).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="xl:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? "Hide filters" : "Filters"}
          {activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>
      <aside className={`${filtersOpen ? "block" : "hidden"} h-fit rounded-2xl border border-line bg-card p-4 xl:sticky xl:top-24 xl:block`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium">Filters</h2>
          <button type="button" className="inline-flex min-h-11 items-center px-2 text-sm text-accent" onClick={clearFilters}>
            Clear
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Field label="Search" htmlFor="employee-search">
            <TextInput
              id="employee-search"
              value={searchInput}
              placeholder="Name, email, or ID"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </Field>
          <FilterSelect id="filter-department" label="Department" value={department} options={DEPARTMENTS} onChange={(value) => { setDepartment(value); setPage(1); }} />
          <FilterSelect id="filter-country" label="Country" value={country} options={COUNTRIES} onChange={(value) => { setCountry(value); setPage(1); }} />
          <FilterSelect id="filter-currency" label="Currency" value={currency} options={CURRENCIES} onChange={(value) => { setCurrency(value); setPage(1); }} />
          <FilterSelect id="filter-band" label="Salary band" value={seniority} options={SENIORITY_BANDS} onChange={(value) => { setSeniority(value); setPage(1); }} />
          <FilterSelect id="filter-type" label="Employment type" value={employmentType} options={EMPLOYMENT_TYPES} onChange={(value) => { setEmploymentType(value); setPage(1); }} />
          <FilterSelect id="filter-status" label="Status" value={status} options={STATUSES} onChange={(value) => { setStatus(value); setPage(1); }} />
          <Field label="Min total USD" htmlFor="min-salary">
            <TextInput id="min-salary" inputMode="decimal" value={minSalary} onChange={(event) => { setMinSalary(event.target.value); setPage(1); }} />
          </Field>
          <Field label="Max total USD" htmlFor="max-salary">
            <TextInput id="max-salary" inputMode="decimal" value={maxSalary} onChange={(event) => { setMaxSalary(event.target.value); setPage(1); }} />
          </Field>
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm text-muted">
          <p>{loading ? "Updating directory…" : `Showing ${from}–${to} of ${total.toLocaleString("en-US")}`}</p>
          {notice ? <p className="text-info">{notice}</p> : null}
        </div>
        {rangeError || error ? <p className="px-4 py-3 text-sm text-accent">{rangeError ?? error}</p> : null}
        <ul className="divide-y divide-line md:hidden">
          {result?.data.map((employee) => (
            <li key={employee.id} className="flex items-start gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{employee.fullName}</p>
                <p className="truncate text-xs text-muted">{employee.employeeId} · {employee.email}</p>
                <p className="mt-1 text-sm">{employee.department} · {employee.title}</p>
                <p className="text-sm text-muted">{employee.country} · {employee.currency} · {employee.seniority}</p>
                <p className="mt-1 text-sm tabular-nums">{formatLocal(employee.baseSalary, employee.currency)} base</p>
                <p className="font-medium tabular-nums">{formatUsd(employee.totalCompUsd)} total</p>
                <div className="mt-2">
                  <Badge tone={statusTone(employee.status)}>{employee.status}</Badge>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-stone-100 hover:text-foreground"
                aria-label={`Edit salary for ${employee.fullName}`}
                onClick={() => setEditing(employee)}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="scroll-fade hidden md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Employees</caption>
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <SortHeader label="Employee" sortKey="name" active={sort} dir={dir} onSort={chooseSort} />
                <SortHeader label="Department" sortKey="department" active={sort} dir={dir} onSort={chooseSort} />
                <SortHeader label="Country" sortKey="country" active={sort} dir={dir} onSort={chooseSort} />
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Band</th>
                <th className="hidden px-3 py-3 font-medium xl:table-cell">Base</th>
                <SortHeader label="Total USD" sortKey="salary" active={sort} dir={dir} onSort={chooseSort} align="right" />
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((employee) => (
                <tr key={employee.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-xs text-muted">{employee.employeeId} · {employee.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{employee.department}</p>
                    <p className="text-xs text-muted">{employee.title}</p>
                  </td>
                  <td className="px-3 py-3">
                    {employee.country}
                    <span className="text-muted"> · {employee.currency}</span>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">{employee.seniority}</td>
                  <td className="hidden px-3 py-3 tabular-nums xl:table-cell">{formatLocal(employee.baseSalary, employee.currency)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatUsd(employee.totalCompUsd)}</td>
                  <td className="px-3 py-3"><Badge tone={statusTone(employee.status)}>{employee.status}</Badge></td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-stone-100 hover:text-foreground"
                      aria-label={`Edit salary for ${employee.fullName}`}
                      onClick={() => setEditing(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && result && result.data.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">No employees match these filters.</p>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-3 sm:px-4">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <p className="text-center text-sm text-muted">Page {page} of {result?.totalPages ?? 1}</p>
          <Button
            variant="secondary"
            disabled={loading || page >= (result?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </section>

      {editing ? (
        <SalaryDrawer
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={(employee) => {
            setNotice(`Saved compensation for ${employee.fullName}.`);
            setEditing(null);
            setRefreshKey((current) => current + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function readBound(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") return undefined;
  if (!/^\d+(\.\d*)?$/.test(trimmed)) return null;
  if (trimmed.endsWith(".")) return undefined;
  return Number(trimmed);
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <SelectInput id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </SelectInput>
    </Field>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
  onSort: (sort: SortKey) => void;
  align?: "left" | "right";
}) {
  const selected = active === sortKey;
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : ""}`} aria-sort={selected ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={`inline-flex min-h-11 items-center ${align === "right" ? "ml-auto" : ""}`} onClick={() => onSort(sortKey)}>
        {label}
        {selected ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}
