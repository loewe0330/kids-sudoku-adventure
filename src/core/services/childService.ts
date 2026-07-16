import type { ChildProfile, ChildProfileInput } from "../types";

export const createChildProfileDraft = (
  parentId: string,
  input: ChildProfileInput,
  now: string,
  id = ""
): ChildProfile => {
  return {
    id,
    parentId,
    name: input.name.trim(),
    gradeLevel: input.gradeLevel,
    avatar: input.avatar,
    createdAt: now,
    updatedAt: now,
    smartDifficultyEnabled: input.smartDifficultyEnabled ?? true,
    currentLevel: 1,
    abilityAssessmentStatus: "unassessed",
    adventureProgress: [{
      parentId,
      childId: id,
      level: 1,
      stageIndex: 1,
      bestStars: 0,
      completed: false,
      unlocked: true,
      createdAt: now,
      updatedAt: now
    }],
    settings: {
      soundEnabled: false,
      immediateErrorFeedback: true,
      showTimer: true,
      practiceMode: "adventure",
      successAnimationEnabled: true,
      reducedMotion: false
    }
  };
};
