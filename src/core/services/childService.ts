import { gradeDefaultLevels } from "../constants/difficultyLevels";
import type { ChildProfile, ChildProfileInput } from "../types";

export const createChildProfileDraft = (
  parentId: string,
  input: ChildProfileInput,
  now: string,
  id = ""
): ChildProfile => ({
  id,
  parentId,
  name: input.name.trim(),
  gradeLevel: input.gradeLevel,
  avatar: input.avatar,
  createdAt: now,
  updatedAt: now,
  smartDifficultyEnabled: input.smartDifficultyEnabled,
  currentLevel: gradeDefaultLevels[input.gradeLevel],
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
});
