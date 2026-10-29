import { describe, expect, test } from "bun:test";
import { ROLE_LEVEL, isRole } from "../src/lib/types";
import { roleLevel } from "../src/lib/auth";

describe("Bastion admin hierarchy", () => {
  test("3 admin levels above users, strictly ordered", () => {
    expect(ROLE_LEVEL.user).toBe(0);
    expect(ROLE_LEVEL.moderator).toBe(1);
    expect(ROLE_LEVEL.admin).toBe(2);
    expect(ROLE_LEVEL.superadmin).toBe(3);
    expect(roleLevel("superadmin")).toBeGreaterThan(roleLevel("admin"));
    expect(roleLevel("admin")).toBeGreaterThan(roleLevel("moderator"));
    expect(roleLevel("moderator")).toBeGreaterThan(roleLevel("user"));
    expect(roleLevel("bogus")).toBe(0);
  });
  test("role validation", () => {
    for (const r of ["user", "moderator", "admin", "superadmin"]) expect(isRole(r)).toBe(true);
    expect(isRole("root")).toBe(false);
  });
});
