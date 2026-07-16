import { describe, expect, test } from "vitest";
import { getDailyPracticeRecommendation } from "../lib/dailyPracticeRecommendation";
import type { ChildProfile, PracticeRecord } from "../types";

const child = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade5",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 5,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "practice",
    successAnimationEnabled: true,
    reducedMotion: false
  },
  ...overrides
});

const record = (index: number, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: `record-${index}`,
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: `puzzle-${index}`,
  gradeLevel: "grade5",
  level: 5,
  size: 6,
  difficulty: "easy",
  startedAt: `2026-01-0${index}T08:00:00.000Z`,
  finishedAt: `2026-01-0${index}T08:06:00.000Z`,
  durationSeconds: 360,
  mistakeCount: 1,
  hintCount: 1,
  completed: true,
  gaveUp: false,
  stars: 2,
  mode: "practice",
  source: "smart",
  ...overrides
});

describe("daily practice recommendation", () => {
  test.each([
    ["grade1", 4, "starter"],
    ["grade5", 6, "easy"],
    ["grade6", 6, "normal"]
  ] as const)("uses grade cold start for unassessed %s children", (gradeLevel, size, difficulty) => {
    const recommendation = getDailyPracticeRecommendation({ child: child({ gradeLevel, currentLevel: 1 }), practiceRecords: [] });
    expect(recommendation).toMatchObject({ size, difficulty, source: "grade-cold-start", title: "今日起步推荐" });
    expect(child({ gradeLevel, currentLevel: 1 }).currentLevel).toBe(1);
  });

  test("keeps provisional recommendations within one difficulty step and never crosses size from one strong record", () => {
    const recommendation = getDailyPracticeRecommendation({
      child: child(),
      practiceRecords: [record(1, { stars: 3, mistakeCount: 0, hintCount: 0, durationSeconds: 120 })]
    });
    expect(recommendation).toMatchObject({ size: 6, difficulty: "easy", source: "provisional-assessment", adjustment: "same" });
  });

  test("makes a conservative provisional adjustment after several consistently strong records", () => {
    const recommendation = getDailyPracticeRecommendation({
      child: child(),
      practiceRecords: [1, 2, 3].map((index) => record(index, { stars: 3, mistakeCount: 0, hintCount: 0, durationSeconds: 180 }))
    });
    expect(recommendation).toMatchObject({ size: 6, difficulty: "normal", adjustment: "harder" });
  });

  test("keeps established stable performance at the formal ability configuration", () => {
    const recommendation = getDailyPracticeRecommendation({ child: child(), practiceRecords: [1, 2, 3, 4, 5].map((index) => record(index)) });
    expect(recommendation).toMatchObject({ size: 6, difficulty: "easy", source: "ability-level", adjustment: "same" });
  });

  test("raises and lowers established recommendations by one same-size difficulty step", () => {
    const mastering = getDailyPracticeRecommendation({
      child: child(),
      practiceRecords: [1, 2, 3, 4, 5].map((index) => record(index, { stars: 3, mistakeCount: 0, hintCount: 0, durationSeconds: 180 }))
    });
    const struggling = getDailyPracticeRecommendation({
      child: child({ currentLevel: 6 }),
      practiceRecords: [1, 2, 3, 4, 5].map((index) => record(index, { level: 6, difficulty: "normal", stars: 1, mistakeCount: 8, hintCount: 6, durationSeconds: 1400 }))
    });
    expect(mastering).toMatchObject({ size: 6, difficulty: "normal", adjustment: "harder" });
    expect(struggling).toMatchObject({ size: 6, difficulty: "easy", adjustment: "easier" });
  });

  test("ignores incomplete, gave-up, and answerless records and never reads adventure progress", () => {
    const recommendation = getDailyPracticeRecommendation({
      child: child({ currentLevel: 7, adventureProgress: [{ parentId: "parent-a", childId: "child-a", level: 7, stageIndex: 1, bestStars: 3, completed: true, unlocked: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] }),
      practiceRecords: [
        record(1, { completed: false }),
        record(2, { gaveUp: true }),
        record(3, { finishedAt: undefined })
      ]
    });
    expect(recommendation).toMatchObject({ size: 6, difficulty: "easy", source: "grade-cold-start" });
  });

  test("uses the established ability even when adventure progress is still at L1-1", () => {
    const profile = child({
      currentLevel: 7,
      abilityAssessmentStatus: "established",
      adventureProgress: [{ parentId: "parent-a", childId: "child-a", level: 1, stageIndex: 1, bestStars: 0, completed: false, unlocked: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]
    });
    const recommendation = getDailyPracticeRecommendation({ child: profile, practiceRecords: [1, 2, 3, 4, 5].map((index) => record(index, { level: 7, size: 9, difficulty: "starter" })) });

    expect(recommendation).toMatchObject({ size: 9, difficulty: "starter", source: "ability-level" });
    expect(profile.currentLevel).toBe(7);
    expect(profile.adventureProgress[0]).toMatchObject({ level: 1, stageIndex: 1 });
  });
});
