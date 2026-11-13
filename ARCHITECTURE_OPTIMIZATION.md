# Architecture and performance

Measured on this machine against `prisma/dev.db` (10,000 employees, 9,715 on payroll). Times are in-process calls through Prisma, five samples where noted. They do not include Next.js compile time. The earlier HTTP check of `/api/stats` at 1.6–2.4 seconds was this same aggregation plus the dev server.

## Performance hotspot analysis

| Path | What it did | Measured time |
| --- | --- | --- |
| `getOrgStats` / `getAnalytics` | `findMany` of every Active and On Leave row (9,715), then sums, medians, and group totals in JavaScript | 515–769 ms for stats, 604 ms for analytics |
| Payroll sort for top earners | `EXPLAIN` used `Employee_status_idx`, then `USE TEMP B-TREE FOR ORDER BY` | included in the stats time |
| `listEmployees` page 1 and page 500 | Offset pagination, 20 rows, already a narrow page | 21 ms and 11 ms |
| Engineering + UK + salary ≥ $100k | Indexed filters, 20 rows | 8 ms |
| Directory search | The client already waits 300 ms after the last keystroke before calling the API | no extra query per key |

The directory was not scanning 10,000 rows into the browser. The API already returned one page. The expensive work was the dashboard and analytics rebuilding company totals from raw rows on every load.

SQLite has no percentile function. The median used to sort every `totalCompUsd` value in Node. Offset pagination at page 500 was already a few milliseconds, so replacing page numbers with cursors would not change the table the HR manager uses.

## Architectural changes implemented

- **Aggregates stay in SQLite.** `lib/stats.ts` now uses `aggregate`, `groupBy`, `_sum`, `_min`, and `_max` for payroll, departments, countries, currencies, bands, employment types, and the department × band matrix. The median reads one or two indexed rows at the middle of the ordered salaries instead of the whole column.
- **One cached report.** `lib/payroll-cache.ts` keeps that report in memory. Overview and analytics share it. The next call in the same process does not hit the database. `updateCompensation` clears the cache after a successful save, so an edit is visible on the next dashboard load. Restarting the server, or reseeding, also starts from an empty cache.
- **Indexes.** `schema.prisma` adds `@@index([status, totalCompUsd])`, `@@index([department, country])`, and `@@index([lastName, firstName, employeeId])`. Name order, including the last page, is an index scan. The planner still sorts the top-earner query with a temporary B-tree after the status index; that sort is inside the faster aggregate path.
- **Stable offset pages.** Every directory sort ends with `employeeId`, which is unique, so page 500 cannot shuffle when two people share a name. Page size stays 20, with a server cap of 100. The response was already a DTO: 20 employees are about 9.2 KB. List queries now `select` only the fields that DTO uses.
- **Ask the Org medians** use the same middle-of-index read instead of loading every matching salary into Node.

Totals after the change match the previous ledger: headcount 9,715, annual payroll 1,202,443,756.56, median 105,329, Engineering 436,469,549.24 across 3,071 people.

## Before vs. after

| Work | Before | After |
| --- | ---: | ---: |
| Build the payroll summary | 769 ms cold, 515 ms on the next uncached call | 243 ms cold, 175 ms on the next uncached call |
| Build analytics (summary, matrix, top 8) | 604 ms | 175 ms uncached |
| Load the same summary again | another 515–604 ms | under 1 ms from memory |
| Directory page 1 | 21 ms, 9,223 bytes | 4–6 ms warm, 9,223 bytes |
| Directory page 500 (rows 9,981–10,000) | 11 ms | 4–12 ms across five runs |
| Directory page 250 | not sampled in the first pass | 4–5 ms warm |
| Engineering + UK + min $100k | 8 ms | 24 ms in the same run as the rewrite, still a single page |

The summary query is about three times faster before the cache, and a repeat view of the dashboard does not recompute it. Deep pages did not get slower once the machine was not also typechecking. The JSON for a page of 20 people stayed 9.2 KB because the route already omitted columns the screen does not show.
