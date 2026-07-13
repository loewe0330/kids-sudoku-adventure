import { describe, expect, test } from "vitest";
import { childPath, matchChildRoute, ROUTES } from "../app/routes";

describe("product route map", () => {
  test("exposes named routes for every product area", () => {
    expect(ROUTES.ADMIN_LOGIN).toBe("/admin");
    expect(ROUTES.ADMIN_DASHBOARD).toBe("/admin");
    expect(ROUTES.PARENT_LOGIN).toBe("/login");
    expect(ROUTES.CHILDREN).toBe("/children");
    expect(ROUTES.CHILD_HOME).toBe("/child/:childId/home");
    expect(ROUTES.CHILD_ADVENTURE).toBe("/child/:childId/adventure");
    expect(ROUTES.CHILD_PRACTICE).toBe("/child/:childId/free-practice");
    expect(ROUTES.CHILD_PRACTICE_LEGACY).toBe("/child/:childId/practice");
    expect(ROUTES.CHILD_BANK_LEGACY).toBe("/child/:childId/bank");
    expect(ROUTES.CHILD_GROWTH).toBe("/child/:childId/growth");
    expect(ROUTES.CHILD_SETTINGS).toBe("/child/:childId/settings");
    expect(ROUTES.CHILD_PLAY).toBe("/child/:childId/play");
    expect(ROUTES.CHILD_PRINT).toBe("/child/:childId/print");
  });

  test("builds and matches child learning-space routes", () => {
    expect(childPath("child-1", "home")).toBe("/child/child-1/home");
    expect(childPath("child-1", "practice")).toBe("/child/child-1/free-practice");
    expect(matchChildRoute("/child/child-1/adventure")).toEqual({
      childId: "child-1",
      section: "adventure",
      practiceTab: undefined
    });
    expect(matchChildRoute("/child/child-1/free-practice")).toEqual({
      childId: "child-1",
      section: "practice",
      practiceTab: "select"
    });
    expect(matchChildRoute("/child/child-1/practice")).toEqual({
      childId: "child-1",
      section: "practice",
      practiceTab: "select",
      canonicalPath: "/child/child-1/free-practice"
    });
    expect(matchChildRoute("/child/child-1/bank")).toEqual({
      childId: "child-1",
      section: "practice",
      practiceTab: "bank",
      canonicalPath: "/child/child-1/free-practice"
    });
    expect(matchChildRoute("/children")).toBeNull();
  });
});
