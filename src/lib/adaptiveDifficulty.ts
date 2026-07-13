import { clampLevel, getDifficultyLevel } from "../constants/difficultyLevels";
import type { AdaptiveDifficultyResult, PracticeRecord } from "../types";
import { getAdaptiveReason } from "./gamification";
import { formatDuration } from "./time";

const average = (records: PracticeRecord[], selector: (record: PracticeRecord) => number): number =>
  records.length === 0 ? 0 : records.reduce((sum, record) => sum + selector(record), 0) / records.length;

export const evaluateNextLevel = (
  records: PracticeRecord[],
  currentLevel: number,
  smartDifficultyEnabled = true
): AdaptiveDifficultyResult => {
  const safeCurrent = clampLevel(currentLevel);
  if (!smartDifficultyEnabled) {
    return { nextLevel: safeCurrent, action: "keep", reason: "智能难度已关闭，保持当前等级。" };
  }

  const eligibleRecords = records.filter((record) => record.mode === "adventure" || record.source === "smart");
  const recent = [...eligibleRecords].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const latestTwo = recent.slice(0, 2);
  const latestThree = recent.slice(0, 3);
  const config = getDifficultyLevel(safeCurrent);

  const shouldDowngrade =
    (latestTwo.length === 2 && latestTwo.every((record) => record.gaveUp)) ||
    (latestTwo.length === 2 && latestTwo.every((record) => !record.completed)) ||
    (latestThree.length === 3 && average(latestThree, (record) => record.mistakeCount) > config.maxGoodErrors * 2) ||
    (latestThree.length === 3 && average(latestThree, (record) => record.hintCount) > config.maxGoodHints * 2);

  if (shouldDowngrade) {
    const nextLevel = clampLevel(safeCurrent - 1);
    return {
      nextLevel,
      action: nextLevel < safeCurrent ? "down" : "keep",
      reason: nextLevel < safeCurrent ? getAdaptiveReason(safeCurrent, { nextLevel, action: "down", reason: "" }) : "已经是 L1，继续保持入门训练。"
    };
  }

  const shouldUpgrade =
    latestThree.length === 3 &&
    latestThree.every((record) => record.completed && !record.gaveUp) &&
    average(latestThree, (record) => record.mistakeCount) <= config.maxGoodErrors &&
    average(latestThree, (record) => record.hintCount) <= config.maxGoodHints &&
    average(latestThree, (record) => record.durationSeconds) <= config.recommendedTimeSeconds;

  if (shouldUpgrade) {
    const nextLevel = clampLevel(safeCurrent + 1);
    return {
      nextLevel,
      action: nextLevel > safeCurrent ? "up" : "keep",
      reason: nextLevel > safeCurrent ? getAdaptiveReason(safeCurrent, { nextLevel, action: "up", reason: "" }) : "已经达到 L11，继续挑战最高等级。"
    };
  }

  return { nextLevel: safeCurrent, action: "keep", reason: getAdaptiveReason(safeCurrent, { nextLevel: safeCurrent, action: "keep", reason: "" }) };
};

export const getAdaptiveDifficultyRules = (currentLevel: number): {
  currentLevelLabel: string;
  upgradeRules: string[];
  downgradeRules: string[];
  keepRule: string;
} => {
  const safeCurrent = clampLevel(currentLevel);
  const config = getDifficultyLevel(safeCurrent);

  return {
    currentLevelLabel: `当前 L${config.level}`,
    upgradeRules: [
      `连续 3 题完成，且没有放弃。`,
      `平均错误不超过 ${config.maxGoodErrors} 次，平均提示不超过 ${config.maxGoodHints} 次。`,
      `平均用时不超过 ${formatDuration(config.recommendedTimeSeconds)}。`
    ],
    downgradeRules: [
      `最近 2 题放弃或未完成。`,
      `最近 3 题平均错误超过 ${config.maxGoodErrors * 2} 次。`,
      `最近 3 题平均提示超过 ${config.maxGoodHints * 2} 次。`
    ],
    keepRule: "没有触发调整时，会保持当前等级继续练习。"
  };
};
