import { getDifficultyLevel } from "../constants/difficultyLevels";
import type { Badge, ChildProfile, PracticeRecord } from "../types";
import { getAdventureStats } from "../adventure/adventureProgress";
import { getEarnedBadges, getTotalPracticeStars } from "../../lib/reward";

export const getCompletionRate = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.filter((record) => record.completed).length / records.length;

export const getAverageDuration = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.durationSeconds, 0) / records.length;

export const getAverageMistakes = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.mistakeCount, 0) / records.length;

export const getAverageHints = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.hintCount, 0) / records.length;

export const getHighestLevel = (records: PracticeRecord[], fallbackLevel = 1): number =>
  records.filter((record) => record.completed && !record.gaveUp).length === 0
    ? fallbackLevel
    : Math.max(...records.filter((record) => record.completed && !record.gaveUp).map((record) => record.level));

export const getLearningComment = (records: PracticeRecord[]): string => {
  const recent = records.slice(0, 10);
  if (recent.length === 0) return "还没有练习记录，先从适合年级的第一题开始吧。";
  const completionRate = getCompletionRate(recent);
  const avgMistakes = getAverageMistakes(recent);
  const avgHints = getAverageHints(recent);
  if (completionRate >= 0.8 && avgMistakes <= 1.5 && avgHints <= 1) {
    return "表现优秀：完成率高，错误和提示都很少，可以尝试更高等级。";
  }
  if (completionRate >= 0.6 && avgMistakes <= 4 && avgHints <= 3) {
    return "表现稳定：继续保持当前难度，速度和准确率会越来越好。";
  }
  return "最近错误或提示偏多，建议先巩固当前关卡，再挑战下一关。";
};

export interface LearningStats {
  totalPractice: number;
  completed: number;
  gaveUp: number;
  currentLevel: number;
  currentLevelLabel: string;
  highestLevel: number;
  totalStars: number;
  recentCompletionRate: number;
  recentAverageDuration: number;
  recentAverageMistakes: number;
  recentAverageHints: number;
  recentBadges: Badge[];
  recommendedStage: ReturnType<typeof getAdventureStats>["recommendedStage"];
  comment: string;
}

export const createLearningStats = (child: ChildProfile, records: PracticeRecord[]): LearningStats => {
  const recent10 = records.slice(0, 10);
  const adventureStats = getAdventureStats(child);
  return {
    totalPractice: records.length,
    completed: records.filter((record) => record.completed).length,
    gaveUp: records.filter((record) => record.gaveUp).length,
    currentLevel: child.currentLevel,
    currentLevelLabel: getDifficultyLevel(child.currentLevel).label,
    highestLevel: getHighestLevel(records, child.currentLevel),
    totalStars: getTotalPracticeStars(records),
    recentCompletionRate: getCompletionRate(recent10),
    recentAverageDuration: getAverageDuration(recent10),
    recentAverageMistakes: getAverageMistakes(recent10),
    recentAverageHints: getAverageHints(recent10),
    recentBadges: getEarnedBadges(records).slice(0, 3),
    recommendedStage: adventureStats.recommendedStage,
    comment: getLearningComment(recent10)
  };
};
