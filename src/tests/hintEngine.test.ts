import { describe, expect, test } from "vitest";
import { calculateCandidates, getGuidedHint } from "../lib/hintEngine";

const board4 = [
  [1, 0, 0, 4],
  [0, 4, 1, 0],
  [0, 1, 4, 0],
  [4, 0, 0, 1]
];

const solution4 = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

describe("guided hint engine", () => {
  test("calculates candidates by excluding row, column, and box values", () => {
    expect(calculateCandidates(board4, 0, 1, 4, 2, 2)).toEqual([2, 3]);
    expect(calculateCandidates(board4, 0, 2, 4, 2, 2)).toEqual([2, 3]);
  });

  test("returns level 1 observation without revealing or filling the answer", () => {
    const hint = getGuidedHint({
      board: board4,
      puzzle: board4,
      solution: solution4,
      size: 4,
      boxRows: 2,
      boxCols: 2,
      selectedCell: [0, 1],
      hintLevel: 1
    });

    expect(hint.targetRow).toBe(0);
    expect(hint.targetCol).toBe(1);
    expect(hint.hintLevel).toBe(1);
    expect(hint.message).not.toContain("答案是");
    expect(hint.candidates).toBeUndefined();
  });

  test("returns level 2 candidates but does not include the concrete answer in the message", () => {
    const hint = getGuidedHint({
      board: board4,
      puzzle: board4,
      solution: solution4,
      size: 4,
      boxRows: 2,
      boxCols: 2,
      selectedCell: [0, 1],
      hintLevel: 2
    });

    expect(hint.hintLevel).toBe(2);
    expect(hint.candidates).toEqual([2, 3]);
    expect(hint.message).not.toContain("答案");
  });

  test("does not expose a single concrete candidate as the answer", () => {
    const current = [
      [1, 0, 0, 4],
      [0, 4, 1, 0],
      [0, 1, 4, 0],
      [4, 3, 0, 1]
    ];
    const hint = getGuidedHint({
      board: current,
      puzzle: board4,
      solution: solution4,
      size: 4,
      boxRows: 2,
      boxCols: 2,
      selectedCell: [0, 1],
      hintLevel: 3
    });

    expect(hint.message).not.toContain("2");
    expect(hint.candidates).toBeUndefined();
  });

  test("skips givens and already-correct cells when choosing a target", () => {
    const current = [
      [1, 2, 0, 4],
      [0, 4, 1, 0],
      [0, 1, 4, 0],
      [4, 0, 0, 1]
    ];

    const hint = getGuidedHint({
      board: current,
      puzzle: board4,
      solution: solution4,
      size: 4,
      boxRows: 2,
      boxCols: 2,
      selectedCell: [0, 1],
      hintLevel: 1
    });

    expect(`${hint.targetRow}-${hint.targetCol}`).not.toBe("0-0");
    expect(`${hint.targetRow}-${hint.targetCol}`).not.toBe("0-1");
  });

  test("can exclude the current hint cell when asking for another target", () => {
    const hint = getGuidedHint({
      board: board4,
      puzzle: board4,
      solution: solution4,
      size: 4,
      boxRows: 2,
      boxCols: 2,
      selectedCell: null,
      hintLevel: 1,
      excludedCells: ["0-1"]
    });

    expect(`${hint.targetRow}-${hint.targetCol}`).not.toBe("0-1");
  });
});
