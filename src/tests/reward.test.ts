import { describe, expect, test } from "vitest";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { calculateStars, getEarnedBadges } from "../lib/reward";
import type { PracticeRecord } from "../types";

const record = (overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: crypto.randomUUID(),
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: "puzzle-a",
  gradeLevel: "grade3",
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
  stars: 0,
  mode: "adventure",
  ...overrides
});

describe("reward rules", () => {
  test("calculates 3 stars for a perfect in-time completion", () => {
    expect(calculateStars(record(), getDifficultyLevel(5))).toBe(3);
  });

  test("calculates 2 stars for a completed puzzle with a small mistake or hint", () => {
    expect(calculateStars(record({ mistakeCount: 1, hintCount: 1, durationSeconds: 999 }), getDifficultyLevel(5))).toBe(2);
  });

  test("calculates 1 star for a completed puzzle with weaker performance", () => {
    expect(calculateStars(record({ mistakeCount: 3, hintCount: 2, durationSeconds: 999 }), getDifficultyLevel(5))).toBe(1);
  });

  test("calculates 0 stars when the child gives up", () => {
    expect(calculateStars(record({ completed: false, gaveUp: true }), getDifficultyLevel(5))).toBe(0);
  });

  test("awards streak and challenge badges from recent records", () => {
    const records = [
      record({ id: "r3", finishedAt: "2026-01-03T00:00:00.000Z", mode: "challenge" }),
      record({ id: "r2", finishedAt: "2026-01-02T00:00:00.000Z" }),
      record({ id: "r1", finishedAt: "2026-01-01T00:00:00.000Z" })
    ];

    expect(getEarnedBadges(records).map((badge) => badge.id)).toEqual([
      "practice-streak",
      "careful-observer",
      "independent-thinker",
      "challenge-courage"
    ]);
  });
});
