import { getDifficultyLevel } from "../constants/difficultyLevels";
import type { PracticeRecord } from "../types";
import { evaluateNextLevel } from "../adaptive/adaptiveDifficulty";
import { calculateStars } from "../rewards/stars";

export const finalizePracticeRecord = (record: PracticeRecord): PracticeRecord => ({
  ...record,
  stars: calculateStars(record, getDifficultyLevel(record.level))
});

export const evaluatePracticeRecords = (records: PracticeRecord[], currentLevel: number, smartDifficultyEnabled: boolean) =>
  evaluateNextLevel(records, currentLevel, smartDifficultyEnabled);
