import { getDifficultyLevel } from "../constants/difficultyLevels";
import type { PracticeRecord } from "../types";
import { getAppStorage, getPracticeRecordsByChild } from "./storage";

export const getRecentRecords = (parentId: string, childId: string, count: number): PracticeRecord[] =>
  getPracticeRecordsByChild(parentId, childId).slice(0, count);

export const getCompletionRate = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.filter((record) => record.completed).length / records.length;

export const getAverageDuration = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.durationSeconds, 0) / records.length;

export const getAverageMistakes = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.mistakeCount, 0) / records.length;

export const getAverageHints = (records: PracticeRecord[]): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + record.hintCount, 0) / records.length;

const highestOrFallback = (records: PracticeRecord[], fallbackLevel: number): number =>
  records.length === 0 ? fallbackLevel : Math.max(...records.map((record) => record.level));

export const getHighestCompletedLevel = (records: PracticeRecord[], fallbackLevel = 1): number =>
  highestOrFallback(records.filter((record) => record.completed && !record.gaveUp), fallbackLevel);

export const getHighestAdventureLevel = (records: PracticeRecord[], fallbackLevel = 1): number =>
  highestOrFallback(
    records.filter((record) => record.mode === "adventure" && record.completed && !record.gaveUp && record.source !== "custom"),
    fallbackLevel
  );

export const getHighestPracticeLevel = (records: PracticeRecord[], fallbackLevel = 1): number =>
  highestOrFallback(
    records.filter((record) => record.mode === "practice" && record.completed && !record.gaveUp),
    fallbackLevel
  );

export const getHighestLevel = (records: PracticeRecord[]): number => getHighestCompletedLevel(records, 1);

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

export const getChildSummary = (parentId: string, childId: string) => {
  const storage = getAppStorage();
  const child = storage.children.find((item) => item.id === childId && item.parentId === parentId) ?? null;
  const records = getPracticeRecordsByChild(parentId, childId);
  const recent10 = records.slice(0, 10);
  return {
    child,
    totalPractice: records.length,
    completed: records.filter((record) => record.completed).length,
    gaveUp: records.filter((record) => record.gaveUp).length,
    currentLevel: child?.currentLevel ?? 1,
    currentLevelLabel: getDifficultyLevel(child?.currentLevel ?? 1).label,
    highestLevel: getHighestCompletedLevel(records, child?.currentLevel ?? 1),
    recentCompletionRate: getCompletionRate(recent10),
    recentAverageDuration: getAverageDuration(recent10),
    recentAverageMistakes: getAverageMistakes(recent10),
    recentAverageHints: getAverageHints(recent10),
    latestPracticeAt: records[0]?.finishedAt ?? records[0]?.startedAt,
    comment: getLearningComment(recent10)
  };
};

export const getRecordTypeSummary = (records: PracticeRecord[]): {
  adventure: number;
  freePractice: number;
  custom: number;
} => ({
  adventure: records.filter((record) => record.mode === "adventure").length,
  freePractice: records.filter((record) => record.mode === "practice" && record.source !== "custom").length,
  custom: records.filter((record) => record.source === "custom").length
});
