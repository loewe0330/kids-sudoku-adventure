import { clampLevel, getColdStartPracticeConfig, getDifficultyLevel } from "../constants/difficultyLevels";
import { getAbilityDisplayModel } from "./ability";
import { createUuid } from "./browserCrypto";
import { getDailyPracticeRecommendation } from "./dailyPracticeRecommendation";
import { generatePuzzleByLevel } from "./sudoku";
import type {
  AdventureStageProgress,
  ChildProfile,
  FastPassAttempt,
  FastPassQuestionResult,
  FastPassState,
  PracticeRecord,
  SudokuPuzzleItem
} from "../types";

export interface FastPassRecommendation {
  targetLevel: number;
  higherTargetLevel?: number;
  reason: string;
  assessmentStatus: "unassessed" | "provisional" | "established";
}

export interface FastPassChallenge {
  id: string;
  targetLevel: number;
  startedAt: string;
  puzzles: SudokuPuzzleItem[];
}

export type FastPassNextAction =
  | { action: "next-question"; label: string }
  | { action: "view-result"; label: "查看挑战结果" };

export const getFastPassNextAction = ({
  currentQuestionIndex,
  completedQuestionCount,
  totalQuestionCount = 3
}: {
  currentQuestionIndex: number;
  completedQuestionCount: number;
  totalQuestionCount?: number;
}): FastPassNextAction | null => {
  const completedCurrentQuestion = completedQuestionCount === currentQuestionIndex + 1;
  if (!completedCurrentQuestion || currentQuestionIndex < 0 || currentQuestionIndex >= totalQuestionCount) return null;
  if (currentQuestionIndex === totalQuestionCount - 1) {
    return { action: "view-result", label: "查看挑战结果" };
  }
  return { action: "next-question", label: `继续第 ${currentQuestionIndex + 2} 题` };
};

export const getFastPassRecommendation = (
  child: ChildProfile,
  practiceRecords: PracticeRecord[]
): FastPassRecommendation => {
  const ability = getAbilityDisplayModel(child, practiceRecords);
  let targetLevel: number;
  let reason: string;

  if (ability.status === "unassessed") {
    targetLevel = getColdStartPracticeConfig(child.gradeLevel).level;
    reason = "还没有正式能力记录，先按年级推荐一个合适的验证起点。";
  } else if (ability.status === "provisional") {
    targetLevel = getDailyPracticeRecommendation({ child, practiceRecords }).level;
    reason = "系统正在了解你的水平，挑战不会高于当前练习建议。";
  } else {
    targetLevel = ability.level ?? child.currentLevel;
    reason = `根据当前正式能力 L${targetLevel}，建议从相近等级验证。`;
  }

  const clampedTarget = Math.max(2, clampLevel(targetLevel));
  return {
    targetLevel: clampedTarget,
    higherTargetLevel: clampedTarget < 11 ? clampedTarget + 1 : undefined,
    reason,
    assessmentStatus: ability.status
  };
};

export const generateFastPassChallenge = (
  child: ChildProfile,
  targetLevel: number,
  now = new Date().toISOString()
): FastPassChallenge => {
  const target = clampLevel(targetLevel);
  const levels = [clampLevel(target - 1), target, target];
  return {
    id: createUuid(),
    targetLevel: target,
    startedAt: now,
    puzzles: levels.map((level, index) => ({
      ...generatePuzzleByLevel(level),
      parentId: child.parentId,
      childId: child.id,
      gradeLevel: child.gradeLevel,
      mode: "challenge" as const,
      source: "challenge" as const,
      stageIndex: index + 1
    }))
  };
};

export const isFastPassQuestionPassed = (result: Omit<FastPassQuestionResult, "passed">): boolean =>
  result.completed
  && Boolean(result.finishedAt)
  && !result.gaveUp
  && !result.viewedAnswer
  && result.errors <= 2
  && result.hintsUsed <= 1;

export const evaluateFastPassResults = (results: FastPassQuestionResult[]): boolean => {
  if (results.length !== 3 || results.some((result) => !result.completed)) return false;
  const passedCount = results.filter((result) => result.passed).length;
  return passedCount >= 2 && results[2]?.passed === true;
};

export const createFastPassAttempt = ({
  challenge,
  results,
  finishedAt = new Date().toISOString()
}: {
  challenge: Pick<FastPassChallenge, "id" | "targetLevel" | "startedAt">;
  results: FastPassQuestionResult[];
  finishedAt?: string;
}): FastPassAttempt => {
  const passed = evaluateFastPassResults(results);
  return {
    id: challenge.id,
    targetLevel: challenge.targetLevel,
    status: passed ? "passed" : "failed",
    startedAt: challenge.startedAt,
    finishedAt,
    results,
    passed
  };
};

const unlockFastPassTarget = (
  progress: AdventureStageProgress[],
  child: Pick<ChildProfile, "parentId" | "id">,
  targetLevel: number,
  timestamp: string
): AdventureStageProgress[] => {
  const existing = progress.find((stage) => stage.level === targetLevel && stage.stageIndex === 1);
  if (existing) {
    return progress.map((stage) => stage === existing ? { ...stage, unlocked: true, updatedAt: timestamp } : stage);
  }
  return [...progress, {
    parentId: child.parentId,
    childId: child.id,
    level: targetLevel,
    stageIndex: 1,
    bestStars: 0,
    completed: false,
    unlocked: true,
    createdAt: timestamp,
    updatedAt: timestamp
  }].sort((a, b) => a.level - b.level || a.stageIndex - b.stageIndex);
};

export const applyFastPassAttempt = (
  child: ChildProfile,
  attempt: FastPassAttempt
): { fastPass: FastPassState; adventureProgress: AdventureStageProgress[] } => {
  const previous = child.fastPass ?? { attempts: [] };
  const attempts = [...previous.attempts, attempt];
  if (!attempt.passed) return { fastPass: { ...previous, attempts, updatedAt: attempt.finishedAt }, adventureProgress: child.adventureProgress };

  const highestPassedLevel = Math.max(previous.highestPassedLevel ?? 0, attempt.targetLevel);
  const validatedSkipLevels = Array.from(new Set([
    ...(previous.validatedSkipLevels ?? []),
    ...Array.from({ length: Math.max(0, attempt.targetLevel - 1) }, (_, index) => index + 1)
  ])).sort((a, b) => a - b);

  return {
    fastPass: { attempts, highestPassedLevel, validatedSkipLevels, updatedAt: attempt.finishedAt },
    adventureProgress: unlockFastPassTarget(child.adventureProgress, child, attempt.targetLevel, attempt.finishedAt)
  };
};

export const getFastPassQuestionSummary = (targetLevel: number): Array<{ level: number; label: string }> => {
  const target = clampLevel(targetLevel);
  return [
    { level: clampLevel(target - 1), label: "基础热身" },
    { level: target, label: "目标基础" },
    { level: target, label: "目标验证" }
  ].map((item) => ({ ...item, label: `${item.label} · ${getDifficultyLevel(item.level).label}` }));
};
