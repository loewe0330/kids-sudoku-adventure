import { describe, expect, test } from "vitest";
import { clueRanges, difficultyLevels } from "../constants/difficultyLevels";
import {
  countSolutions,
  generatePuzzleByLevel,
  isValidMove,
  solveSudoku
} from "../lib/sudoku";

describe("sudoku engine", () => {
  test.each(difficultyLevels)("level L$level generates a unique puzzle in its configured difficulty range", (config) => {
    const item = generatePuzzleByLevel(config.level);
    const [minClues, maxClues] = clueRanges[config.size][config.difficulty];

    expect(countSolutions(item.puzzle, item.size, item.boxRows, item.boxCols)).toBe(1);
    expect(item.size).toBe(config.size);
    expect(item.boxRows).toBe(config.boxRows);
    expect(item.boxCols).toBe(config.boxCols);
    expect(item.difficulty).toBe(config.difficulty);
    expect(item.clues).toBeGreaterThanOrEqual(minClues);
    expect(item.clues).toBeLessThanOrEqual(maxClues);
    expect(item.solution.flat().every((cell) => cell > 0)).toBe(true);
    expect(item.puzzle.flat().filter((cell) => cell === 0).length).toBe(item.emptyCount);
  }, 10000);

  test("isValidMove respects rows, columns, and boxes", () => {
    const board = [
      [1, 0, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0]
    ];

    expect(isValidMove(board, 0, 1, 1, 4, 2, 2)).toBe(false);
    expect(isValidMove(board, 1, 0, 2, 4, 2, 2)).toBe(false);
    expect(isValidMove(board, 1, 1, 1, 4, 2, 2)).toBe(false);
    expect(isValidMove(board, 1, 1, 3, 4, 2, 2)).toBe(true);
  });

  test("solveSudoku solves a valid 4x4 puzzle", () => {
    const puzzle = [
      [1, 0, 0, 4],
      [0, 4, 1, 0],
      [0, 1, 4, 0],
      [4, 0, 0, 1]
    ];

    const solved = solveSudoku(puzzle, 4, 2, 2);
    expect(solved).not.toBeNull();
    expect(solved?.flat().every((cell) => cell >= 1 && cell <= 4)).toBe(true);
  });
});
