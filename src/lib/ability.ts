import { getColdStartPracticeConfig, getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, sizeLabels } from "../constants/gradeLabels";
import { getLevelTitle } from "../constants/levelTitles";
import type { AbilityAssessmentStatus, ChildProfile, PracticeRecord, SudokuDifficulty, SudokuSize } from "../types";

export interface AbilityRecommendedConfig {
  level: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  reason: "grade-cold-start" | "ability-level";
}

export interface AbilityDisplayModel {
  status: AbilityAssessmentStatus;
  title: string;
  subtitle: string;
  level?: number;
  recommendedConfig: AbilityRecommendedConfig;
}

export const isValidAbilityAssessmentRecord = (record: PracticeRecord): boolean =>
  record.completed && !record.gaveUp && !record.viewedAnswer && Boolean(record.finishedAt);

export const getValidAbilityAssessmentRecords = (records: PracticeRecord[]): PracticeRecord[] =>
  records.filter(isValidAbilityAssessmentRecord);

export const getAbilityAssessmentStatus = (
  child: ChildProfile,
  records: PracticeRecord[]
): AbilityAssessmentStatus => {
  const validCount = getValidAbilityAssessmentRecords(records).length;
  if (validCount >= 5) return "established";
  if (validCount >= 1) return "provisional";
  return child.abilityAssessmentStatus ?? "unassessed";
};

const getCurrentRecommendation = (child: ChildProfile): AbilityRecommendedConfig => {
  const config = getDifficultyLevel(child.currentLevel);
  return {
    level: config.level,
    size: config.size,
    difficulty: config.difficulty,
    reason: "ability-level"
  };
};

const formatRecommendation = (config: AbilityRecommendedConfig): string =>
  `${sizeLabels[config.size]} ${difficultyLabels[config.difficulty]}`;

export const getAbilityDisplayModel = (child: ChildProfile, records: PracticeRecord[]): AbilityDisplayModel => {
  const status = getAbilityAssessmentStatus(child, records);
  if (status === "unassessed") {
    const config = getColdStartPracticeConfig(child.gradeLevel);
    return {
      status,
      title: "待探索",
      subtitle: "完成几道练习后，系统会逐渐了解你的数独水平。",
      recommendedConfig: config
    };
  }

  const config = getCurrentRecommendation(child);
  if (status === "provisional") {
    return {
      status,
      title: "正在了解",
      subtitle: `当前推荐 ${formatRecommendation(config)}`,
      recommendedConfig: config
    };
  }

  return {
    status,
    title: `L${config.level} ${getLevelTitle(config.level)}`,
    subtitle: formatRecommendation(config),
    level: config.level,
    recommendedConfig: config
  };
};
