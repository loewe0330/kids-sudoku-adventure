import { beforeEach, describe, expect, test, vi } from "vitest";
import { APP_STORAGE_KEY } from "../data/storageSchema";
import {
  addPracticeRecord,
  addPuzzleToBank,
  clearChildData,
  createChild,
  createParentAccount,
  deleteParentAccount,
  disableParentAccount,
  enableParentAccount,
  getAppStorage,
  getChildrenByParent,
  getCurrentParent,
  getPracticeRecordsByChild,
  getPracticeRecordsByParent,
  getPuzzlesByChild,
  hashPassword,
  initDefaultAdminIfNeeded,
  loginAdmin,
  loginParent,
  logout,
  resetParentPassword,
  setActiveChild,
  updateCurrentParentPassword,
  updateChild
} from "../lib/storage";
import type { PracticeRecord, SudokuPuzzleItem } from "../types";

beforeEach(() => {
  localStorage.clear();
});

const parentInput = (username: string) => ({
  username,
  displayName: `${username} 家长`,
  password: "secret123",
  enabled: true
});

const samplePuzzle = (parentId: string, childId: string): SudokuPuzzleItem => ({
  id: crypto.randomUUID(),
  parentId,
  childId,
  size: 4,
  boxRows: 2,
  boxCols: 2,
  gradeLevel: "grade1",
  difficulty: "starter",
  level: 1,
  puzzle: [[1, 0, 0, 4], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0]],
  solution: [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]],
  clues: 4,
  emptyCount: 12,
  createdAt: new Date().toISOString()
});

const sampleRecord = (parentId: string, childId: string, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: crypto.randomUUID(),
  parentId,
  childId,
  puzzleId: "p1",
  gradeLevel: "grade1",
  level: 1,
  size: 4,
  difficulty: "starter",
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  durationSeconds: 80,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  ...overrides,
  stars: overrides.stars ?? 3,
  mode: overrides.mode ?? "adventure"
});

describe("test-version account repository", () => {
  test("initializes the default admin and logs in with hashed password", async () => {
    await initDefaultAdminIfNeeded();
    const storage = getAppStorage();

    expect(storage.adminAccount.username).toBe("admin");
    expect(storage.adminAccount.passwordHash).not.toBe("admin123");
    expect(storage.adminAccount.passwordHash).toBe(await hashPassword("admin123"));
    await expect(loginAdmin("admin", "admin123")).resolves.toMatchObject({ role: "admin", username: "admin" });
  });

  test("admin creates parents, prevents duplicate usernames, disables and resets passwords", async () => {
    await initDefaultAdminIfNeeded();
    const parent = await createParentAccount(parentInput("parent-a"));

    await expect(createParentAccount(parentInput("parent-a"))).rejects.toThrow("账号已存在");
    await expect(loginParent("parent-a", "wrong-password")).rejects.toThrow("密码错误");
    await expect(loginParent("parent-a", "secret123")).resolves.toMatchObject({ role: "parent", parentId: parent.id });

    logout();
    disableParentAccount(parent.id);
    await expect(loginParent("parent-a", "secret123")).rejects.toThrow("账号已停用");

    enableParentAccount(parent.id);
    await resetParentPassword(parent.id, "newpass123");
    await expect(loginParent("parent-a", "secret123")).rejects.toThrow("密码错误");
    await expect(loginParent("parent-a", "newpass123")).resolves.toMatchObject({ parentId: parent.id });

    await updateCurrentParentPassword("newpass123", "parentown123");
    logout();
    await expect(loginParent("parent-a", "parentown123")).resolves.toMatchObject({ parentId: parent.id });
  });

  test("parent can create at most two children and can add after deleting one", async () => {
    const parent = await createParentAccount(parentInput("parent-a"));
    const childA = createChild(parent.id, { name: "安安", gradeLevel: "grade1", smartDifficultyEnabled: true });
    createChild(parent.id, { name: "乐乐", gradeLevel: "grade3", smartDifficultyEnabled: true });

    expect(() => createChild(parent.id, { name: "多多", gradeLevel: "grade5", smartDifficultyEnabled: true })).toThrow(
      "最多创建 2 个学习账号"
    );
    clearChildData(parent.id, childA.id);
    expect(() => createChild(parent.id, { name: "多多", gradeLevel: "grade5", smartDifficultyEnabled: true })).not.toThrow();
  });

  test("new child starts at L1-1 without treating grade as an ability result", async () => {
    const parent = await createParentAccount(parentInput("parent-cold-start"));
    const child = createChild(parent.id, { name: "安安", gradeLevel: "grade3" });

    expect(child).toMatchObject({ currentLevel: 1, abilityAssessmentStatus: "unassessed" });
    expect(child.adventureProgress).toHaveLength(1);
    expect(child.adventureProgress[0]).toMatchObject({ level: 1, stageIndex: 1, unlocked: true, completed: false });

    updateChild(parent.id, child.id, { name: "安安改", gradeLevel: "grade4" });
    const saved = getChildrenByParent(parent.id)[0];
    expect(saved).toMatchObject({ name: "安安改", gradeLevel: "grade4", currentLevel: 1 });
  });

  test("tracks child profile field timestamps independently", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-07-16T08:00:00.000Z"));
      const parent = await createParentAccount(parentInput("parent-field-clock"));
      const child = createChild(parent.id, { name: "原昵称", gradeLevel: "grade3" });
      const originalGradeTimestamp = child.syncFieldUpdatedAt?.gradeLevel;

      vi.setSystemTime(new Date("2026-07-16T09:00:00.000Z"));
      updateChild(parent.id, child.id, { name: "新昵称" });
      const saved = getChildrenByParent(parent.id)[0];

      expect(saved.syncFieldUpdatedAt?.name).toBe("2026-07-16T09:00:00.000Z");
      expect(saved.syncFieldUpdatedAt?.gradeLevel).toBe(originalGradeTimestamp);
    } finally {
      vi.useRealTimers();
    }
  });

  test("legacy children keep their ability level and adventure progress during normalization", () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
      children: [{
        id: "legacy-child",
        parentId: "legacy-parent",
        name: "乐乐",
        gradeLevel: "grade5",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        smartDifficultyEnabled: true,
        currentLevel: 7,
        adventureProgress: [{
          parentId: "legacy-parent",
          childId: "legacy-child",
          level: 2,
          stageIndex: 3,
          bestStars: 2,
          completed: true,
          unlocked: true,
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z"
        }]
      }],
      practiceRecords: [],
      puzzleBank: []
    }));

    const legacy = getAppStorage().children[0];
    expect(legacy.currentLevel).toBe(7);
    expect(legacy.adventureProgress[0]).toMatchObject({ level: 2, stageIndex: 3, bestStars: 2 });
    expect(legacy.fastPass).toBeUndefined();
    expect(legacy.guidanceUsage).toMatchObject({ freeUsed: 0, paidUsed: 0 });
    expect(legacy.guidanceOperations).toEqual([]);
    expect(legacy.spentStars).toBe(0);
  });

  test("parent and child data are isolated by parentId and childId", async () => {
    const parentA = await createParentAccount(parentInput("parent-a"));
    const parentB = await createParentAccount(parentInput("parent-b"));
    const childA = createChild(parentA.id, { name: "安安", gradeLevel: "grade1", smartDifficultyEnabled: true });
    const childB = createChild(parentB.id, { name: "贝贝", gradeLevel: "grade3", smartDifficultyEnabled: true });
    const sibling = createChild(parentA.id, { name: "辰辰", gradeLevel: "grade3", smartDifficultyEnabled: true });

    addPuzzleToBank(samplePuzzle(parentA.id, childA.id));
    addPuzzleToBank(samplePuzzle(parentB.id, childB.id));
    addPracticeRecord(sampleRecord(parentA.id, childA.id));
    addPracticeRecord(sampleRecord(parentA.id, sibling.id));
    addPracticeRecord(sampleRecord(parentB.id, childB.id));
    updateChild(parentA.id, childA.id, { currentLevel: 2 });

    expect(getChildrenByParent(parentA.id).map((child) => child.id)).toEqual([childA.id, sibling.id]);
    expect(getPuzzlesByChild(parentA.id, childA.id)).toHaveLength(1);
    expect(getPuzzlesByChild(parentA.id, childB.id)).toHaveLength(0);
    expect(getPracticeRecordsByChild(parentA.id, childA.id)).toHaveLength(1);
    expect(getPracticeRecordsByChild(parentA.id, sibling.id)).toHaveLength(1);
    expect(getPracticeRecordsByParent(parentB.id)).toHaveLength(1);
    expect(getChildrenByParent(parentA.id).find((child) => child.id === sibling.id)?.currentLevel).toBe(1);
  });

  test("deleting a parent clears children puzzles records and active sessions", async () => {
    const parent = await createParentAccount(parentInput("parent-a"));
    const child = createChild(parent.id, { name: "安安", gradeLevel: "grade1", smartDifficultyEnabled: true });
    addPuzzleToBank(samplePuzzle(parent.id, child.id));
    addPracticeRecord(sampleRecord(parent.id, child.id));
    await loginParent("parent-a", "secret123");
    setActiveChild(child.id);

    deleteParentAccount(parent.id);
    const storage = getAppStorage();

    expect(storage.parentAccounts.some((item) => item.id === parent.id)).toBe(false);
    expect(storage.children.some((item) => item.parentId === parent.id)).toBe(false);
    expect(storage.puzzleBank.some((item) => item.parentId === parent.id)).toBe(false);
    expect(storage.practiceRecords.some((item) => item.parentId === parent.id)).toBe(false);
    expect(storage.activeSession).toBeNull();
    expect(storage.activeChildId).toBeNull();
    expect(getCurrentParent()).toBeNull();
  });
});
