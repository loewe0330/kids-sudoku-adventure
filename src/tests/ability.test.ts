import { describe, expect, test } from "vitest";
import { getAbilityAssessmentStatus, getAbilityDisplayModel } from "../lib/ability";
import type { ChildProfile, PracticeRecord } from "../types";

const child = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade5",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 7,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  },
  ...overrides
});

const record = (index: number, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: `record-${index}`,
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: `puzzle-${index}`,
  gradeLevel: "grade5",
  level: 5,
  size: 6,
  difficulty: "easy",
  startedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: "2026-01-01T00:05:00.000Z",
  durationSeconds: 300,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  stars: 3,
  mode: "practice",
  source: "smart",
  ...overrides
});

describe("ability assessment display", () => {
  test("new children are unassessed and use grade cold start only as a recommendation", () => {
    const model = getAbilityDisplayModel(child({ currentLevel: 1, abilityAssessmentStatus: "unassessed" }), []);
    expect(model).toMatchObject({
      status: "unassessed",
      title: "待探索",
      recommendedConfig: { size: 6, difficulty: "easy", reason: "grade-cold-start" }
    });
  });

  test("completed records move assessment from provisional to established without coupling adventure progress", () => {
    expect(getAbilityAssessmentStatus(child({ currentLevel: 7, adventureProgress: [] }), [record(1)])).toBe("provisional");
    const model = getAbilityDisplayModel(child({ currentLevel: 7, adventureProgress: [] }), [1, 2, 3, 4, 5].map((index) => record(index)));
    expect(model).toMatchObject({ status: "established", title: "L7 九宫格勇士", level: 7 });
  });

  test("incomplete, gave-up, and answerless records do not establish an ability", () => {
    const records = [
      record(1, { completed: false }),
      record(2, { gaveUp: true }),
      record(3, { finishedAt: undefined })
    ];
    expect(getAbilityAssessmentStatus(child(), records)).toBe("unassessed");
  });
});
