import { clampLevel, difficultyLevels, getDifficultyLevel } from "../constants/difficultyLevels";
import { createUuid } from "./browserCrypto";
import { generatePuzzleByConfig, generatePuzzleByLevel } from "./sudoku";
import type { GradeLevel, PracticeSource, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../types";

export const customDifficultyOptions: Record<SudokuSize, SudokuDifficulty[]> = {
  4: ["starter", "easy", "normal"],
  6: ["starter", "easy", "normal", "hard"],
  9: ["starter", "easy", "normal", "hard", "challenge"]
};

export const getAllowedCustomDifficulties = (size: SudokuSize): SudokuDifficulty[] => customDifficultyOptions[size];

export const getCustomPracticeValidity = (
  size: SudokuSize,
  difficulty: SudokuDifficulty
): { valid: boolean; message: string } => {
  if (getAllowedCustomDifficulties(size).includes(difficulty)) {
    return { valid: true, message: "" };
  }
  return {
    valid: false,
    message: `${size}×${size} 暂不支持这个难度，请选择当前题型允许的难度。`
  };
};

export const getPracticeLevelForSource = (currentLevel: number, source: Exclude<PracticeSource, "custom">): number => {
  if (source === "review") return clampLevel(currentLevel - 1);
  if (source === "challenge") return clampLevel(currentLevel + 1);
  return clampLevel(currentLevel);
};

export const getLevelForCustomConfig = (size: SudokuSize, difficulty: SudokuDifficulty): number => {
  const exact = difficultyLevels.find((level) => level.size === size && level.difficulty === difficulty);
  return exact?.level ?? getDifficultyLevel(1).level;
};

export interface GeneratePracticePuzzleInput {
  parentId: string;
  childId: string;
  gradeLevel: GradeLevel;
  currentLevel: number;
  source: PracticeSource;
  custom?: {
    size: SudokuSize;
    difficulty: SudokuDifficulty;
  };
}

export const generatePracticePuzzle = ({
  parentId,
  childId,
  gradeLevel,
  currentLevel,
  source,
  custom
}: GeneratePracticePuzzleInput): SudokuPuzzleItem => {
  if (source !== "custom") {
    const level = getPracticeLevelForSource(currentLevel, source);
    return {
      ...generatePuzzleByLevel(level),
      parentId,
      childId,
      gradeLevel,
      mode: "practice",
      source
    };
  }

  if (!custom) throw new Error("自选练习需要选择题型和难度。");
  const validity = getCustomPracticeValidity(custom.size, custom.difficulty);
  if (!validity.valid) throw new Error(validity.message);
  const box = custom.size === 9 ? { rows: 3, cols: 3 } : custom.size === 6 ? { rows: 2, cols: 3 } : { rows: 2, cols: 2 };
  const generated = generatePuzzleByConfig(custom.size, box.rows, box.cols, custom.difficulty);
  return {
    ...generated,
    id: createUuid(),
    parentId,
    childId,
    gradeLevel,
    level: getLevelForCustomConfig(custom.size, custom.difficulty),
    mode: "practice",
    source: "custom",
    createdAt: new Date().toISOString()
  };
};

/** Creates a fresh board without changing the current practice or adventure context. */
export const generateReplacementPuzzle = (puzzle: SudokuPuzzleItem): SudokuPuzzleItem => {
  const generated = generatePuzzleByConfig(puzzle.size, puzzle.boxRows, puzzle.boxCols, puzzle.difficulty);
  return {
    ...puzzle,
    ...generated,
    id: createUuid(),
    createdAt: new Date().toISOString()
  };
};
