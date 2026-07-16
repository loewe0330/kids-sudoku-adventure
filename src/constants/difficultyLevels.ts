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
  level(1, 4, 2, 2, "starter", 210, 1, 1),
  level(2, 4, 2, 2, "easy", 270, 1, 1),
  level(3, 4, 2, 2, "normal", 330, 2, 1),
  level(4, 6, 2, 3, "starter", 420, 2, 1),
  level(5, 6, 2, 3, "easy", 540, 2, 1),
  level(6, 6, 2, 3, "normal", 660, 3, 2),
  level(7, 9, 3, 3, "starter", 780, 3, 2),
  level(8, 9, 3, 3, "easy", 960, 3, 2),
  level(9, 9, 3, 3, "normal", 1260, 4, 2),
  level(10, 9, 3, 3, "hard", 1620, 5, 3),
  level(11, 9, 3, 3, "challenge", 1920, 6, 3)
];

const gradeColdStartLevels: Record<GradeLevel, number> = {
  grade1: 1,
  grade2: 2,
  grade3: 3,
  grade4: 4,
  grade5: 5,
  grade6: 6,
  middle: 7
};

export const getDifficultyLevel = (levelNumber: number): DifficultyLevelConfig =>
  difficultyLevels.find((item) => item.level === levelNumber) ?? difficultyLevels[0];

export const clampLevel = (levelNumber: number): number => Math.min(11, Math.max(1, levelNumber));

export interface ColdStartPracticeConfig {
  level: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  reason: "grade-cold-start";
}

export const getColdStartPracticeConfig = (gradeLevel: GradeLevel): ColdStartPracticeConfig => {
  const config = getDifficultyLevel(gradeColdStartLevels[gradeLevel]);
  return {
    level: config.level,
    size: config.size,
    difficulty: config.difficulty,
    reason: "grade-cold-start"
  };
};

export const clueRanges: Record<SudokuSize, Record<SudokuDifficulty, [number, number]>> = {
  4: {
    starter: [8, 9],
    easy: [7, 8],
    normal: [6, 7],
    hard: [5, 6],
    challenge: [5, 6]
  },
  6: {
    starter: [21, 24],
    easy: [18, 21],
    normal: [15, 18],
    hard: [13, 15],
    challenge: [12, 14]
  },
  9: {
    starter: [40, 44],
    easy: [34, 39],
    normal: [29, 34],
    hard: [24, 29],
    challenge: [21, 24]
  }
};
