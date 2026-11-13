# ACME Corp Salary Management — QA & Security Audit

**Scope:** Local instance at `http://localhost:3000`, SQLite database `prisma/dev.db`, 10,000 seeded employees.  
**Method:** Direct SQL aggregates, timed API calls, compensation writes that were restored, and parser inspection. Findings below were reproduced. Three ledger and answer defects were then fixed in this pass; the tests in `__tests__/qa-edge-cases.test.ts` lock the corrected behavior.  
**Date:** 13 Nov 2026.

## Executive summary

**Stability: Needs hardening before a shared deployment.**

Payroll math for the 10,000-row seed is exact. The directory pages 20 rows at a time and stays responsive after the first compile. Salary edits that are negative, empty, non-numeric, or above 100,000,000 local units already returned 400 instead of a 500. Unknown Ask the Org questions return a normal empty answer.

The live pass also wrote two bad compensation updates before they were reverted, and Ask the Org returned confident answers for the wrong population. Those three defects are fixed:

- A currency change no longer retags the same local amount under a new exchange rate.
- A single salary can no longer exceed $2,000,000 USD, which is what let `100,000,000` GBP through the old local-unit cap.
- Questions that name two departments or two countries are refused unless they are an explicit comparison.

The remaining production gap is access control. `PATCH /api/employees/[id]` has no session, so any caller who can reach the server can edit any employee id. That matches the phase-1 decision to skip SSO, and it is not acceptable on a shared network.

## Payroll reconciliation

Active and On Leave employees only. Terminated people stay in the directory and are excluded from cost.

| Check | Result |
| --- | ---: |
| Payroll headcount | 9,715 |
| `SUM(totalCompUsd)` | 1,202,443,756.56 |
| `SUM(baseSalaryUsd + bonusUsd + allowanceUsd)` | 1,202,443,756.56 |
| `GET /api/stats` annual total | 1,202,443,756.56 |
| Sum of department totals from the API | 1,202,443,756.56 |
| Null salary columns | 0 |
| Duplicate `employeeId` or email | 0 |
| Largest absolute drift of `totalCompUsd` vs the three USD parts | 5.82e-11 |

Department totals match the SQL sums to the cent. Averages are rounded to cents for display (`money()`), so Engineering’s raw average 142,126.196 stores as 142,126.20. That is presentation rounding, not a dropped row.

Dashboard cards use whole dollars, so 1,202,443,756.56 renders as $1,202,443,757. The API value is the exact cent total. Exchange rates are the static card dated 1 Nov 2026 (`USD 1`, `GBP 1.27`, `EUR 1.08`, `INR 0.012`, `CAD 0.74`, `JPY 0.0067`, `AUD 0.66`). They are not a live feed.

The seed was unchanged at the end of the audit: headcount 9,715 and annual total 1,202,443,756.56. Probe audit rows on `emp_00010` were deleted.

## Performance

The directory does not load 10,000 rows into the browser. Pages are server-side, default 20, maximum 100.

| Request | Status | Time | Rows |
| --- | ---: | ---: | ---: |
| `GET /api/employees?page=1` (first compile of the route) | 200 | 1,641 ms | 20 of 10,000 |
| `page=250` | 200 | 84 ms | 20 |
| `page=500` (last page) | 200 | 72 ms | 20 |
| `pageSize=100` | 200 | 82 ms | 100 |
| Engineering + UK + total USD ≥ 100,000 | 200 | 78 ms | 256 matches, 20 returned |
| Search `abigail` and `Abigail` | 200 | 65 ms / 47 ms | 183 each |
| Search `' OR 1=1 --` | 200 | 58 ms | 0 (parameterized, not a dump) |
| `department=Martians` | 400 | 26 ms | rejected enum |
| `page=0` | 400 | 38 ms | rejected |
| `page=100000&pageSize=100` | 200 | 26 ms | 0 rows, total still 10,000 |
| `GET /api/stats` | 200 | 1,558 ms, then 2,362 ms warm | full payroll |

Deep pages and the complex filter do not time out. SQLite `LIKE` is case-insensitive for ASCII, so `abigail` and `Abigail` match the same 183 people. `Muller` matches 0 rows and `Müller` matches 39, because diacritics are not folded.

`/api/stats` and the analytics page load all 9,715 payroll rows into Node and aggregate in JavaScript. That is the slow path. Pagination is not.

## Bugs and flaws

### Critical — currency retag rewrote USD pay. Fixed.

**Issue.** `PATCH` accepted a new currency and kept the same local base, bonus, and allowance. The USD snapshot was recomputed with the new rate, so the person’s pay collapsed or exploded without a new amount being entered.

**Steps.** `PATCH /api/employees/emp_00010` with `{ "currency": "INR", "changedBy": "QA Auditor" }`. The row was GBP, base 104,671, bonus 14,128, allowance 3,140, total 154,862.53 USD.

**Expected.** The API refuses a currency change, or it converts the local amounts so the USD total stays the same.

**Actual (before the fix).** HTTP 200. Currency became INR, local base stayed 104,671, and `totalCompUsd` became 1,463.27. The row was restored immediately afterward.

**Fix applied.** `updateCompensation` throws `CompensationRejectedError` before any write when `currency` differs from the stored currency. The route maps that error to 400.

### Critical — 100,000,000 local units was a legal salary. Fixed.

**Issue.** Zod’s maximum of 100,000,000 is inclusive and ignores the currency. `999,999,999` was rejected. `100,000,000` was stored.

**Steps.** `PATCH /api/employees/emp_00010` with `{ "baseSalary": 100000000 }` on the GBP employee above.

**Expected.** A salary that normalizes to nine figures of USD is rejected with 400 and the row is unchanged.

**Actual (before the fix).** HTTP 200. Base became 100,000,000 GBP and `totalCompUsd` became 127,021,930.36. A later request restored the original base. One accepted write was enough to move company payroll by about $127 million.

**Fix applied.** After the USD snapshot is calculated, totals above $2,000,000 are rejected with 400 and nothing is written. `999,999,999` is still rejected by the schema as “Base salary is too large.” `100,000,000` still passes the schema, and the USD ceiling stops it for GBP, USD, EUR, CAD, and AUD. `100,000,000` JPY is about $670,000 and remains allowed.

### Major — Ask the Org answered for the first group only. Fixed.

**Issue.** A question that named two departments or two countries was reported as `ok: true` for the first match only. A “top earners” question also dropped a salary floor that appeared later in the same sentence, because the first number (`5` in “top 5”) was treated as the threshold.

**Steps.**

1. `POST /api/queries` with `How many people work in Sales and Marketing?`
2. `POST /api/queries` with `What is the average salary in the US and the UK?`
3. Parse `Who are the top 5 highest earners earning more than 200k in the UK?`

**Expected.** The first two questions say they need a single population. The third keeps both the limit of 5 and the 200,000 USD floor. An explicit `Compare Engineering and Sales` still compares.

**Actual (before the fix).**

- Sales and Marketing returned `ok: true`, intent `headcount`, summary “1,720 people in Sales are on payroll.” Marketing was ignored.
- US and UK returned `ok: true`, intent `average`, summary “Average total compensation for the US is $166,186 across 3,069 people.” The UK was ignored.
- The top-earner question parsed as `{ type: "top_earners", limit: 5, country: "UK" }` with no floor.

**Fix applied.** Two departments without `compare` / `vs` / `versus` (or an average-of-two phrasing) return intent `ambiguous` and `ok: false`. Two countries do the same. The amount parser prefers a value of at least 1,000 when the sentence contains several numbers, and top-earner queries keep `minUsd` and apply it in the query.

### Major — any caller can edit any employee. Open.

**Issue.** There is no authentication or authorization on `PATCH /api/employees/[id]`. Knowing `emp_00010` was enough to change that salary during this audit.

**Steps.** `PATCH /api/employees/emp_00010` with a JSON compensation body and no cookie or token.

**Expected.** A shared deployment requires an authenticated HR session and checks that the caller may edit that id.

**Actual.** The request is authorized by network reachability. Unknown ids return 404. Unknown JSON keys such as `email` and `employeeId` are stripped, so this is not a mass-assignment bug. It is still full write access to every salary.

**Suggested fix.** Add the phase-2 session the PRD deferred. Reject unauthenticated `PATCH` with 401, and authorize the employee id on the server. Do not rely on the id the client sends without that check.

### Minor — diacritics are not searchable. Open.

**Issue.** Directory search is Prisma `contains`, which SQLite implements as `LIKE`. ASCII case is folded. Accents are not.

**Steps.** Count employees whose name contains `Muller`, then `Müller`.

**Expected.** A search for `Muller` finds the Müller rows, or the UI says the match is accent-sensitive.

**Actual.** `Muller` returns 0. `Müller` returns 39.

**Suggested fix.** Store a folded `searchName` (NFD, strip combining marks, lowercase) and filter on that column.

### Minor — whole-dollar cards round the company total. Open.

**Issue.** `formatUsd` uses zero fraction digits. The stored annual total is 1,202,443,756.56 and the card shows $1,202,443,757.

**Expected.** A payroll total that is used as a control figure is shown to the cent, or the card states that it is rounded.

**Actual.** The API is exact. The overview card is off by $0.44.

**Suggested fix.** Use `formatUsdPrecise` for the annual payroll and monthly run-rate figures.

## What held up

- Negative numbers, numeric strings, `null`, empty objects, and `999,999,999` return 400 from the schema. They do not reach Prisma.
- A blank Ask the Org question and a non-JSON body return 400. “Show me salaries for Martians in Atlantis” returns 200 with `ok: false`, intent `unknown`, and no employee list. The client does not throw.
- A missing employee id returns 404.
- An unknown department returns 400 with the allowed list.
- Search input is a bound parameter. `' OR 1=1 --` returned zero rows.
- There is no public create endpoint, and the seed has no duplicate emails or employee ids, so an id collision cannot be injected through the current API.
- The salary drawer already blocks a non-positive base and a negative bonus or allowance before the request. The server checks remain the ones that matter.

## Performance bottlenecks

- **Stats and analytics load the payroll into memory.** `getOrgStats` and `getAnalytics` select every Active and On Leave row (9,715) and reduce it in JavaScript. Warm `/api/stats` took 1.6–2.4 seconds. Replace that path with `aggregate` and `groupBy` so the dashboard does not grow linearly with a full table read.
- **Directory pagination is healthy.** Warm pages, including page 500 and a three-predicate filter, returned in under 100 ms. There is no client-side 10,000-row render to leak.
- **The first hit on a route includes compile time** (the employees list was 1.6 seconds once, then ~70 ms). That is the dev server, not the query plan.

## Fixes in this pass

- `lib/employees.ts` rejects a different currency and any snapshot above `$2,000,000` USD before the transaction. `lib/http.ts` returns 400 for that error.
- `lib/parse-question.ts` and `lib/org-query.ts` refuse multi-group questions and keep a salary floor on top-earner questions.
- `lib/validators.ts` returns “must be a number” for strings and nulls instead of Zod’s raw type text.
- `__tests__/qa-edge-cases.test.ts` covers the payload rejections, identity-field stripping, Martians, the two-group questions, the 200k floor, the currency retag, and the $100,000,000 GBP ceiling. Vitest now includes `__tests__/**/*.test.ts`.
