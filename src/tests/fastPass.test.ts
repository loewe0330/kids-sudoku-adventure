import { describe, expect, test } from "vitest";
import { getAdventureMap, getRecommendedAdventureStage } from "../lib/adventure";
import {
  applyFastPassAttempt,
  createFastPassAttempt,
  evaluateFastPassResults,
  generateFastPassChallenge,
  getFastPassNextAction,
  getFastPassRecommendation,
  isFastPassQuestionPassed
} from "../lib/fastPass";
import type { ChildProfile, FastPassQuestionResult, PracticeRecord } from "../types";

const child = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade5",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
  abilityAssessmentStatus: "unassessed",
  adventureProgress: [{
    parentId: "parent-a",
    childId: "child-a",
    level: 1,
    stageIndex: 1,
    bestStars: 2,
    completed: false,
    unlocked: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }],
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

const record = (index: number): PracticeRecord => ({
  id: `record-${index}`,
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: `puzzle-${index}`,
  gradeLevel: "grade5",
  level: 7,
  size: 9,
  difficulty: "starter",
  startedAt: `2026-01-0${index}T08:00:00.000Z`,
  finishedAt: `2026-01-0${index}T08:05:00.000Z`,
  durationSeconds: 300,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  stars: 3,
  mode: "practice",
  source: "smart"
});

const result = (questionIndex: number, overrides: Partial<FastPassQuestionResult> = {}): FastPassQuestionResult => {
  const base = {
    questionIndex,
    level: questionIndex === 1 ? 5 : 6,
    size: 6 as const,
    difficulty: "normal" as const,
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:05:00.000Z",
    errors: 0,
    hintsUsed: 0,
    elapsedSeconds: 300,
    completed: true,
    gaveUp: false,
    viewedAnswer: false
  };
  return { ...base, passed: isFastPassQuestionPassed(base), ...overrides };
};

const attempt = (targetLevel: number, results: FastPassQuestionResult[]) => createFastPassAttempt({
  challenge: { id: `fast-pass-${targetLevel}`, targetLevel, startedAt: "2026-01-01T00:00:00.000Z" },
  results,
  finishedAt: "2026-01-01T01:00:00.000Z"
});

describe("fast pass", () => {
  test("only offers the next valid action after the current question is recorded", () => {
    expect(getFastPassNextAction({ currentQuestionIndex: 0, completedQuestionCount: 0 })).toBeNull();
    expect(getFastPassNextAction({ currentQuestionIndex: 0, completedQuestionCount: 1 })).toEqual({
      action: "next-question",
      label: "继续第 2 题"
    });
    expect(getFastPassNextAction({ currentQuestionIndex: 1, completedQuestionCount: 2 })).toEqual({
      action: "next-question",
      label: "继续第 3 题"
    });
    expect(getFastPassNextAction({ currentQuestionIndex: 2, completedQuestionCount: 3 })).toEqual({
      action: "view-result",
      label: "查看挑战结果"
    });
    expect(getFastPassNextAction({ currentQuestionIndex: 2, completedQuestionCount: 2 })).toBeNull();
  });

  test("recommends a conservative grade target for an unassessed fifth grader", () => {
    expect(getFastPassRecommendation(child(), [])).toMatchObject({ targetLevel: 5, higherTargetLevel: 6, assessmentStatus: "unassessed" });
  });

  test("never recommends a fast-pass target below L2", () => {
    const firstGradeChild = child({ gradeLevel: "grade1", currentLevel: 1, abilityAssessmentStatus: "unassessed" });
    expect(getFastPassRecommendation(firstGradeChild, [])).toMatchObject({ targetLevel: 2, higherTargetLevel: 3 });
  });

  test("recommends the established ability level without unlocking it", () => {
    const profile = child({ currentLevel: 7, abilityAssessmentStatus: "established" });
    expect(getFastPassRecommendation(profile, [1, 2, 3, 4, 5].map(record))).toMatchObject({ targetLevel: 7, higherTargetLevel: 8 });
    expect(getAdventureMap(profile).find((stage) => stage.level === 7 && stage.stageIndex === 1)?.unlocked).toBe(false);
  });

  test("offers exactly one higher target while assessment is provisional", () => {
    const recommendation = getFastPassRecommendation(
      child({ abilityAssessmentStatus: "provisional" }),
      [record(1)]
    );
    expect(recommendation.assessmentStatus).toBe("provisional");
    expect(recommendation.higherTargetLevel).toBe(recommendation.targetLevel + 1);
  });

  test("offers only the suggested level at the L11 boundary", () => {
    const profile = child({ currentLevel: 11, abilityAssessmentStatus: "established" });
    expect(getFastPassRecommendation(profile, [1, 2, 3, 4, 5].map(record))).toMatchObject({ targetLevel: 11 });
    expect(getFastPassRecommendation(profile, [1, 2, 3, 4, 5].map(record)).higherTargetLevel).toBeUndefined();
  });

  test("generates three questions at lower, target, and representative target levels", () => {
    const challenge = generateFastPassChallenge(child(), 6, "2026-01-01T00:00:00.000Z");
    expect(challenge.puzzles).toHaveLength(3);
    expect(challenge.puzzles.map((puzzle) => puzzle.level)).toEqual([5, 6, 6]);
    expect(challenge.puzzles.every((puzzle) => puzzle.mode === "challenge" && puzzle.source === "challenge")).toBe(true);
  });

  test("requires all three questions, at least two passes, and a passing representative question", () => {
    expect(evaluateFastPassResults([result(1)])).toBe(false);
    expect(evaluateFastPassResults([result(1), result(2, { passed: false }), result(3)])).toBe(true);
    expect(evaluateFastPassResults([result(1), result(2), result(3, { passed: false })])).toBe(false);
  });

  test("rejects gave-up and viewed-answer questions", () => {
    const gaveUp = result(1, { completed: false, gaveUp: true, passed: false });
    const viewedAnswer = result(2, { completed: false, viewedAnswer: true, passed: false });
    expect(evaluateFastPassResults([gaveUp, result(2), result(3)])).toBe(false);
    expect(evaluateFastPassResults([result(1), viewedAnswer, result(3)])).toBe(false);
  });

  test("requires a finished timestamp before a question can pass", () => {
    const unfinished = { ...result(1), finishedAt: "" };
    const { passed: _passed, ...rawResult } = unfinished;
    expect(isFastPassQuestionPassed(rawResult)).toBe(false);
  });

  test("passing L6 unlocks only explicit starts and preserves real progress and stars", () => {
    const profile = child();
    const applied = applyFastPassAttempt(profile, attempt(6, [result(1), result(2), result(3)]));
    const updated = { ...profile, ...applied };
    const map = getAdventureMap(updated);

    expect(updated.currentLevel).toBe(1);
    expect(applied.fastPass).toMatchObject({ highestPassedLevel: 6, validatedSkipLevels: [1, 2, 3, 4, 5] });
    expect(applied.adventureProgress.find((stage) => stage.level === 1 && stage.stageIndex === 1)?.bestStars).toBe(2);
    expect(applied.adventureProgress.filter((stage) => stage.completed)).toHaveLength(0);
    expect(applied.adventureProgress.reduce((sum, stage) => sum + stage.bestStars, 0)).toBe(2);
    expect(map.find((stage) => stage.level === 6 && stage.stageIndex === 1)?.unlocked).toBe(true);
    expect(map.find((stage) => stage.level === 6 && stage.stageIndex === 2)?.unlocked).toBe(false);
    expect(map.find((stage) => stage.level === 3 && stage.stageIndex === 1)).toMatchObject({ unlocked: true, fastPassValidated: true });
    expect(getRecommendedAdventureStage(updated)).toMatchObject({ level: 6, stageIndex: 1 });
  });

  test("failed attempts do not modify adventure progress or ability", () => {
    const profile = child({ currentLevel: 7 });
    const failed = attempt(6, [result(1), result(2), result(3, { passed: false })]);
    const applied = applyFastPassAttempt(profile, failed);
    expect(failed.passed).toBe(false);
    expect(applied.adventureProgress).toBe(profile.adventureProgress);
    expect(profile.currentLevel).toBe(7);
    expect(applied.fastPass.highestPassedLevel).toBeUndefined();
  });

  test("repeat and lower passes never duplicate unlocks or lower the highest passed level", () => {
    const first = applyFastPassAttempt(child(), attempt(6, [result(1), result(2), result(3)]));
    const afterFirst = { ...child(), ...first };
    const repeated = applyFastPassAttempt(afterFirst, attempt(6, [result(1), result(2), result(3)]));
    const lower = applyFastPassAttempt({ ...afterFirst, ...repeated }, attempt(4, [result(1), result(2), result(3)]));

    expect(repeated.adventureProgress.filter((stage) => stage.level === 6 && stage.stageIndex === 1)).toHaveLength(1);
    expect(new Set(repeated.fastPass.validatedSkipLevels).size).toBe(repeated.fastPass.validatedSkipLevels?.length);
    expect(lower.fastPass.highestPassedLevel).toBe(6);
  });

  test("passing a lower target never reduces an established ability level", () => {
    const established = child({ currentLevel: 7, abilityAssessmentStatus: "established" });
    const applied = applyFastPassAttempt(established, attempt(4, [result(1), result(2), result(3)]));
    expect(established.currentLevel).toBe(7);
    expect(applied.fastPass.highestPassedLevel).toBe(4);
    expect(getAdventureMap({ ...established, ...applied }).find((stage) => stage.level === 4 && stage.stageIndex === 1)?.unlocked).toBe(true);
  });
});
