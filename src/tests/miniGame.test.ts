import { describe, expect, test } from "vitest";
import {
  MINI_GAME_SIZE,
  areMiniGamePositionsAdjacent,
  createMiniGameBoard,
  findMiniGameMatches,
  miniGameBoardHasPossibleMove,
  resolveMiniGameSwap,
  swapMiniGameTiles,
  type MiniGameBoard
} from "../lib/miniGame";

const playableBoard: MiniGameBoard = [
  ["star", "leaf", "star", "chest", "flag", "grass"],
  ["leaf", "star", "grass", "flag", "chest", "leaf"],
  ["flag", "star", "chest", "grass", "leaf", "flag"],
  ["grass", "chest", "leaf", "star", "flag", "grass"],
  ["chest", "flag", "grass", "leaf", "star", "chest"],
  ["leaf", "grass", "flag", "chest", "leaf", "star"]
];

describe("star link match game engine", () => {
  test("creates a playable 6 by 6 board without an initial match", () => {
    const board = createMiniGameBoard(() => 0.42);
    expect(board).toHaveLength(MINI_GAME_SIZE);
    expect(board.every((row) => row.length === MINI_GAME_SIZE)).toBe(true);
    expect(findMiniGameMatches(board).size).toBe(0);
    expect(miniGameBoardHasPossibleMove(board)).toBe(true);
  });

  test("recognizes adjacency and swaps only the requested positions", () => {
    expect(areMiniGamePositionsAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(areMiniGamePositionsAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
    const swapped = swapMiniGameTiles(playableBoard, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(swapped[0][0]).toBe("leaf");
    expect(swapped[0][1]).toBe("star");
    expect(playableBoard[0][0]).toBe("star");
  });

  test("rejects a non-adjacent move without changing the board", () => {
    const result = resolveMiniGameSwap(playableBoard, { row: 0, col: 0 }, { row: 2, col: 2 });
    expect(result.valid).toBe(false);
    expect(result.board).toEqual(playableBoard);
    expect(result.score).toBe(0);
  });

  test("rolls back an adjacent move when it does not make a match", () => {
    const result = resolveMiniGameSwap(playableBoard, { row: 5, col: 4 }, { row: 5, col: 5 });
    expect(result.valid).toBe(false);
    expect(result.board).toEqual(playableBoard);
  });

  test("removes a match, scores tiles and counts collected stars", () => {
    let value = 0;
    const result = resolveMiniGameSwap(
      playableBoard,
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      () => ((value += 0.17) % 1)
    );
    expect(result.valid).toBe(true);
    expect(result.removed).toBeGreaterThanOrEqual(3);
    expect(result.score).toBe(result.removed * 10);
    expect(result.stars).toBeGreaterThanOrEqual(3);
    expect(findMiniGameMatches(result.board).size).toBe(0);
  });
});
