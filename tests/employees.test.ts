import { describe, expect, it } from "vitest";

import { mockDepartmentHeads, searchDepartmentHeads } from "../lib/employees";

describe("department head mock employee search", () => {
  it("keeps a small in-memory list for demo mode", () => {
    expect(mockDepartmentHeads.length).toBeGreaterThanOrEqual(3);
    expect(mockDepartmentHeads[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      department: expect.any(String),
      email: expect.any(String)
    });
  });

  it("returns all mock department heads when the query is empty", () => {
    expect(searchDepartmentHeads("")).toEqual(mockDepartmentHeads);
  });

  it("searches by name, department, role, and email", () => {
    expect(searchDepartmentHeads("로봇")[0]?.department).toContain("로봇");
    expect(searchDepartmentHeads("software")[0]?.email).toContain("@");
    expect(searchDepartmentHeads("부서장")[0]?.role).toContain("부서장");
  });
});
