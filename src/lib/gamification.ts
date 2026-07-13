import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, sizeLabels } from "../constants/gradeLabels";
import { getLevelTitle } from "../constants/levelTitles";
import type { AdaptiveDifficultyResult, PracticeRecord } from "../types";
import { getEarnedBadges, getTotalPracticeStars } from "./reward";

export { getLevelTitle };

export interface PracticeBadge {
  name: string;
  description: string;
}

export interface ResultEncouragementInput {
  completed: boolean;
  mistakes: number;
  hints: number;
  action: AdaptiveDifficultyResult["action"];
}

export const getLevelDisplay = (level: number): string => {
  const config = getDifficultyLevel(level);
  return `L${config.level} ${getLevelTitle(config.level)}｜${sizeLabels[config.size]} ${difficultyLabels[config.difficulty]}`;
};

export const getChallengeTag = (level: number): string => (level >= 10 ? "挑战关卡" : level >= 7 ? "进阶关卡" : "基础关卡");

export const getAdaptiveReason = (currentLevel: number, result: AdaptiveDifficultyResult): string => {
  if (result.action === "up") {
    return `恭喜升级！你从 L${currentLevel} ${getLevelTitle(currentLevel)} 升级为 L${result.nextLevel} ${getLevelTitle(result.nextLevel)}。`;
  }
  if (result.action === "down") {
    return `这一关有点难，系统建议先回到 L${result.nextLevel} ${getLevelTitle(result.nextLevel)} 多练几题，打好基础后再挑战。`;
  }
  return `当前难度很适合你，再稳定练几题就有机会升级。`;
};

export const getResultEncouragement = ({ completed, mistakes, hints, action }: ResultEncouragementInput): string => {
  if (!completed) return "遇到难题没有关系，数独高手也是一步一步练出来的！";
  if (action === "up") return "你已经掌握了这一关的基本方法，可以挑战下一关了！";
  if (mistakes === 0 && hints === 0) return "太棒了，你的观察力越来越强了！";
  if (mistakes <= 1 && hints <= 1) return "这题完成得很稳，继续保持！";
  return "能坚持完成就是进步，下一题我们继续慢慢推理。";
};

export const getPracticeBadgeSummary = (records: PracticeRecord[]): PracticeBadge[] => {
  return getEarnedBadges(records).map((badge) => ({ name: badge.name, description: badge.description }));
};

export const getCompletionStreak = (records: PracticeRecord[]): number => {
  let streak = 0;
  for (const record of records) {
    if (!record.completed || record.gaveUp) break;
    streak += 1;
  }
  return streak;
};

export const getTotalEarnedStars = (records: PracticeRecord[]): number => {
  return getTotalPracticeStars(records);
};
