# ACME Corp Compensation Workspace

**Phase 1 product requirements** · HR salary visibility for ~10,000 employees

## Goal

Replace the workbook stack Avery uses today with one place to see, correct, and explain gross pay across ACME Corp. The product is a system of record for compensation *visibility*, not a payroll processor.

## User persona

**Avery Chen, HR Manager.** Avery prepares compensation reviews for a workforce spread across the US, UK, Germany, India, Canada, Japan, and Australia. The current process is a set of exported spreadsheets: one tab per country, hand-maintained currency columns, and pivot tables that go stale the moment a salary is corrected. Avery needs filters that match how leadership asks questions, totals that survive a salary edit, and an answer that can be explained in the room.

## Scope

1. **Global employee directory.** Search by name, email, title, or employee ID. Filter by department, country, currency, salary band (Junior, Mid, Senior, Lead, Executive), employment type, employment status, and a USD total-compensation range. Sort and paginate. Terminated employees stay visible.
2. **Salary and compensation management.** Each person has an annual base, bonus, and allowance in local currency. A dated reference rate card normalizes total compensation to USD. Salary edits are validated. Every changed field is written to an audit log with the previous value, the new value, the actor, and the time.
3. **Analytics and insights.** Headcount on payroll, annual payroll, monthly run-rate (annual total ÷ 12), average and median total compensation. Breakdowns by department, country, currency, band, and employment type. A department-by-band matrix supports pay-structure conversations. Ranges are shown with the caveat that they mix seniority and pay decisions.
4. **Ask the Org.** A deterministic query mapper turns recurring questions into structured results. It covers averages, medians, total payroll, top earners, headcount, compensation mix, department ranking, threshold questions, and short snapshots such as “Show me engineering salaries in the UK.”

Payroll math includes **Active** and **On Leave** only. Terminated employees are excluded from cost, average, and median figures.

## Out of scope

- **Live payroll and bank payments.** Payslips, payment files, and bank integrations stay with the payroll processor. Phase 1 never moves money.
- **Attendance and biometrics.** Time clocks do not change the gross-pay picture this release explains.
- **Statutory tax withholding.** Multi-country tax brackets, social contributions, and net pay are a compliance product. Figures here are gross.
- **SSO, RBAC, and employee self-service.** The workspace assumes the HR Manager at the keyboard. Access control is required before any multi-user deployment.
- **Live foreign-exchange feeds, equity vesting, and benefits enrollment.** The rate card is a published snapshot so two viewers always get the same dollar figure.

## Architecture and trade-offs

- **Next.js App Router and TypeScript.** The dashboard and the HTTP API live in one project. Server components render overview and analytics straight from the database. Route handlers expose listing, edits, aggregates, and Ask the Org as an explicit API.
- **SQLite and Prisma.** A file database is portable, has no extra service to run, and is comfortable at 10,000 employees for a single operator. Prisma keeps the schema, the client, and the seed in one model, so a later move to PostgreSQL is a datasource change. SQLite is the wrong engine once many people write at the same time. That is a hosting decision, not a reason to model the workforce differently.
- **Derived USD columns.** Local base, bonus, and allowance remain the source of truth. USD equivalents are recomputed in one function on every compensation write, then stored for filtering and aggregates. The rate card is static and dated. It is not a market feed.
- **Deterministic query mapper.** Ask the Org matches text to a fixed set of intents. Answers are auditable and covered by tests. A language model can sit in front of the same intents later without changing the math.
- **Rounded decimals, not a ledger.** Amounts are rounded for analytics. Integer minor units would be required before this data drove payments, which Phase 1 does not do.

## Success criteria

Avery can filter the workforce, correct a salary, read the audit line, and see org totals that exclude terminated employees. Dashboard, analytics, and Ask the Org agree for the same population and the same rate card.
