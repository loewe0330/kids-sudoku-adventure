import { describe, expect, test } from "vitest";
import { getColdStartPracticeConfig } from "../constants/difficultyLevels";
import { evaluateNextLevel } from "../lib/adaptiveDifficulty";
import type { PracticeRecord } from "../types";

const record = (overrides: Partial<PracticeRecord>): PracticeRecord => ({
  id: crypto.randomUUID(),
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: "puzzle",
  gradeLevel: "grade3",
  level: 5,
  size: 6,
  difficulty: "easy",
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  durationSeconds: 120,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  ...overrides,
  stars: overrides.stars ?? 3,
  mode: overrides.mode ?? "practice",
  source: overrides.source ?? "smart"
});

describe("adaptive difficulty", () => {
  test("grade cold start maps the first practice without assigning an ability level", () => {
    expect(getColdStartPracticeConfig("grade1")).toMatchObject({ size: 4, difficulty: "starter", reason: "grade-cold-start" });
    expect(getColdStartPracticeConfig("grade3")).toMatchObject({ size: 4, difficulty: "normal", reason: "grade-cold-start" });
    expect(getColdStartPracticeConfig("grade5")).toMatchObject({ size: 6, difficulty: "easy", reason: "grade-cold-start" });
    expect(getColdStartPracticeConfig("grade6")).toMatchObject({ size: 6, difficulty: "normal", reason: "grade-cold-start" });
  });

  test("three excellent completed records upgrade one level", () => {
    const records = [record({}), record({}), record({})];
    expect(evaluateNextLevel(records, 5)).toMatchObject({ nextLevel: 6, action: "up" });
  });

  test("two recent gave-up records downgrade one level", () => {
    const records = [
      record({ completed: false, gaveUp: true }),
      record({ completed: false, gaveUp: true })
    ];
    expect(evaluateNextLevel(records, 5)).toMatchObject({ nextLevel: 4, action: "down" });
  });

  test("difficulty stays inside L1 to L11", () => {
    expect(evaluateNextLevel([record({ completed: false, gaveUp: true }), record({ completed: false, gaveUp: true })], 1).nextLevel).toBe(1);
    expect(evaluateNextLevel([record({}), record({}), record({})], 11).nextLevel).toBe(11);
  });

  test("disabled smart difficulty keeps the current level", () => {
    const records = [record({}), record({}), record({})];
    expect(evaluateNextLevel(records, 5, false)).toMatchObject({ nextLevel: 5, action: "keep" });
  });

  test("custom practice records do not trigger adaptive upgrade", () => {
    const records = [
      record({ source: "custom" }),
      record({ source: "custom" }),
      record({ source: "custom" })
    ];

    expect(evaluateNextLevel(records, 5)).toMatchObject({ nextLevel: 5, action: "keep" });
  });

  test("smart free practice records can trigger adaptive upgrade", () => {
    const records = [
      record({ source: "smart" }),
      record({ source: "smart" }),
      record({ source: "smart" })
    ];

    expect(evaluateNextLevel(records, 5)).toMatchObject({ nextLevel: 6, action: "up" });
  });
});
