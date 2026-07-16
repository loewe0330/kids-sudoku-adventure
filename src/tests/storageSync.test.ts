import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAdventureMap } from "../lib/adventure";
import { applyGuidanceConsumption, getBusinessDate, getGuidanceStatus } from "../lib/guidance";
import { mergeAppStorage } from "../lib/storageMerge";
import type { AppStorage, ChildProfile, ParentAccount, PracticeRecord } from "../types";

const APP_STORAGE_KEY = "kids-sudoku-trainer:v2";
const CLOUD_SESSION_KEY = "kids-sudoku-cloud-session:v1";
const now = "2026-07-16T08:00:00.000Z";

const parent: ParentAccount = {
  id: "parent-a",
  username: "parent-a",
  displayName: "家长",
  passwordHash: "hash",
  status: "enabled",
  createdAt: now,
  updatedAt: now
};

const child: ChildProfile = {
  id: "child-a",
  parentId: parent.id,
  name: "安安",
  gradeLevel: "grade3",
  createdAt: now,
  updatedAt: now,
  smartDifficultyEnabled: true,
  currentLevel: 1,
  abilityAssessmentStatus: "unassessed",
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
};

const record = (id: string, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id,
  parentId: parent.id,
  childId: child.id,
  puzzleId: `puzzle-${id}`,
  gradeLevel: child.gradeLevel,
  level: 1,
  size: 4,
  difficulty: "starter",
  startedAt: now,
  finishedAt: now,
  createdAt: now,
  updatedAt: now,
  durationSeconds: 90,
  mistakeCount: 0,
  hintCount: 0,
  completed: true,
  gaveUp: false,
  stars: 3,
  mode: "practice",
  source: "smart",
  ...overrides
});

const storage = (records: PracticeRecord[] = []): AppStorage => ({
  adminAccount: { username: "admin", passwordHash: "admin-hash", createdAt: now, updatedAt: now },
  parentAccounts: [parent],
  activeSession: { role: "parent", parentId: parent.id, username: parent.username, loggedInAt: now },
  activeChildId: child.id,
  children: [child],
  practiceRecords: records,
  puzzleBank: [],
  schemaVersion: 3,
  revision: 1,
  syncTombstones: []
});

const installCloudSession = () => {
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify({ token: "token-a", role: "parent", parentId: parent.id }));
};

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json" }
});

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.stubEnv("VITE_CLOUD_API_URL", "https://sync.test/api/cloud");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("storage synchronization service", () => {
  test("pulls before upload and keeps records created on both devices", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage([record("device-a")])));
    installCloudSession();
    const cloud = storage([record("device-b")]);
    const actions: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      actions.push(body.action);
      if (body.action === "pull") return response({ storage: cloud });
      return response({ ok: true, storage: { ...body.storage!, revision: 2 } });
    }));
    const sync = await import("../lib/storage");

    await sync.synchronizeAppStorage();

    expect(actions).toEqual(["pull", "sync"]);
    expect(sync.getAppStorage().practiceRecords.map((item) => item.id).sort()).toEqual(["device-a", "device-b"]);
    expect(sync.getStorageSyncState().status).toBe("synced");
  });

  test("keeps a local result pending after failure and uploads it after retry", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const sync = await import("../lib/storage");

    sync.addPracticeRecord(record("offline-result"));
    await waitFor(() => expect(sync.getStorageSyncState().status).toBe("error"));
    expect(sync.getAppStorage().practiceRecords.map((item) => item.id)).toContain("offline-result");

    const cloudWithOnlineWork = storage([record("online-device-result")]);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      if (body.action === "pull") return response({ storage: cloudWithOnlineWork });
      return response({ ok: true, storage: { ...body.storage!, revision: 2 } });
    }));
    await sync.synchronizeAppStorage();

    expect(sync.getStorageSyncState().status).toBe("synced");
    expect(sync.getAppStorage().practiceRecords.map((item) => item.id).sort()).toEqual([
      "offline-result",
      "online-device-result"
    ]);
  });

  test("uploads an ordinary adventure completion immediately after its local mutations", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    const actions: string[] = [];
    let uploaded: AppStorage | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      actions.push(body.action);
      if (body.action === "pull") return response({ storage: storage() });
      uploaded = body.storage;
      return response({ ok: true, storage: { ...body.storage!, revision: 2 } });
    }));
    const sync = await import("../lib/storage");
    const completedAt = "2026-07-16T09:00:00.000Z";

    sync.addPracticeRecord(record("adventure-l2-1", {
      mode: "adventure",
      source: "stage",
      level: 2,
      stageIndex: 1
    }));
    sync.updateChild(parent.id, child.id, {
      adventureProgress: [
        {
          parentId: parent.id,
          childId: child.id,
          level: 2,
          stageIndex: 1,
          bestStars: 3,
          completed: true,
          unlocked: true,
          createdAt: now,
          updatedAt: completedAt
        },
        {
          parentId: parent.id,
          childId: child.id,
          level: 2,
          stageIndex: 2,
          bestStars: 0,
          completed: false,
          unlocked: true,
          createdAt: completedAt,
          updatedAt: completedAt
        }
      ]
    });

    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));
    expect(uploaded?.practiceRecords.map((item) => item.id)).toContain("adventure-l2-1");
    expect(uploaded?.children[0].adventureProgress).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 2, stageIndex: 1, completed: true, bestStars: 3 }),
      expect.objectContaining({ level: 2, stageIndex: 2, unlocked: true })
    ]));
  });

  test("uploads a completed fast-pass attempt immediately", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    const actions: string[] = [];
    let uploaded: AppStorage | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      actions.push(body.action);
      if (body.action === "pull") return response({ storage: storage() });
      uploaded = body.storage;
      return response({ ok: true, storage: { ...body.storage!, revision: 2 } });
    }));
    const sync = await import("../lib/storage");

    sync.updateChild(parent.id, child.id, {
      fastPass: {
        attempts: [{
          id: "fast-pass-device-a",
          targetLevel: 4,
          status: "passed",
          startedAt: now,
          finishedAt: "2026-07-16T09:03:00.000Z",
          createdAt: now,
          updatedAt: "2026-07-16T09:03:00.000Z",
          results: [],
          passed: true
        }],
        highestPassedLevel: 4,
        validatedSkipLevels: [1, 2, 3],
        updatedAt: "2026-07-16T09:03:00.000Z"
      }
    });

    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));
    expect(uploaded?.children[0].fastPass).toMatchObject({
      highestPassedLevel: 4,
      validatedSkipLevels: [1, 2, 3]
    });
    expect(uploaded?.children[0].fastPass?.attempts.map((attempt) => attempt.id)).toEqual(["fast-pass-device-a"]);
  });

  test("keeps data pending without making a request while the browser reports offline", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const sync = await import("../lib/storage");

    sync.addPracticeRecord(record("known-offline"));

    await waitFor(() => expect(sync.getStorageSyncState()).toMatchObject({
      status: "pending",
      message: "等待联网同步"
    }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sync.getAppStorage().practiceRecords.map((item) => item.id)).toContain("known-offline");
  });

  test("pulls adventure stars and fast-pass progress created on another device", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    const progressedChild: ChildProfile = {
      ...child,
      updatedAt: "2026-07-16T09:00:00.000Z",
      adventureProgress: [
        {
          parentId: parent.id,
          childId: child.id,
          level: 1,
          stageIndex: 1,
          bestStars: 3,
          completed: true,
          unlocked: true,
          createdAt: now,
          updatedAt: "2026-07-16T09:00:00.000Z"
        },
        {
          parentId: parent.id,
          childId: child.id,
          level: 1,
          stageIndex: 2,
          bestStars: 0,
          completed: false,
          unlocked: true,
          createdAt: "2026-07-16T09:00:00.000Z",
          updatedAt: "2026-07-16T09:00:00.000Z"
        }
      ],
      fastPass: {
        attempts: [{
          id: "attempt-device-a",
          targetLevel: 4,
          status: "passed",
          startedAt: "2026-07-16T09:00:00.000Z",
          finishedAt: "2026-07-16T09:03:00.000Z",
          createdAt: "2026-07-16T09:00:00.000Z",
          updatedAt: "2026-07-16T09:03:00.000Z",
          results: [],
          passed: true
        }],
        highestPassedLevel: 4,
        validatedSkipLevels: [1, 2, 3],
        updatedAt: "2026-07-16T09:03:00.000Z"
      }
    };
    const cloud = { ...storage(), children: [progressedChild], revision: 5 };
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      if (body.action === "pull") return response({ storage: cloud });
      return response({ ok: true, storage: { ...body.storage!, revision: 6 } });
    }));
    const sync = await import("../lib/storage");

    await sync.synchronizeAppStorage();

    const syncedChild = sync.getAppStorage().children[0];
    expect(syncedChild.adventureProgress).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 1, stageIndex: 1, bestStars: 3, completed: true }),
      expect.objectContaining({ level: 1, stageIndex: 2, unlocked: true })
    ]));
    expect(syncedChild.fastPass?.attempts.map((attempt) => attempt.id)).toEqual(["attempt-device-a"]);
    expect(syncedChild.fastPass?.highestPassedLevel).toBe(4);
  });

  test("pulls the stable child id's latest progress when switching into that child", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({ ...storage(), activeChildId: null }));
    installCloudSession();
    const remoteChild: ChildProfile = {
      ...child,
      updatedAt: "2026-07-16T10:00:00.000Z",
      adventureProgress: [{
        parentId: parent.id,
        childId: child.id,
        level: 2,
        stageIndex: 1,
        bestStars: 3,
        completed: true,
        unlocked: true,
        createdAt: now,
        updatedAt: "2026-07-16T10:00:00.000Z"
      }]
    };
    const cloud = { ...storage(), children: [remoteChild], revision: 4 };
    const actions: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      actions.push(body.action);
      if (body.action === "pull") return response({ storage: cloud });
      return response({ ok: true, storage: { ...body.storage!, revision: 5 } });
    }));
    const sync = await import("../lib/storage");

    sync.setActiveChild(child.id);

    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));
    expect(sync.getAppStorage().activeChildId).toBe(child.id);
    expect(sync.getAppStorage().children.find((item) => item.id === child.id)?.adventureProgress[0]).toMatchObject({
      level: 2,
      stageIndex: 1,
      completed: true,
      bestStars: 3
    });
  });

  test("makes device A practice, adventure and fast-pass changes visible on device B", async () => {
    let cloud = storage();
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      if (body.action === "pull") return response({ storage: cloud });
      cloud = { ...mergeAppStorage(cloud, body.storage!), revision: (cloud.revision ?? 0) + 1 };
      return response({ ok: true, storage: cloud });
    }));

    const deviceAChild: ChildProfile = {
      ...child,
      updatedAt: "2026-07-16T10:00:00.000Z",
      adventureProgress: [{
        parentId: parent.id,
        childId: child.id,
        level: 1,
        stageIndex: 1,
        bestStars: 3,
        completed: true,
        unlocked: true,
        createdAt: now,
        updatedAt: "2026-07-16T10:00:00.000Z"
      }],
      fastPass: {
        attempts: [{
          id: "device-a-attempt",
          targetLevel: 3,
          status: "passed",
          startedAt: "2026-07-16T10:00:00.000Z",
          finishedAt: "2026-07-16T10:02:00.000Z",
          createdAt: "2026-07-16T10:00:00.000Z",
          updatedAt: "2026-07-16T10:02:00.000Z",
          results: [],
          passed: true
        }],
        highestPassedLevel: 3,
        validatedSkipLevels: [1, 2]
      }
    };
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
      ...storage([record("device-a-practice")]),
      children: [deviceAChild]
    }));
    installCloudSession();
    const deviceA = await import("../lib/storage");
    await deviceA.synchronizeAppStorage();

    vi.resetModules();
    localStorage.clear();
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    installCloudSession();
    const deviceB = await import("../lib/storage");
    await deviceB.synchronizeAppStorage();

    const deviceBStorage = deviceB.getAppStorage();
    expect(deviceBStorage.practiceRecords.map((item) => item.id)).toContain("device-a-practice");
    expect(deviceBStorage.children[0].adventureProgress[0]).toMatchObject({ completed: true, bestStars: 3 });
    const deviceBMap = getAdventureMap(deviceBStorage.children[0]);
    expect(deviceBMap.find((stage) => stage.level === 1 && stage.stageIndex === 1)).toMatchObject({ completed: true, bestStars: 3 });
    expect(deviceBMap.find((stage) => stage.level === 1 && stage.stageIndex === 2)?.unlocked).toBe(true);
    expect(deviceBStorage.children[0].fastPass).toMatchObject({
      highestPassedLevel: 3,
      validatedSkipLevels: [1, 2]
    });
    expect(deviceBStorage.children[0].fastPass?.attempts[0].id).toBe("device-a-attempt");
  });

  test("synchronizes free and paid guidance use across two isolated device contexts without rollback", async () => {
    const stage = (stageIndex: number) => ({
      parentId: parent.id,
      childId: child.id,
      level: 1,
      stageIndex,
      bestStars: 3,
      completed: true,
      unlocked: true,
      createdAt: now,
      updatedAt: now
    });
    const guidanceChild: ChildProfile = {
      ...child,
      adventureProgress: [stage(1), stage(2)],
      guidanceUsage: { date: getBusinessDate(), freeUsed: 0, paidUsed: 0 },
      guidanceOperations: [],
      spentStars: 0
    };
    const base = { ...storage(), children: [guidanceChild] };
    let cloud = base;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        action: string;
        storage?: AppStorage;
        childId?: string;
        puzzleId?: string;
        operationId?: string;
      };
      if (body.action === "pull") return response({ storage: cloud });
      if (body.action === "consumeGuidance") {
        const current = cloud.children.find((item) => item.id === body.childId)!;
        const result = applyGuidanceConsumption({
          child: current,
          puzzleId: body.puzzleId!,
          operationId: body.operationId!,
          businessDate: getBusinessDate(),
          createdAt: now
        });
        cloud = {
          ...cloud,
          children: cloud.children.map((item) => item.id === current.id ? result.child : item),
          revision: (cloud.revision ?? 0) + 1
        };
        return response({ status: result.status, storage: cloud });
      }
      cloud = { ...mergeAppStorage(cloud, body.storage!), revision: (cloud.revision ?? 0) + 1 };
      return response({ ok: true, storage: cloud });
    }));

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(base));
    installCloudSession();
    const deviceA = await import("../lib/storage");
    for (let index = 1; index <= 4; index += 1) {
      await deviceA.consumeGuidance({
        parentId: parent.id,
        childId: child.id,
        puzzleId: `device-a-puzzle-${index}`,
        operationId: `device-a-operation-${index}`
      });
    }
    const deviceASnapshot = deviceA.getAppStorage();
    expect(getGuidanceStatus(deviceASnapshot.children[0])).toMatchObject({
      remainingFree: 0,
      availableStars: 5,
      spentStars: 1,
      usage: { freeUsed: 3, paidUsed: 1 }
    });

    vi.resetModules();
    localStorage.clear();
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(base));
    installCloudSession();
    const deviceB = await import("../lib/storage");
    await deviceB.synchronizeAppStorage();
    expect(getGuidanceStatus(deviceB.getAppStorage().children[0])).toMatchObject({
      remainingFree: 0,
      availableStars: 5,
      spentStars: 1,
      usage: { freeUsed: 3, paidUsed: 1 }
    });
    await deviceB.consumeGuidance({
      parentId: parent.id,
      childId: child.id,
      puzzleId: "device-b-puzzle-1",
      operationId: "device-b-operation-1"
    });
    expect(getGuidanceStatus(deviceB.getAppStorage().children[0])).toMatchObject({
      availableStars: 4,
      spentStars: 2,
      usage: { freeUsed: 3, paidUsed: 2 }
    });

    vi.resetModules();
    localStorage.clear();
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(deviceASnapshot));
    installCloudSession();
    const deviceARecovered = await import("../lib/storage");
    await deviceARecovered.synchronizeAppStorage();
    const recovered = deviceARecovered.getAppStorage().children[0];
    expect(getGuidanceStatus(recovered)).toMatchObject({
      availableStars: 4,
      spentStars: 2,
      usage: { freeUsed: 3, paidUsed: 2 }
    });
    expect(recovered.guidanceOperations?.map((operation) => operation.id)).toEqual(expect.arrayContaining([
      "device-a-operation-1",
      "device-a-operation-2",
      "device-a-operation-3",
      "device-a-operation-4",
      "device-b-operation-1"
    ]));
  });

  test("merges local offline work with the cloud snapshot during parent login", async () => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage([record("local-before-login")])));
    const cloud = storage([record("cloud-before-login")]);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      if (body.action === "parentLogin") {
        return response({ token: "login-token", storage: cloud });
      }
      expect(body.action).toBe("sync");
      expect(body.storage?.practiceRecords.map((item) => item.id).sort()).toEqual([
        "cloud-before-login",
        "local-before-login"
      ]);
      return response({ ok: true, storage: { ...body.storage!, revision: 2 } });
    }));
    const sync = await import("../lib/storage");

    await sync.loginParent(parent.username, "password");

    const result = sync.getAppStorage();
    expect(result.children.map((item) => item.id)).toEqual([child.id]);
    expect(result.practiceRecords.map((item) => item.id).sort()).toEqual([
      "cloud-before-login",
      "local-before-login"
    ]);
    expect(sync.getStorageSyncState().status).toBe("synced");
  });

  test("continues in local-only mode when cloud accounts are not configured", async () => {
    vi.stubEnv("VITE_CLOUD_API_URL", "");
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage()));
    const sync = await import("../lib/storage");
    sync.addPracticeRecord(record("local-only"));
    expect(sync.getAppStorage().practiceRecords.map((item) => item.id)).toContain("local-only");
  });
});
