import { describe, expect, test } from "vitest";
import { evaluateNextLevel } from "../lib/adaptiveDifficulty";
import {
  getLevelTitle,
  getPracticeBadgeSummary,
  getResultEncouragement
} from "../lib/gamification";
import {
  getGradeMethods,
  getLevelMethods,
  sudokuMethods
} from "../lib/methodGuide";
import type { PracticeRecord } from "../types";

const record = (overrides: Partial<PracticeRecord>): PracticeRecord => ({
  id: crypto.randomUUID(),
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: "puzzle",
  gradeLevel: "grade5",
  level: 8,
  size: 9,
  difficulty: "easy",
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  durationSeconds: 180,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  ...overrides,
  stars: overrides.stars ?? 3,
  mode: overrides.mode ?? "adventure"
});

describe("learning support content", () => {
  test("all L1-L11 levels have child-friendly titles", () => {
    expect(Array.from({ length: 11 }, (_, index) => getLevelTitle(index + 1))).toEqual([
      "数字小苗",
      "观察小能手",
      "宫格探险家",
      "排除法新手",
      "数独小侦探",
      "逻辑小达人",
      "九宫格勇士",
      "推理训练师",
      "数独高手",
      "挑战大师",
      "终极数独王"
    ]);
  });

  test("grade and level methods match the requested learning path", () => {
    expect(getGradeMethods("grade1").map((item) => item.id)).toEqual(["rules", "observation"]);
    expect(getGradeMethods("grade4").map((item) => item.id)).toEqual(["rules", "observation", "elimination"]);
    expect(getGradeMethods("grade6").map((item) => item.id)).toEqual(["elimination", "singleCandidate", "rowUnique", "boxUnique"]);
    expect(getGradeMethods("middle").length).toBe(sudokuMethods.length);

    expect(getLevelMethods(2).map((item) => item.id)).toEqual(["rules", "observation"]);
    expect(getLevelMethods(7).map((item) => item.id)).toEqual(["elimination", "singleCandidate", "rowUnique"]);
  });

  test("streak badges detect completion, no-error, and no-hint rewards", () => {
    const badges = getPracticeBadgeSummary([record({}), record({}), record({})]);
    expect(badges.map((item) => item.name)).toEqual(["坚持练习星", "细心观察星", "独立思考星"]);
  });

  test("adaptive difficulty messages include titles and avoid discouraging downgrade copy", () => {
    const up = evaluateNextLevel([record({}), record({}), record({})], 5);
    expect(up.reason).toContain("L5 数独小侦探");
    expect(up.reason).toContain("L6 逻辑小达人");

    const down = evaluateNextLevel([
      record({ completed: false, gaveUp: true }),
      record({ completed: false, gaveUp: true })
    ], 5);
    expect(down.reason).not.toContain("降级失败");
    expect(down.reason).toContain("打好基础");
  });

  test("result encouragement produces a child-friendly summary", () => {
    const text = getResultEncouragement({ completed: true, mistakes: 0, hints: 0, action: "keep" });
    expect(text).toContain("太棒了");
  });
});
