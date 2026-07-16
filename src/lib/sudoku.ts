import { clueRanges, getDifficultyLevel } from "../constants/difficultyLevels";
import type { ChildProfile, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../types";
import { createUuid } from "./browserCrypto";

export const createEmptyBoard = (size: SudokuSize): number[][] =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

export const cloneBoard = (board: number[][]): number[][] => board.map((row) => [...row]);

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const numbersForSize = (size: SudokuSize): number[] => Array.from({ length: size }, (_, index) => index + 1);

export const isValidMove = (
  board: number[][],
  row: number,
  col: number,
  num: number,
  size: SudokuSize,
  boxRows: number,
  boxCols: number
): boolean => {
  if (num < 1 || num > size) return false;
  for (let index = 0; index < size; index += 1) {
    if (index !== col && board[row][index] === num) return false;
    if (index !== row && board[index][col] === num) return false;
  }

  const startRow = Math.floor(row / boxRows) * boxRows;
  const startCol = Math.floor(col / boxCols) * boxCols;
  for (let r = startRow; r < startRow + boxRows; r += 1) {
    for (let c = startCol; c < startCol + boxCols; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
    }
  }

  return true;
};

const findEmptyCell = (board: number[][], size: SudokuSize): [number, number] | null => {
  let best: [number, number] | null = null;
  let bestCount = Number.POSITIVE_INFINITY;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] === 0) {
        const count = numbersForSize(size).filter((num) => isValidMove(board, row, col, num, size, Math.sqrt(size) === 3 ? 3 : 2, size === 6 ? 3 : 2)).length;
        if (count < bestCount) {
          best = [row, col];
          bestCount = count;
        }
      }
    }
  }
  return best;
};

const solveInPlace = (
  board: number[][],
  size: SudokuSize,
  boxRows: number,
  boxCols: number,
  randomize: boolean
): boolean => {
  let target: [number, number] | null = null;
  let fewestCandidates = Number.POSITIVE_INFINITY;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] === 0) {
        const candidates = numbersForSize(size).filter((num) => isValidMove(board, row, col, num, size, boxRows, boxCols));
        if (candidates.length < fewestCandidates) {
          fewestCandidates = candidates.length;
          target = [row, col];
        }
      }
    }
  }
  if (!target) return true;
  if (fewestCandidates === 0) return false;

  const [row, col] = target;
  const candidates = numbersForSize(size).filter((num) => isValidMove(board, row, col, num, size, boxRows, boxCols));
  for (const num of randomize ? shuffle(candidates) : candidates) {
    board[row][col] = num;
    if (solveInPlace(board, size, boxRows, boxCols, randomize)) return true;
    board[row][col] = 0;
  }
  return false;
};

export const solveSudoku = (
  board: number[][],
  size: SudokuSize,
  boxRows: number,
  boxCols: number
): number[][] | null => {
  const copy = cloneBoard(board);
  return solveInPlace(copy, size, boxRows, boxCols, false) ? copy : null;
};

export const countSolutions = (
  board: number[][],
  size: SudokuSize,
  boxRows: number,
  boxCols: number,
  limit = 2
): number => {
  const copy = cloneBoard(board);
  let count = 0;

  const search = (): void => {
    if (count >= limit) return;
    let target: [number, number] | null = null;
    let fewestCandidates = Number.POSITIVE_INFINITY;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (copy[row][col] === 0) {
          const candidates = numbersForSize(size).filter((num) => isValidMove(copy, row, col, num, size, boxRows, boxCols));
          if (candidates.length < fewestCandidates) {
            fewestCandidates = candidates.length;
            target = [row, col];
          }
        }
      }
    }
    if (!target) {
      count += 1;
      return;
    }
    if (fewestCandidates === 0) return;

    const [row, col] = target;
    for (const num of numbersForSize(size)) {
      if (isValidMove(copy, row, col, num, size, boxRows, boxCols)) {
        copy[row][col] = num;
        search();
        copy[row][col] = 0;
      }
    }
  };

  search();
  return count;
};

export const generateSolvedBoard = (size: SudokuSize, boxRows: number, boxCols: number): number[][] => {
  const board = createEmptyBoard(size);
  if (!solveInPlace(board, size, boxRows, boxCols, true)) {
    throw new Error("无法生成完整数独终盘");
  }
  return board;
};

const randomInt = (min: number, max: number): number => min + Math.floor(Math.random() * (max - min + 1));

export const generatePuzzleByConfig = (
  size: SudokuSize,
  boxRows: number,
  boxCols: number,
  difficulty: SudokuDifficulty
): Omit<SudokuPuzzleItem, "id" | "parentId" | "childId" | "createdAt" | "gradeLevel" | "level"> => {
  const [minClues, maxClues] = clueRanges[size][difficulty];
  let bestAttempt: { solution: number[][]; puzzle: number[][]; clues: number } | null = null;

  for (let generationAttempt = 0; generationAttempt < 24; generationAttempt += 1) {
    const solution = generateSolvedBoard(size, boxRows, boxCols);
    const puzzle = cloneBoard(solution);
    const targetClues = randomInt(minClues, maxClues);
    const positions = shuffle(Array.from({ length: size * size }, (_, index) => index));
    let clues = size * size;

    for (const position of positions) {
      if (clues <= targetClues) break;
      const row = Math.floor(position / size);
      const col = position % size;
      const previous = puzzle[row][col];
      puzzle[row][col] = 0;

      if (countSolutions(puzzle, size, boxRows, boxCols, 2) !== 1) {
        puzzle[row][col] = previous;
      } else {
        clues -= 1;
      }
    }

    if (!bestAttempt || clues < bestAttempt.clues) bestAttempt = { solution, puzzle, clues };
    if (clues <= maxClues) break;
  }

  if (!bestAttempt || bestAttempt.clues > maxClues) {
    throw new Error(`无法在配置范围内生成 ${size}×${size} 数独题`);
  }

  return {
    size,
    boxRows,
    boxCols,
    difficulty,
    puzzle: bestAttempt.puzzle,
    solution: bestAttempt.solution,
    clues: bestAttempt.clues,
    emptyCount: size * size - bestAttempt.clues
  };
};

export const generatePuzzleByLevel = (level: number): SudokuPuzzleItem => {
  const config = getDifficultyLevel(level);
  const generated = generatePuzzleByConfig(config.size, config.boxRows, config.boxCols, config.difficulty);
  return {
    id: createUuid(),
    parentId: "",
    childId: "",
    gradeLevel: "grade1",
    level: config.level,
    createdAt: new Date().toISOString(),
    ...generated
  };
};

export const generatePuzzleForChild = (child: ChildProfile): SudokuPuzzleItem => {
  const config = getDifficultyLevel(child.currentLevel);
  const generated = generatePuzzleByConfig(config.size, config.boxRows, config.boxCols, config.difficulty);
  return {
    id: createUuid(),
    parentId: child.parentId,
    childId: child.id,
    gradeLevel: child.gradeLevel,
    level: config.level,
    createdAt: new Date().toISOString(),
    ...generated
  };
};
