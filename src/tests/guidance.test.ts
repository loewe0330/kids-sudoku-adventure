import { describe, expect, test } from "vitest";
import {
  applyGuidanceConsumption,
  getAvailableStars,
  getBusinessDate,
  getGuidanceStatus,
  getTotalEarnedStars,
  mergeGuidanceData,
  normalizeGuidanceUsage
} from "../lib/guidance";
import type { ChildProfile, GuidanceConsumptionOperation } from "../types";

const dateA = "2026-07-16";
const dateB = "2026-07-17";
const timestamp = "2026-07-16T08:00:00.000Z";

const child = (id = "child-a", overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id,
  parentId: "parent-a",
  name: id,
  gradeLevel: "grade3",
  createdAt: timestamp,
  updatedAt: timestamp,
  smartDifficultyEnabled: true,
  currentLevel: 1,
  adventureProgress: [
    { parentId: "parent-a", childId: id, level: 1, stageIndex: 1, bestStars: 3, completed: true, unlocked: true, createdAt: timestamp, updatedAt: timestamp },
    { parentId: "parent-a", childId: id, level: 1, stageIndex: 2, bestStars: 3, completed: true, unlocked: true, createdAt: timestamp, updatedAt: timestamp }
  ],
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

const consume = (profile: ChildProfile, index: number, businessDate = dateA) =>
  applyGuidanceConsumption({
    child: profile,
    puzzleId: `puzzle-${index}`,
    operationId: `operation-${index}`,
    businessDate,
    createdAt: `2026-07-16T08:0${index}:00.000Z`
  });

describe("guidance allowance and spend rules", () => {
  test("uses one shared Shanghai business date on both sides of the UTC boundary", () => {
    expect(getBusinessDate(new Date("2026-07-16T15:59:59.000Z"))).toBe("2026-07-16");
    expect(getBusinessDate(new Date("2026-07-16T16:00:00.000Z"))).toBe("2026-07-17");
  });

  test("gives each child three independent free uses per day", () => {
    let childA = child("child-a");
    let childB = child("child-b");
    for (let index = 1; index <= 3; index += 1) childA = consume(childA, index).child;
    childB = consume(childB, 1).child;
    expect(getGuidanceStatus(childA, dateA)).toMatchObject({ remainingFree: 0, spentStars: 0 });
    expect(getGuidanceStatus(childB, dateA)).toMatchObject({ remainingFree: 2, spentStars: 0 });
  });

  test("resets daily counters on a new date without resetting spent stars", () => {
    const previous = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 2 }, spentStars: 2 });
    expect(normalizeGuidanceUsage(previous.guidanceUsage, dateB)).toEqual({ date: dateB, freeUsed: 0, paidUsed: 0 });
    expect(getGuidanceStatus(previous, dateB)).toMatchObject({ remainingFree: 3, spentStars: 2, availableStars: 4 });
  });

  test("derives earned and available stars from best stage stars", () => {
    const profile = child("child-a", { spentStars: 2 });
    expect(getTotalEarnedStars(profile)).toBe(6);
    expect(getAvailableStars(profile)).toBe(4);
    expect(getAvailableStars({ ...profile, spentStars: 99 })).toBe(0);
  });

  test("keeps the first three uses free and charges one star for the fourth", () => {
    let profile = child();
    for (let index = 1; index <= 3; index += 1) {
      const result = consume(profile, index);
      expect(result.guidanceSource).toBe("free");
      profile = result.child;
    }
    const paid = consume(profile, 4);
    expect(paid.guidanceSource).toBe("star");
    expect(paid.child.guidanceUsage).toEqual({ date: dateA, freeUsed: 3, paidUsed: 1 });
    expect(paid.child.spentStars).toBe(1);
    expect(getGuidanceStatus(paid.child, dateA).availableStars).toBe(5);
  });

  test("does not exchange without available stars and caps paid uses at three", () => {
    const noStars = child("child-a", { adventureProgress: [], guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 0 } });
    expect(consume(noStars, 4).status).toBe("no-stars");
    const paidOut = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 3 }, spentStars: 3 });
    expect(consume(paidOut, 4).status).toBe("daily-limit");
  });

  test("deduplicates the same operation and prevents a second operation for one puzzle", () => {
    const first = consume(child(), 1);
    const duplicate = applyGuidanceConsumption({ child: first.child, puzzleId: "puzzle-1", operationId: "operation-1", businessDate: dateA, createdAt: timestamp });
    const secondId = applyGuidanceConsumption({ child: first.child, puzzleId: "puzzle-1", operationId: "other-operation", businessDate: dateA, createdAt: timestamp });
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.child.guidanceUsage?.freeUsed).toBe(1);
    expect(secondId.status).toBe("already-used");
    expect(secondId.child.guidanceOperations).toHaveLength(1);
  });

  test("merges concurrent free and paid operations without counters moving backwards", () => {
    const freeBaseline = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 2, paidUsed: 0 } });
    const freeA = consume(freeBaseline, 1).child;
    const freeB = applyGuidanceConsumption({ child: freeBaseline, puzzleId: "puzzle-b", operationId: "operation-b", businessDate: dateA, createdAt: timestamp }).child;
    expect(mergeGuidanceData(freeA, freeB, dateA).guidanceUsage).toEqual({ date: dateA, freeUsed: 3, paidUsed: 0 });

    const paidBaseline = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 0 }, spentStars: 0 });
    const paidA = consume(paidBaseline, 4).child;
    const paidB = applyGuidanceConsumption({ child: paidBaseline, puzzleId: "puzzle-5", operationId: "operation-5", businessDate: dateA, createdAt: timestamp }).child;
    const paidMerged = mergeGuidanceData(paidA, paidB, dateA);
    expect(paidMerged.guidanceUsage).toEqual({ date: dateA, freeUsed: 3, paidUsed: 2 });
    expect(paidMerged.spentStars).toBe(2);
    expect(paidMerged.guidanceOperations).toHaveLength(2);
  });

  test("uses operation baselines to preserve legacy spent stars during concurrent exchange", () => {
    const legacy = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 0 }, spentStars: 2, guidanceOperations: [] });
    const branchA = consume(legacy, 4).child;
    const branchB = applyGuidanceConsumption({ child: legacy, puzzleId: "puzzle-5", operationId: "operation-5", businessDate: dateA, createdAt: timestamp }).child;
    expect(mergeGuidanceData(branchA, branchB, dateA).spentStars).toBe(4);
  });

  test("keeps old-date operations but prevents old counters from replacing the current date", () => {
    const oldOperation: GuidanceConsumptionOperation = { id: "old-operation", puzzleId: "old-puzzle", source: "free", businessDate: dateA, createdAt: timestamp };
    const current = child("child-a", { guidanceUsage: { date: dateB, freeUsed: 1, paidUsed: 0 } });
    const old = child("child-a", { guidanceUsage: { date: dateA, freeUsed: 3, paidUsed: 2 }, guidanceOperations: [oldOperation], spentStars: 2 });
    const merged = mergeGuidanceData(current, old, dateB);
    expect(merged.guidanceUsage).toEqual({ date: dateB, freeUsed: 1, paidUsed: 0 });
    expect(merged.spentStars).toBe(2);
    expect(merged.guidanceOperations).toEqual([oldOperation]);
  });
});
