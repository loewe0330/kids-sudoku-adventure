import { describe, expect, test } from "vitest";
import {
  getAdventureMap,
  getRecommendedAdventureStage,
  updateAdventureProgress
} from "../lib/adventure";
import type { AdventureStageProgress, ChildProfile } from "../types";

const child = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  avatar: "sun",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  },
  ...overrides
});

describe("adventure map", () => {
  test("unlocks L1-1 by default and keeps L1-2 locked before completion", () => {
    const map = getAdventureMap(child());
    expect(map.find((stage) => stage.level === 1 && stage.stageIndex === 1)?.unlocked).toBe(true);
    expect(map.find((stage) => stage.level === 1 && stage.stageIndex === 2)?.unlocked).toBe(false);
  });

  test("records bestStars and never overwrites it with a lower replay score", () => {
    let progress: AdventureStageProgress[] = [];
    progress = updateAdventureProgress(progress, { parentId: "parent-a", childId: "child-a", level: 1, stageIndex: 1, stars: 2, completedAt: "2026-01-01T00:00:00.000Z" });
    progress = updateAdventureProgress(progress, { level: 1, stageIndex: 1, stars: 1, completedAt: "2026-01-02T00:00:00.000Z" });
    expect(progress.find((stage) => stage.level === 1 && stage.stageIndex === 1)).toMatchObject({
      parentId: "parent-a",
      childId: "child-a",
      bestStars: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z"
    });

    progress = updateAdventureProgress(progress, { level: 1, stageIndex: 1, stars: 3, completedAt: "2026-01-03T00:00:00.000Z" });
    expect(progress.find((stage) => stage.level === 1 && stage.stageIndex === 1)?.bestStars).toBe(3);
  });

  test("unlocks the next stage and next level after enough completed stages", () => {
    const progress = [1, 2, 3].reduce<AdventureStageProgress[]>(
      (current, stageIndex) =>
        updateAdventureProgress(current, { level: 1, stageIndex, stars: 2, completedAt: `2026-01-0${stageIndex}T00:00:00.000Z` }),
      []
    );
    const map = getAdventureMap(child({ adventureProgress: progress }));

    expect(map.find((stage) => stage.level === 1 && stage.stageIndex === 4)?.unlocked).toBe(true);
    expect(map.find((stage) => stage.level === 2 && stage.stageIndex === 1)?.unlocked).toBe(true);
  });

  test("keeps L7 and L11 locked when only the ability level is higher", () => {
    const levelSevenMap = getAdventureMap(child({ currentLevel: 7, abilityAssessmentStatus: "established" }));
    const levelElevenMap = getAdventureMap(child({ currentLevel: 11, abilityAssessmentStatus: "established" }));

    expect(levelSevenMap.find((stage) => stage.level === 1 && stage.stageIndex === 1)?.unlocked).toBe(true);
    expect(levelSevenMap.find((stage) => stage.level === 7 && stage.stageIndex === 1)?.unlocked).toBe(false);
    expect(levelElevenMap.find((stage) => stage.level === 11 && stage.stageIndex === 1)?.unlocked).toBe(false);
    expect(getRecommendedAdventureStage(child({ currentLevel: 7, abilityAssessmentStatus: "established" }))?.title).toContain("L1-1");
  });

  test("preserves explicitly saved unlocked stages from existing adventure progress", () => {
    const progress: AdventureStageProgress[] = [{
      parentId: "parent-a",
      childId: "child-a",
      level: 3,
      stageIndex: 1,
      bestStars: 2,
      completed: false,
      unlocked: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }];
    const map = getAdventureMap(child({ currentLevel: 1, adventureProgress: progress }));

    expect(map.find((stage) => stage.level === 3 && stage.stageIndex === 1)).toMatchObject({ unlocked: true, bestStars: 2 });
    expect(map.find((stage) => stage.level === 3 && stage.stageIndex === 2)?.unlocked).toBe(false);
  });

  test("progress is read from the provided child only", () => {
    const childAProgress = updateAdventureProgress([], { level: 1, stageIndex: 1, stars: 3, completedAt: "2026-01-01T00:00:00.000Z" });

    expect(getRecommendedAdventureStage(child({ id: "child-a", adventureProgress: childAProgress }))?.stageIndex).toBe(2);
    expect(getRecommendedAdventureStage(child({ id: "child-b", adventureProgress: [] }))?.stageIndex).toBe(1);
  });
});
