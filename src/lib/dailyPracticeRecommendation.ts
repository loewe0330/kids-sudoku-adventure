import { getColdStartPracticeConfig, getDifficultyLevel } from "../constants/difficultyLevels";
import { getAllowedCustomDifficulties } from "./practiceRules";
import { getAbilityDisplayModel, getValidAbilityAssessmentRecords } from "./ability";
import type { ChildProfile, PracticeRecord, SudokuDifficulty, SudokuSize } from "../types";

export type DailyPracticeRecommendationSource =
  | "grade-cold-start"
  | "provisional-assessment"
  | "ability-level"
  | "recent-performance-adjustment";

export type DailyPracticePerformance = "struggling" | "stable" | "mastering";

export interface DailyPracticeRecommendation {
  level: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  source: DailyPracticeRecommendationSource;
  title: string;
  reason: string;
  badge: string;
  confidence: "low" | "medium" | "high";
  performance?: DailyPracticePerformance;
  adjustment?: "easier" | "same" | "harder";
}

const average = (records: PracticeRecord[], select: (record: PracticeRecord) => number): number =>
  records.reduce((sum, record) => sum + select(record), 0) / records.length;

const getRecentValidRecords = (records: PracticeRecord[], limit: number): PracticeRecord[] =>
  [...getValidAbilityAssessmentRecords(records)]
    .sort((a, b) => (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt))
    .slice(0, limit);

export const getDailyPracticePerformance = (
  records: PracticeRecord[],
  level: number
): DailyPracticePerformance => {
  if (records.length < 2) return "stable";

  const config = getDifficultyLevel(level);
  const averageMistakes = average(records, (record) => record.mistakeCount);
  const averageHints = average(records, (record) => record.hintCount);
  const averageDuration = average(records, (record) => record.durationSeconds);
  const averageStars = average(records, (record) => record.stars);

  const struggleSignals = [
    averageMistakes > config.maxGoodErrors * 2,
    averageHints > config.maxGoodHints * 2,
    averageDuration > config.recommendedTimeSeconds * 1.5,
    averageStars < 1.5
  ].filter(Boolean).length;
  if (struggleSignals >= 2) return "struggling";

  const consistentlyStrong = records.length >= 3
    && records.every((record) => record.stars >= 3)
    && averageMistakes <= config.maxGoodErrors
    && averageHints <= config.maxGoodHints
    && averageDuration <= config.recommendedTimeSeconds * 0.85;
  return consistentlyStrong ? "mastering" : "stable";
};

const adjustDifficulty = (
  size: SudokuSize,
  difficulty: SudokuDifficulty,
  direction: "easier" | "harder"
): SudokuDifficulty => {
  const options = getAllowedCustomDifficulties(size);
  const index = options.indexOf(difficulty);
  const nextIndex = direction === "easier" ? index - 1 : index + 1;
  return options[nextIndex] ?? difficulty;
};

export const getDailyPracticeRecommendation = ({
  child,
  practiceRecords
}: {
  child: ChildProfile;
  practiceRecords: PracticeRecord[];
}): DailyPracticeRecommendation => {
  const ability = getAbilityDisplayModel(child, practiceRecords);
  const validRecords = getValidAbilityAssessmentRecords(practiceRecords);

  if (ability.status === "unassessed") {
    const config = getColdStartPracticeConfig(child.gradeLevel);
    return {
      ...config,
      source: "grade-cold-start",
      title: "今日起步推荐",
      reason: "根据年级先安排一组起步练习，完成几道后系统会逐渐了解你的水平。",
      badge: "年级起步",
      confidence: "low",
      adjustment: "same"
    };
  }

  const base = ability.status === "provisional"
    ? getColdStartPracticeConfig(child.gradeLevel)
    : ability.recommendedConfig;
  const recentRecords = getRecentValidRecords(validRecords, ability.status === "provisional" ? 4 : 5);
  const performance = getDailyPracticePerformance(recentRecords, base.level);
  const adjustedDifficulty = performance === "stable"
    ? base.difficulty
    : adjustDifficulty(base.size, base.difficulty, performance === "mastering" ? "harder" : "easier");
  const adjustment = adjustedDifficulty === base.difficulty
    ? "same"
    : performance === "mastering" ? "harder" : "easier";

  if (ability.status === "provisional") {
    return {
      level: base.level,
      size: base.size,
      difficulty: adjustedDifficulty,
      source: "provisional-assessment",
      title: "今日推荐",
      reason: "系统正在了解你的水平，今天继续用相近难度观察表现。",
      badge: "观察中",
      confidence: recentRecords.length >= 3 ? "medium" : "low",
      performance,
      adjustment
    };
  }

  if (adjustment === "harder") {
    return {
      level: base.level,
      size: base.size,
      difficulty: adjustedDifficulty,
      source: "recent-performance-adjustment",
      title: "今日挑战",
      reason: "最近几次完成得很轻松，今天可以尝试提高一级难度。",
      badge: "轻松挑战",
      confidence: "high",
      performance,
      adjustment
    };
  }

  if (adjustment === "easier") {
    return {
      level: base.level,
      size: base.size,
      difficulty: adjustedDifficulty,
      source: "recent-performance-adjustment",
      title: "今日巩固",
      reason: "今天先降低一级难度，把当前方法练得更扎实。",
      badge: "稳稳练习",
      confidence: "high",
      performance,
      adjustment
    };
  }

  return {
    level: base.level,
    size: base.size,
    difficulty: base.difficulty,
    source: "ability-level",
    title: "今日推荐",
    reason: "最近表现稳定，继续巩固当前难度。",
    badge: "当前能力",
    confidence: "high",
    performance,
    adjustment: "same"
  };
};
