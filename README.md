# ACME Corp Compensation Workspace

HR workspace for a 10,000-person workforce: directory, gross-pay edits, payroll analytics, and a deterministic question mapper. The product requirements are in [PRD.md](PRD.md).

## Setup

Requires Node.js 20 or newer.

```bash
npm install
copy .env.example .env
npm run db:setup
npm test
npm run dev
```

`copy` is the Windows command. On macOS or Linux, use `cp .env.example .env`.

Open [http://localhost:3000](http://localhost:3000).

`npm run db:setup` creates the SQLite file and loads exactly 10,000 employees. `npm run prisma:seed` reloads that workforce. **Reseeding deletes salary edits and the audit log.**

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run db:setup` | Push the Prisma schema and seed 10,000 employees |
| `npm run prisma:seed` | Reseed an existing database |
| `npm test` | Unit tests, component test, and integration tests when the database exists |
| `npm run typecheck` | TypeScript without emitting files |
| `npm run lint` | ESLint |

Integration tests skip themselves until `prisma/dev.db` exists, then check the seed count, the USD snapshot, payroll exclusion of terminated employees, an Ask the Org answer, and a salary edit that is rolled back.

## Architecture

- **Next.js App Router.** Overview and analytics are server components that read SQLite directly. The directory and Ask the Org call route handlers so the same operations are available as an HTTP API.
- **SQLite + Prisma.** One file, no extra service, comfortable at this headcount for a single HR operator. Moving to PostgreSQL later is a datasource change. SQLite is the wrong engine once many people write at once.
- **USD snapshot.** Local base, bonus, and allowance are the source of truth. `compensationSnapshot` in `lib/currency.ts` writes the USD columns on every seed row and every salary edit. Aggregates sum those columns and never add mixed currencies. Rates are the static card dated 1 Nov 2026.
- **Payroll population.** Active and On Leave are included. Terminated employees stay in the directory and drop out of cost, average, and median.
- **Ask the Org.** `lib/parse-question.ts` maps text to a fixed intent. It does not call a language model, so an answer can be traced and tested. A model can sit in front of the same intents later.

Money is rounded for analytics. This is not a payroll ledger and it does not calculate tax.

## Project layout

- `prisma/schema.prisma`, `prisma/seed.ts` — model and the 10,000-row generator
- `lib/` — currency, aggregation, filters, directory writes, stats, question mapper
- `app/api/` — `GET /api/employees`, `GET/PATCH /api/employees/[id]`, `GET /api/stats`, `POST /api/queries`
- `app/` — overview, directory, analytics, Ask the Org
- `tests/` — aggregation, currency, filters, parser, copy, a metric card, and the seeded database

## AI tooling

This repository was implemented in Cursor with Grok as the coding agent. The agent scaffolded Next.js, wrote the domain model, and built the UI. Nothing in the running app calls a language model. Check the rate card, the Active / On Leave rule, and the seed distributions before treating a figure as a compensation decision.
