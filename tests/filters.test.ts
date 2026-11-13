import { describe, expect, it } from "vitest";
import { buildEmployeeOrderBy, buildEmployeeWhere, parseEmployeeQuery } from "@/lib/filters";

describe("employee filters", () => {
  it("requires every search token to match and applies a USD range", () => {
    const parsed = parseEmployeeQuery({
      search: "Jane Doe",
      department: "Engineering",
      country: "US",
      minSalaryUsd: "120000",
      maxSalaryUsd: "180000",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.query.sort).toBe("name");
    expect(parsed.query.dir).toBe("asc");
    expect(buildEmployeeWhere(parsed.query)).toEqual({
      department: "Engineering",
      country: "US",
      totalCompUsd: { gte: 120000, lte: 180000 },
      AND: [
        {
          OR: [
            { firstName: { contains: "Jane" } },
            { lastName: { contains: "Jane" } },
            { email: { contains: "Jane" } },
            { employeeId: { contains: "Jane" } },
            { title: { contains: "Jane" } },
          ],
        },
        {
          OR: [
            { firstName: { contains: "Doe" } },
            { lastName: { contains: "Doe" } },
            { email: { contains: "Doe" } },
            { employeeId: { contains: "Doe" } },
            { title: { contains: "Doe" } },
          ],
        },
      ],
    });
  });

  it("defaults salary sort to descending and honors an explicit direction", () => {
    const implied = parseEmployeeQuery({ sort: "salary" });
    const explicit = parseEmployeeQuery({ sort: "salary", dir: "asc" });
    expect(implied.ok && implied.query.dir).toBe("desc");
    expect(explicit.ok && explicit.query.dir).toBe("asc");
    if (!implied.ok) return;
    expect(buildEmployeeOrderBy(implied.query)[0]).toEqual({ totalCompUsd: "desc" });
  });

  it("rejects an unknown department, an oversized page, and an inverted range", () => {
    expect(parseEmployeeQuery({ department: "Legal" })).toMatchObject({ ok: false });
    expect(parseEmployeeQuery({ pageSize: "500" })).toMatchObject({ ok: false });
    expect(parseEmployeeQuery({ minSalaryUsd: "10", maxSalaryUsd: "2" })).toMatchObject({ ok: false });
  });
});
