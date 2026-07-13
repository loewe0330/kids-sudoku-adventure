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

  test("smart currentLevel unlocks the matching big level", () => {
    const map = getAdventureMap(child({ currentLevel: 4 }));
    expect(map.find((stage) => stage.level === 4 && stage.stageIndex === 1)?.unlocked).toBe(true);
  });

  test("progress is read from the provided child only", () => {
    const childAProgress = updateAdventureProgress([], { level: 1, stageIndex: 1, stars: 3, completedAt: "2026-01-01T00:00:00.000Z" });

    expect(getRecommendedAdventureStage(child({ id: "child-a", adventureProgress: childAProgress }))?.stageIndex).toBe(2);
    expect(getRecommendedAdventureStage(child({ id: "child-b", adventureProgress: [] }))?.stageIndex).toBe(1);
  });
});
