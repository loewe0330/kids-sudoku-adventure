import type { DifficultyLevelConfig, GradeLevel, SudokuDifficulty, SudokuSize } from "../types";
import { difficultyLabels, sizeLabels } from "./gradeLabels";
import { getLevelTitle } from "./levelTitles";

const level = (
  levelNumber: number,
  size: SudokuSize,
  boxRows: number,
  boxCols: number,
  difficulty: SudokuDifficulty,
  recommendedTimeSeconds: number,
  maxGoodErrors: number,
  maxGoodHints: number
): DifficultyLevelConfig => ({
  level: levelNumber,
  size,
  boxRows,
  boxCols,
  difficulty,
  label: `L${levelNumber} ${getLevelTitle(levelNumber)}｜${sizeLabels[size]} ${difficultyLabels[difficulty]}`,
  recommendedTimeSeconds,
  maxGoodErrors,
  maxGoodHints
});

export const difficultyLevels: DifficultyLevelConfig[] = [
  level(1, 4, 2, 2, "starter", 180, 1, 1),
  level(2, 4, 2, 2, "easy", 240, 1, 1),
  level(3, 4, 2, 2, "normal", 300, 2, 1),
  level(4, 6, 2, 3, "starter", 360, 2, 1),
  level(5, 6, 2, 3, "easy", 480, 2, 1),
  level(6, 6, 2, 3, "normal", 600, 3, 2),
  level(7, 9, 3, 3, "starter", 720, 3, 2),
  level(8, 9, 3, 3, "easy", 900, 3, 2),
  level(9, 9, 3, 3, "normal", 1200, 4, 2),
  level(10, 9, 3, 3, "hard", 1500, 5, 3),
  level(11, 9, 3, 3, "challenge", 1800, 6, 3)
];

export const gradeDefaultLevels: Record<GradeLevel, number> = {
  grade1: 1,
  grade2: 3,
  grade3: 5,
  grade4: 7,
  grade5: 8,
  grade6: 9,
  middle: 10
};

export const getDifficultyLevel = (levelNumber: number): DifficultyLevelConfig =>
  difficultyLevels.find((item) => item.level === levelNumber) ?? difficultyLevels[0];

export const clampLevel = (levelNumber: number): number => Math.min(11, Math.max(1, levelNumber));

export const clueRanges: Record<SudokuSize, Record<SudokuDifficulty, [number, number]>> = {
  4: {
    starter: [10, 12],
    easy: [8, 10],
    normal: [6, 8],
    hard: [6, 8],
    challenge: [6, 8]
  },
  6: {
    starter: [24, 28],
    easy: [20, 24],
    normal: [16, 20],
    hard: [14, 16],
    challenge: [14, 16]
  },
  9: {
    starter: [45, 50],
    easy: [38, 44],
    normal: [32, 37],
    hard: [26, 31],
    challenge: [22, 25]
  }
};
