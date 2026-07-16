import { getDifficultyLevel } from "../constants/difficultyLevels";
import { getAbilityDisplayModel } from "./ability";
import { getPracticeRecordsByChild } from "./storage";
import { getLevelTitle } from "../constants/levelTitles";
import type { AdventureStage, AdventureStageProgress, ChildProfile, FastPassState } from "../types";

const stagesPerLevel = 5;

export const adventureLevelNames: Record<number, string> = {
  1: "数字小苗村",
  2: "观察森林",
  3: "宫格山谷",
  4: "排除法小路",
  5: "侦探小镇",
  6: "逻辑城堡",
  7: "九宫格峡谷",
  8: "推理学院",
  9: "高手之塔",
  10: "挑战迷宫",
  11: "终极数独王国"
};

const progressKey = (level: number, stageIndex: number): string => `${level}-${stageIndex}`;

const progressMap = (progress: AdventureStageProgress[]): Map<string, AdventureStageProgress> =>
  new Map(progress.map((item) => [progressKey(item.level, item.stageIndex), item]));

export const getAdventureStageTitle = (level: number, stageIndex: number): string =>
  `L${level}-${stageIndex} ${adventureLevelNames[level] ?? `L${level}`}`;

const completedCountForLevel = (progress: AdventureStageProgress[], level: number): number =>
  progress.filter((item) => item.level === level && item.completed).length;

const isStageUnlocked = (
  level: number,
  stageIndex: number,
  progress: AdventureStageProgress[],
  byKey: Map<string, AdventureStageProgress>,
  fastPass?: FastPassState
): boolean => {
  if (level === 1 && stageIndex === 1) return true;
  const fastPassLevels = fastPass?.validatedSkipLevels ?? [];
  if (stageIndex === 1 && (fastPassLevels.includes(level) || fastPass?.highestPassedLevel === level)) return true;
  if (stageIndex > 1) return Boolean(byKey.get(progressKey(level, stageIndex - 1))?.completed);
  return completedCountForLevel(progress, level - 1) >= 3;
};

export const getAdventureMap = (child: ChildProfile): AdventureStage[] => {
  const progress = child.adventureProgress ?? [];
  const byKey = progressMap(progress);
  const stages: AdventureStage[] = [];

  for (let level = 1; level <= 11; level += 1) {
    for (let stageIndex = 1; stageIndex <= stagesPerLevel; stageIndex += 1) {
      const item = byKey.get(progressKey(level, stageIndex));
      stages.push({
        level,
        stageIndex,
        title: getAdventureStageTitle(level, stageIndex),
        levelName: adventureLevelNames[level] ?? `L${level}`,
        levelTitle: getLevelTitle(level),
        requiredStarsToUnlock: level === 1 && stageIndex === 1 ? 0 : 1,
        bestStars: item?.bestStars ?? 0,
        completed: item?.completed ?? false,
        unlocked: item?.unlocked || isStageUnlocked(level, stageIndex, progress, byKey, child.fastPass),
        recommended: false,
        fastPassValidated: child.fastPass?.validatedSkipLevels?.includes(level) ?? false
      });
    }
  }

  const defaultRecommended = stages.find((stage) => stage.unlocked && !stage.completed) ?? stages.find((stage) => stage.unlocked);
  const progressFrontier = Math.max(1, ...progress.filter((stage) => stage.completed || stage.unlocked).map((stage) => stage.level));
  const fastPassFrontier = child.fastPass?.highestPassedLevel ?? 0;
  const frontier = Math.max(progressFrontier, fastPassFrontier);
  const recommended = fastPassFrontier > 0
    ? stages.find((stage) => stage.level === frontier && stage.unlocked && !stage.completed) ?? defaultRecommended
    : defaultRecommended;
  return stages.map((stage) => ({
    ...stage,
    recommended: Boolean(recommended && stage.level === recommended.level && stage.stageIndex === recommended.stageIndex)
  }));
};

export const getRecommendedAdventureStage = (child: ChildProfile): AdventureStage | undefined =>
  getAdventureMap(child).find((stage) => stage.recommended);

export const getAdventureDisplayContext = (child: ChildProfile) => {
  const ability = getAbilityDisplayModel(child, getPracticeRecordsByChild(child.parentId, child.id));
  const recommendedStage = getRecommendedAdventureStage(child);
  const progressLabel = recommendedStage
    ? `L${recommendedStage.level}-${recommendedStage.stageIndex} ${recommendedStage.levelName}`
    : "暂无推荐关卡";
  const gapMessage = ability.status === "established" && recommendedStage && child.currentLevel > recommendedStage.level
    ? `能力已到 L${child.currentLevel}，闯关地图可从 L${recommendedStage.level}-${recommendedStage.stageIndex} 开始补星。`
    : "能力等级和闯关进度会分别记录，完成小关即可继续点亮地图。";

  return {
    ability,
    abilityLabel: ability.title,
    recommendedStage,
    progressLabel,
    gapMessage
  };
};

export const updateAdventureProgress = (
  progress: AdventureStageProgress[],
  input: { level: number; stageIndex: number; stars: number; completedAt: string; parentId?: string; childId?: string }
): AdventureStageProgress[] => {
  const byKey = progressMap(progress);
  const key = progressKey(input.level, input.stageIndex);
  const existing = byKey.get(key);
  byKey.set(key, {
    parentId: input.parentId ?? existing?.parentId ?? "",
    childId: input.childId ?? existing?.childId ?? "",
    level: input.level,
    stageIndex: input.stageIndex,
    bestStars: Math.max(existing?.bestStars ?? 0, input.stars),
    completed: true,
    unlocked: true,
    createdAt: existing?.createdAt ?? input.completedAt,
    updatedAt: input.completedAt
  });

  const nextStageIndex = input.stageIndex + 1;
  if (nextStageIndex <= stagesPerLevel && !byKey.has(progressKey(input.level, nextStageIndex))) {
    byKey.set(progressKey(input.level, nextStageIndex), {
      parentId: input.parentId ?? "",
      childId: input.childId ?? "",
      level: input.level,
      stageIndex: nextStageIndex,
      bestStars: 0,
      completed: false,
      unlocked: true,
      createdAt: input.completedAt,
      updatedAt: input.completedAt
    });
  }

  if (completedCountForLevel(Array.from(byKey.values()), input.level) >= 3 && input.level < 11 && !byKey.has(progressKey(input.level + 1, 1))) {
    byKey.set(progressKey(input.level + 1, 1), {
      parentId: input.parentId ?? "",
      childId: input.childId ?? "",
      level: input.level + 1,
      stageIndex: 1,
      bestStars: 0,
      completed: false,
      unlocked: true,
      createdAt: input.completedAt,
      updatedAt: input.completedAt
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.level - b.level || a.stageIndex - b.stageIndex);
};

export const getAdventureStats = (child: ChildProfile) => {
  const map = getAdventureMap(child);
  const completedStages = map.filter((stage) => stage.completed);
  const threeStarStages = completedStages.filter((stage) => stage.bestStars >= 3);
  const highestLevel = completedStages.length === 0 ? 1 : Math.max(...completedStages.map((stage) => stage.level));
  const totalStars = map.reduce((sum, stage) => sum + stage.bestStars, 0);
  const recommendedStage = getRecommendedAdventureStage(child);

  return {
    totalStars,
    highestLevel,
    completedStageCount: completedStages.length,
    threeStarStageCount: threeStarStages.length,
    recommendedStage,
    currentTitle: getAbilityDisplayModel(child, getPracticeRecordsByChild(child.parentId, child.id)).title
  };
};
