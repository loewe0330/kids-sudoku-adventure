import { describe, expect, test } from "vitest";
import { getRecommendedAdventureStage } from "../lib/adventure";
import { mergeAppStorage } from "../lib/storageMerge";
import { scopeIncomingStorageForParent } from "../../netlify/functions/cloudStorageMerge";
import type { AppStorage, ChildProfile, FastPassAttempt, ParentAccount, PracticeRecord } from "../types";

const timestamp = (day: number) => `2026-07-${String(day).padStart(2, "0")}T08:00:00.000Z`;

const parent = (id = "parent-a"): ParentAccount => ({
  id,
  username: id,
  displayName: id,
  passwordHash: "hash",
  status: "enabled",
  createdAt: timestamp(1),
  updatedAt: timestamp(1)
});

const child = (overrides: Partial<ChildProfile> = {}): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  createdAt: timestamp(1),
  updatedAt: timestamp(1),
  smartDifficultyEnabled: true,
  currentLevel: 1,
  abilityAssessmentStatus: "unassessed",
  adventureProgress: [{
    parentId: "parent-a",
    childId: "child-a",
    level: 1,
    stageIndex: 1,
    bestStars: 0,
    completed: false,
    unlocked: true,
    createdAt: timestamp(1),
    updatedAt: timestamp(1)
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

const record = (id: string, day: number, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id,
  parentId: "parent-a",
  childId: "child-a",
  puzzleId: `puzzle-${id}`,
  gradeLevel: "grade3",
  level: 1,
  size: 4,
  difficulty: "starter",
  startedAt: timestamp(day),
  finishedAt: timestamp(day),
  createdAt: timestamp(day),
  updatedAt: timestamp(day),
  durationSeconds: 60,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  stars: 3,
  mode: "practice",
  source: "smart",
  ...overrides
});

const storage = (overrides: Partial<AppStorage> = {}): AppStorage => ({
  adminAccount: {
    username: "admin",
    passwordHash: "admin-hash",
    createdAt: timestamp(1),
    updatedAt: timestamp(1)
  },
  parentAccounts: [parent()],
  activeSession: null,
  activeChildId: null,
  children: [child()],
  practiceRecords: [],
  puzzleBank: [],
  schemaVersion: 3,
  revision: 0,
  syncTombstones: [],
  ...overrides
});

const fastPassAttempt = (id: string, targetLevel: number, day: number): FastPassAttempt => ({
  id,
  targetLevel,
  status: "passed",
  startedAt: timestamp(day),
  finishedAt: timestamp(day),
  createdAt: timestamp(day),
  updatedAt: timestamp(day),
  results: [],
  passed: true
});

describe("cross-device storage merge", () => {
  test("keeps distinct practice records created by two devices and deduplicates matching ids", () => {
    const deviceA = storage({ practiceRecords: [record("record-a", 2), record("shared", 2, { stars: 1 })] });
    const deviceB = storage({ practiceRecords: [record("record-b", 3), record("shared", 4, { stars: 3 })] });

    const merged = mergeAppStorage(deviceA, deviceB);

    expect(merged.practiceRecords.map((item) => item.id).sort()).toEqual(["record-a", "record-b", "shared"]);
    expect(merged.practiceRecords.find((item) => item.id === "shared")?.stars).toBe(3);
  });

  test("preserves highest stars, completed and unlocked progress without moving the current stage backwards", () => {
    const stale = child({
      updatedAt: timestamp(2),
      adventureProgress: [
        { ...child().adventureProgress[0], bestStars: 1, completed: true, updatedAt: timestamp(2) }
      ]
    });
    const progressed = child({
      updatedAt: timestamp(3),
      adventureProgress: [
        { ...child().adventureProgress[0], bestStars: 3, completed: true, updatedAt: timestamp(3) },
        { ...child().adventureProgress[0], stageIndex: 2, bestStars: 0, completed: false, unlocked: true, updatedAt: timestamp(3) }
      ]
    });

    const merged = mergeAppStorage(storage({ children: [progressed] }), storage({ children: [stale] }));

    expect(merged.children[0].adventureProgress[0]).toMatchObject({ bestStars: 3, completed: true, unlocked: true });
    expect(getRecommendedAdventureStage(merged.children[0])).toMatchObject({ level: 1, stageIndex: 2 });
  });

  test("keeps the union when two devices complete different adventure stages", () => {
    const stage = child().adventureProgress[0];
    const deviceA = child({
      updatedAt: timestamp(3),
      adventureProgress: [
        { ...stage, stageIndex: 1, completed: true, bestStars: 2, updatedAt: timestamp(3) },
        { ...stage, stageIndex: 2, completed: false, bestStars: 0, updatedAt: timestamp(3) }
      ]
    });
    const deviceB = child({
      updatedAt: timestamp(4),
      adventureProgress: [
        { ...stage, stageIndex: 1, completed: true, bestStars: 3, updatedAt: timestamp(4) },
        { ...stage, stageIndex: 2, completed: true, bestStars: 2, updatedAt: timestamp(4) },
        { ...stage, stageIndex: 3, completed: false, unlocked: true, bestStars: 0, updatedAt: timestamp(4) }
      ]
    });

    const merged = mergeAppStorage(storage({ children: [deviceA] }), storage({ children: [deviceB] })).children[0];

    expect(merged.adventureProgress.filter((item) => item.completed).map((item) => item.stageIndex)).toEqual([1, 2]);
    expect(merged.adventureProgress.find((item) => item.stageIndex === 1)?.bestStars).toBe(3);
    expect(getRecommendedAdventureStage(merged)).toMatchObject({ level: 1, stageIndex: 3 });
  });

  test("merges fast-pass attempts, highest level and validated levels by stable ids", () => {
    const left = child({ fastPass: { attempts: [fastPassAttempt("attempt-a", 5, 2)], highestPassedLevel: 5, validatedSkipLevels: [1, 2, 3, 4] } });
    const right = child({ fastPass: { attempts: [fastPassAttempt("attempt-b", 7, 3)], highestPassedLevel: 7, validatedSkipLevels: [1, 2, 3, 4, 5, 6] } });

    const merged = mergeAppStorage(storage({ children: [left] }), storage({ children: [right] })).children[0];

    expect(merged.fastPass?.attempts.map((item) => item.id)).toEqual(["attempt-a", "attempt-b"]);
    expect(merged.fastPass?.highestPassedLevel).toBe(7);
    expect(merged.fastPass?.validatedSkipLevels).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("recalculates ability from merged records with the existing adaptive rules instead of taking the maximum level", () => {
    const low = child({ currentLevel: 1 });
    const incorrectlyHigh = child({ currentLevel: 9, updatedAt: timestamp(4) });
    const merged = mergeAppStorage(
      storage({ children: [low], practiceRecords: [record("a", 2), record("b", 3)] }),
      storage({ children: [incorrectlyHigh], practiceRecords: [record("c", 4)] })
    );

    expect(merged.children[0].currentLevel).toBe(2);
    expect(merged.children[0].abilityAssessmentStatus).toBe("provisional");
  });

  test("keeps same-name children separate when child ids differ", () => {
    const merged = mergeAppStorage(
      storage({ children: [child({ id: "child-a", name: "同名" })] }),
      storage({ children: [child({ id: "child-b", name: "同名", adventureProgress: [] })] })
    );
    expect(merged.children.map((item) => item.id).sort()).toEqual(["child-a", "child-b"]);
  });

  test("keeps unrelated child profile edits made on different devices", () => {
    const deviceA = child({
      name: "设备 A 昵称",
      gradeLevel: "grade3",
      updatedAt: timestamp(3),
      syncFieldUpdatedAt: { name: timestamp(3), gradeLevel: timestamp(1) }
    });
    const deviceB = child({
      name: "安安",
      gradeLevel: "grade5",
      updatedAt: timestamp(4),
      syncFieldUpdatedAt: { name: timestamp(1), gradeLevel: timestamp(4) }
    });

    const merged = mergeAppStorage(storage({ children: [deviceA] }), storage({ children: [deviceB] })).children[0];

    expect(merged.name).toBe("设备 A 昵称");
    expect(merged.gradeLevel).toBe("grade5");
  });

  test("uses tombstones so an old device cannot restore a deleted child", () => {
    const deletedAt = timestamp(5);
    const merged = mergeAppStorage(
      storage({ children: [], syncTombstones: [{ entityType: "child", id: "child-a", parentId: "parent-a", childId: "child-a", deletedAt }] }),
      storage({ children: [child({ updatedAt: timestamp(2) })], practiceRecords: [record("old", 2)] })
    );
    expect(merged.children).toHaveLength(0);
    expect(merged.practiceRecords).toHaveLength(0);
  });

  test("filters another account's children and records from a parent sync payload", () => {
    const cloud = storage({
      parentAccounts: [parent("parent-a"), parent("parent-b")],
      children: [child(), child({ id: "child-b", parentId: "parent-b", adventureProgress: [] })]
    });
    const malicious = storage({
      adminAccount: {
        username: "admin",
        passwordHash: "attacker-controlled",
        createdAt: timestamp(1),
        updatedAt: timestamp(9)
      },
      parentAccounts: [parent("parent-a"), parent("parent-b")],
      children: [child({ id: "child-b", parentId: "parent-b", adventureProgress: [] })],
      practiceRecords: [record("foreign", 3, { parentId: "parent-b", childId: "child-b" })]
    });

    const scoped = scopeIncomingStorageForParent(cloud, malicious, "parent-a");

    expect(scoped.parentAccounts.map((item) => item.id)).toEqual(["parent-a"]);
    expect(scoped.children).toHaveLength(0);
    expect(scoped.practiceRecords).toHaveLength(0);
    expect(scoped.adminAccount.passwordHash).toBe(cloud.adminAccount.passwordHash);
  });

  test("accepts legacy storage without sync metadata", () => {
    const legacy = storage({ schemaVersion: undefined, revision: undefined, syncTombstones: undefined });
    const merged = mergeAppStorage(legacy, storage());
    expect(merged.schemaVersion).toBe(4);
    expect(merged.revision).toBe(0);
    expect(merged.children[0].id).toBe("child-a");
  });
});
