import { describe, expect, test } from "vitest";
import { evaluateNextLevel } from "../core/adaptive/adaptiveDifficulty";
import { getAdventureMap } from "../core/adventure/adventureProgress";
import { getDifficultyLevel } from "../core/constants/difficultyLevels";
import { calculateStars } from "../core/rewards/stars";
import { calculateCandidates } from "../core/sudoku/candidates";
import { generatePuzzleByLevel } from "../core/sudoku/generator";
import type { ChildProfile, PracticeRecord } from "../core/types";

const record: PracticeRecord = {
  id: "record-a",
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
  mode: "adventure"
};

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
};

describe("core architecture", () => {
  test("exposes reusable pure TypeScript capabilities through core modules", () => {
    expect(generatePuzzleByLevel(1).size).toBe(4);
    expect(calculateCandidates([[1, 0], [0, 0]], 0, 1, 2, 1, 2)).toContain(2);
    expect(evaluateNextLevel([record, record, record], 5).action).toBe("up");
    expect(calculateStars(record, getDifficultyLevel(5))).toBe(3);
    expect(getAdventureMap(child).find((stage) => stage.level === 1 && stage.stageIndex === 1)?.unlocked).toBe(true);
  });

  test("core source files do not directly depend on React or browser platform APIs", () => {
    const files = import.meta.glob("../core/**/*.{ts,tsx}", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
    const banned = /\b(React|useState|useEffect|window|document|localStorage|AudioContext)\b/;
    const offenders = Object.entries(files)
      .filter(([, source]) => banned.test(source))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});
