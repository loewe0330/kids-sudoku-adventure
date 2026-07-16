import { describe, expect, test } from "vitest";
import { countSolutions } from "../lib/sudoku";
import {
  getAllowedCustomDifficulties,
  getCustomPracticeValidity,
  getPracticeLevelForSource,
  generatePracticePuzzle,
  generateReplacementPuzzle
} from "../lib/practiceRules";

describe("free practice rules", () => {
  test.each([
    { level: 1, size: 4, difficulty: "starter" },
    { level: 5, size: 6, difficulty: "easy" },
    { level: 9, size: 9, difficulty: "normal" }
  ] as const)("smart practice at L$level generates expected puzzle config", ({ level, size, difficulty }) => {
    const puzzle = generatePracticePuzzle({
      parentId: "parent-a",
      childId: "child-a",
      gradeLevel: "grade3",
      currentLevel: level,
      source: "smart"
    });

    expect(puzzle.level).toBe(level);
    expect(puzzle.size).toBe(size);
    expect(puzzle.difficulty).toBe(difficulty);
    expect(countSolutions(puzzle.puzzle, puzzle.size, puzzle.boxRows, puzzle.boxCols)).toBe(1);
    expect(puzzle.puzzle.flat().some((cell) => cell === 0)).toBe(true);
    expect(puzzle.solution.flat().every((cell) => cell > 0)).toBe(true);
  });

  test("review and challenge practice clamp to L1 and L11", () => {
    expect(getPracticeLevelForSource(1, "review")).toBe(1);
    expect(getPracticeLevelForSource(11, "challenge")).toBe(11);
  });

  test("smart practice uses the supplied daily recommendation configuration", () => {
    const puzzle = generatePracticePuzzle({
      parentId: "parent-a",
      childId: "child-a",
      gradeLevel: "grade5",
      currentLevel: 5,
      source: "smart",
      recommendedConfig: { level: 5, size: 6, difficulty: "normal" }
    });

    expect(puzzle).toMatchObject({ level: 5, size: 6, difficulty: "normal", source: "smart" });
  });

  test("custom practice limits legal size and difficulty combinations", () => {
    expect(getAllowedCustomDifficulties(4)).toEqual(["starter", "easy", "normal"]);
    expect(getAllowedCustomDifficulties(6)).toEqual(["starter", "easy", "normal", "hard"]);
    expect(getAllowedCustomDifficulties(9)).toEqual(["starter", "easy", "normal", "hard", "challenge"]);

    expect(getCustomPracticeValidity(4, "hard").valid).toBe(false);
    expect(getCustomPracticeValidity(4, "challenge").valid).toBe(false);
    expect(getCustomPracticeValidity(6, "challenge").valid).toBe(false);
    expect(getCustomPracticeValidity(9, "challenge").valid).toBe(true);
  });

  test("self-selected practice keeps practice mode and custom source", () => {
    const puzzle = generatePracticePuzzle({
      parentId: "parent-a",
      childId: "child-a",
      gradeLevel: "grade3",
      currentLevel: 5,
      source: "custom",
      custom: { size: 4, difficulty: "starter" }
    });

    expect(puzzle.mode).toBe("practice");
    expect(puzzle.source).toBe("custom");
  });

  test("replacement keeps the active puzzle configuration and session context", () => {
    const current = {
      ...generatePracticePuzzle({
        parentId: "parent-a",
        childId: "child-a",
        gradeLevel: "grade3",
        currentLevel: 7,
        source: "custom",
        custom: { size: 9, difficulty: "hard" }
      }),
      level: 7,
      mode: "adventure" as const,
      source: "stage" as const,
      stageIndex: 4
    };

    const next = generateReplacementPuzzle(current);

    expect(next.id).not.toBe(current.id);
    expect(next).toMatchObject({
      parentId: current.parentId,
      childId: current.childId,
      gradeLevel: current.gradeLevel,
      size: current.size,
      boxRows: current.boxRows,
      boxCols: current.boxCols,
      difficulty: current.difficulty,
      level: current.level,
      mode: "adventure",
      source: "stage",
      stageIndex: 4
    });
    expect(countSolutions(next.puzzle, next.size, next.boxRows, next.boxCols)).toBe(1);
  });
});
