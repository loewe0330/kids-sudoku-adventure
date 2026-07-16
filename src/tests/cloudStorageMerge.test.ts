import { describe, expect, test } from "vitest";
import { mergeCloudStorage, scopeStorageForParent } from "../../netlify/functions/cloudStorageMerge";
import type { AppStorage, ChildProfile, ParentAccount, PracticeRecord } from "../types";

const parent = (id: string, username: string, updatedAt: string): ParentAccount => ({
  id,
  username,
  displayName: username,
  passwordHash: `${username}-hash`,
  status: "enabled",
  createdAt: updatedAt,
  updatedAt
});

const child = (id: string, parentId: string, updatedAt: string, bestStars: number): ChildProfile => ({
  id,
  parentId,
  name: id,
  gradeLevel: "grade3",
  createdAt: updatedAt,
  updatedAt,
  smartDifficultyEnabled: true,
  currentLevel: 1,
  adventureProgress: [{
    parentId,
    childId: id,
    level: 1,
    stageIndex: 1,
    bestStars,
    completed: bestStars > 0,
    unlocked: true,
    createdAt: updatedAt,
    updatedAt
  }],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
});

const record = (id: string, parentId: string, childId: string): PracticeRecord => ({
  id,
  parentId,
  childId,
  puzzleId: `puzzle-${id}`,
  gradeLevel: "grade3",
  level: 1,
  size: 4,
  difficulty: "starter",
  startedAt: "2026-07-16T00:00:00.000Z",
  finishedAt: "2026-07-16T00:03:00.000Z",
  durationSeconds: 180,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  stars: 3,
  mode: "adventure",
  source: "challenge"
});

const storage = (overrides: Partial<AppStorage> = {}): AppStorage => ({
  adminAccount: {
    username: "admin",
    passwordHash: "shared-admin-hash",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z"
  },
  parentAccounts: [],
  activeSession: null,
  activeChildId: null,
  children: [],
  practiceRecords: [],
  puzzleBank: [],
  ...overrides
});

describe("cloud storage merge", () => {
  test("adds local families without removing existing cloud data", () => {
    const cloud = storage({
      parentAccounts: [parent("demo-parent", "demo-parent", "2026-07-10T00:00:00.000Z")],
      children: [child("demo-child", "demo-parent", "2026-07-10T00:00:00.000Z", 2)]
    });
    const seed = storage({
      parentAccounts: [parent("local-parent", "kevin", "2026-07-16T00:00:00.000Z")],
      children: [child("local-child", "local-parent", "2026-07-16T00:00:00.000Z", 3)],
      practiceRecords: [record("local-record", "local-parent", "local-child")]
    });

    const merged = mergeCloudStorage(cloud, seed);

    expect(merged.parentAccounts.map((item) => item.username).sort()).toEqual(["demo-parent", "kevin"]);
    expect(merged.children).toHaveLength(2);
    expect(merged.children.find((item) => item.id === "local-child")?.adventureProgress[0].bestStars).toBe(3);
    expect(merged.practiceRecords).toEqual([seed.practiceRecords[0]]);
  });

  test("reuses the cloud parent id when the same username came from another browser", () => {
    const cloudParent = parent("cloud-parent-id", "kevin", "2026-07-10T00:00:00.000Z");
    const localParent = parent("local-parent-id", "kevin", "2026-07-16T00:00:00.000Z");
    const merged = mergeCloudStorage(
      storage({ parentAccounts: [cloudParent] }),
      storage({
        parentAccounts: [localParent],
        children: [child("child-a", localParent.id, "2026-07-16T00:00:00.000Z", 3)],
        practiceRecords: [record("record-a", localParent.id, "child-a")]
      })
    );

    expect(merged.parentAccounts).toHaveLength(1);
    expect(merged.parentAccounts[0]).toMatchObject({ id: cloudParent.id, username: "kevin", passwordHash: localParent.passwordHash });
    expect(merged.children[0].parentId).toBe(cloudParent.id);
    expect(merged.practiceRecords[0].parentId).toBe(cloudParent.id);
  });

  test("returns only the authenticated parent's children and records", () => {
    const parentA = parent("parent-a", "a", "2026-07-10T00:00:00.000Z");
    const parentB = parent("parent-b", "b", "2026-07-10T00:00:00.000Z");
    const session = { role: "parent" as const, parentId: parentA.id, username: parentA.username, loggedInAt: "2026-07-16T00:00:00.000Z" };
    const scoped = scopeStorageForParent(storage({
      parentAccounts: [parentA, parentB],
      children: [
        child("child-a", parentA.id, "2026-07-10T00:00:00.000Z", 1),
        child("child-b", parentB.id, "2026-07-10T00:00:00.000Z", 3)
      ],
      practiceRecords: [
        record("record-a", parentA.id, "child-a"),
        record("record-b", parentB.id, "child-b")
      ]
    }), parentA, session);

    expect(scoped.parentAccounts.map((item) => item.id)).toEqual([parentA.id]);
    expect(scoped.children.map((item) => item.id)).toEqual(["child-a"]);
    expect(scoped.practiceRecords.map((item) => item.id)).toEqual(["record-a"]);
    expect(scoped.activeSession).toEqual(session);
  });
});
