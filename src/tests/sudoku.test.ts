import { describe, expect, test } from "vitest";
import { clueRanges, difficultyLevels } from "../constants/difficultyLevels";
import {
  countSolutions,
  generatePuzzleByLevel,
  isValidMove,
  solveSudoku
} from "../lib/sudoku";

describe("sudoku engine", () => {
  test("uses the upgraded clue calibration across every board size", () => {
    expect(clueRanges[4]).toEqual({
      starter: [8, 9],
      easy: [7, 8],
      normal: [6, 7],
      hard: [5, 6],
      challenge: [5, 6]
    });
    expect(clueRanges[6]).toEqual({
      starter: [21, 24],
      easy: [18, 21],
      normal: [15, 18],
      hard: [13, 15],
      challenge: [12, 14]
    });
    expect(clueRanges[9]).toEqual({
      starter: [40, 44],
      easy: [34, 39],
      normal: [29, 34],
      hard: [24, 29],
      challenge: [21, 24]
    });
  });

  test("keeps 4x4 starter puzzles challenging but solvable for early learners", () => {
    const puzzle = generatePuzzleByLevel(1);

    expect(puzzle.clues).toBeGreaterThanOrEqual(8);
    expect(puzzle.clues).toBeLessThanOrEqual(9);
    expect(puzzle.emptyCount).toBeGreaterThanOrEqual(7);
    expect(countSolutions(puzzle.puzzle, 4, 2, 2)).toBe(1);
  });

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
