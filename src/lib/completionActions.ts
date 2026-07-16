import { adventureLevelNames, getAdventureMap } from "./adventure";
import type { AdventureStageProgress, ChildProfile, PracticeMode } from "../types";

export type CompletionContext = "free-practice" | "adventure-stage" | "fast-pass-question";

export type CompletionAction =
  | { type: "new-practice" }
  | { type: "back-to-practice" }
  | { type: "fast-pass-next" }
  | { type: "next-adventure-stage"; level: number; stageIndex: number }
  | { type: "open-adventure-level"; level: number }
  | { type: "open-adventure-map" }
  | { type: "open-growth" }
  | { type: "close-result" };

export interface CompletionActionItem {
  label: string;
  action: CompletionAction;
}

export interface CompletionActionModel {
  context: CompletionContext;
  title: string;
  summary: string[];
  hint?: string;
  primaryAction: CompletionActionItem;
  secondaryAction: CompletionActionItem;
}

export type AdventureFailureAction =
  | { type: "retry-stage"; level: number; stageIndex: number }
  | { type: "return-level"; level: number }
  | { type: "view-method" };

export interface AdventureFailureActionModel {
  title: string;
  message: string[];
  primaryAction: { label: string; action: AdventureFailureAction };
  secondaryAction: { label: string; action: AdventureFailureAction };
  tertiaryAction: { label: string; action: AdventureFailureAction };
}

export const getAdventureFailureActionModel = ({
  level,
  stageIndex
}: {
  level: number;
  stageIndex: number;
  previousStars?: number;
  guidanceUsed?: boolean;
  submitAttemptCount: number;
}): AdventureFailureActionModel => ({
  title: "本关暂未通过",
  message: ["这次还差一点，", "可以重新挑战，或者先回到关卡地图。"],
  primaryAction: {
    label: `重新挑战 L${level}-${stageIndex}`,
    action: { type: "retry-stage", level, stageIndex }
  },
  secondaryAction: {
    label: `返回 L${level} 关卡`,
    action: { type: "return-level", level }
  },
  tertiaryAction: { label: "查看解题方法", action: { type: "view-method" } }
});

interface FastPassCompletionInput {
  title: string;
  progress: string;
  message: string;
  nextLabel: string;
}

interface CompletionActionInput {
  child: ChildProfile;
  mode: PracticeMode;
  level: number;
  stageIndex?: number;
  stars: number;
  updatedProgress: AdventureStageProgress[];
  fastPass?: FastPassCompletionInput;
}

export const getCompletionActionModel = ({
  child,
  mode,
  level,
  stageIndex,
  stars,
  updatedProgress,
  fastPass
}: CompletionActionInput): CompletionActionModel => {
  if (fastPass) {
    return {
      context: "fast-pass-question",
      title: fastPass.title,
      summary: ["本题已记录", fastPass.progress, fastPass.message],
      primaryAction: { label: fastPass.nextLabel, action: { type: "fast-pass-next" } },
      secondaryAction: { label: "返回探险地图", action: { type: "open-adventure-map" } }
    };
  }

  if (mode !== "adventure" || !stageIndex) {
    return {
      context: "free-practice",
      title: "太棒了！",
      summary: ["全部答对啦，继续保持！"],
      primaryAction: { label: "再来一题", action: { type: "new-practice" } },
      secondaryAction: { label: "回到练习", action: { type: "back-to-practice" } }
    };
  }

  const updatedChild = { ...child, adventureProgress: updatedProgress };
  const map = getAdventureMap(updatedChild);
  const stageLabel = `L${level}-${stageIndex}`;

  if (level === 11 && stageIndex === 5) {
    return {
      context: "adventure-stage",
      title: "全部探险完成！",
      summary: ["你已经完成所有数独关卡。"],
      primaryAction: { label: "查看探险地图", action: { type: "open-adventure-map" } },
      secondaryAction: { label: "查看成长记录", action: { type: "open-growth" } }
    };
  }

  if (stageIndex === 5) {
    const earnedStars = updatedProgress
      .filter((stage) => stage.level === level)
      .reduce((total, stage) => total + stage.bestStars, 0);
    const nextLevelStage = map.find((stage) => stage.level === level + 1 && stage.stageIndex === 1);
    const levelName = adventureLevelNames[level] ?? `L${level}`;
    return {
      context: "adventure-stage",
      title: `L${level} 挑战完成！`,
      summary: [`${levelName}已经通关`, `本关累计 ${earnedStars} / 15 ★`],
      hint: nextLevelStage?.unlocked ? `已解锁 L${level + 1}-1` : undefined,
      primaryAction: nextLevelStage?.unlocked
        ? { label: `前往 L${level + 1}`, action: { type: "open-adventure-level", level: level + 1 } }
        : { label: `查看 L${level} 成绩`, action: { type: "open-adventure-level", level } },
      secondaryAction: { label: "返回探险地图", action: { type: "open-adventure-map" } }
    };
  }

  const nextStage = map.find((stage) => stage.level === level && stage.stageIndex === stageIndex + 1);
  return {
    context: "adventure-stage",
    title: nextStage?.unlocked ? "挑战成功！" : "挑战完成",
    summary: [`完成 ${stageLabel}`, `获得 ${stars} ★`],
    hint: nextStage?.unlocked ? `已解锁下一关：L${level}-${stageIndex + 1}` : undefined,
    primaryAction: nextStage?.unlocked
      ? {
          label: `继续挑战 L${level}-${stageIndex + 1}`,
          action: { type: "next-adventure-stage", level, stageIndex: stageIndex + 1 }
        }
      : { label: "查看本关结果", action: { type: "close-result" } },
    secondaryAction: { label: `返回 L${level} 关卡`, action: { type: "open-adventure-level", level } }
  };
};
