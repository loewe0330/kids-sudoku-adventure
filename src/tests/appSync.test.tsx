import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { AppStorage, ChildProfile, ParentAccount, PracticeRecord } from "../types";

const APP_STORAGE_KEY = "kids-sudoku-trainer:v2";
const CLOUD_SESSION_KEY = "kids-sudoku-cloud-session:v1";
const now = "2026-07-16T08:00:00.000Z";

const parent: ParentAccount = {
  id: "parent-sync",
  username: "parent-sync",
  displayName: "同步家长",
  passwordHash: "hash",
  status: "enabled",
  createdAt: now,
  updatedAt: now
};

const child: ChildProfile = {
  id: "child-sync",
  parentId: parent.id,
  name: "同步测试",
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

const storage: AppStorage = {
  adminAccount: { username: "admin", passwordHash: "admin-hash", createdAt: now, updatedAt: now },
  parentAccounts: [parent],
  activeSession: { role: "parent", parentId: parent.id, username: parent.username, loggedInAt: now },
  activeChildId: child.id,
  children: [child],
  practiceRecords: [],
  puzzleBank: [],
  schemaVersion: 3,
  revision: 1,
  syncTombstones: []
};

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.stubEnv("VITE_CLOUD_API_URL", "https://sync.test/api/cloud");
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(storage));
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify({ token: "token-sync", role: "parent", parentId: parent.id }));
  window.history.pushState(null, "", `/child/${child.id}/home`);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("App cloud sync lifecycle", () => {
  test("syncs on startup, focus, online recovery and the settings action", async () => {
    const actions: string[] = [];
    let remoteStorage = storage;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      actions.push(body.action);
      if (body.action === "pull") return new Response(JSON.stringify({ storage: remoteStorage }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, storage: { ...body.storage!, revision: 2 } }), { status: 200 });
    }));
    const { default: App } = await import("../App");
    const storageApi = await import("../lib/storage");
    render(<App />);

    await waitFor(() => expect(actions).toContain("sync"));
    remoteStorage = {
      ...storage,
      revision: 4,
      children: [{
        ...child,
        updatedAt: "2026-07-16T09:00:00.000Z",
        adventureProgress: [{
          parentId: parent.id,
          childId: child.id,
          level: 2,
          stageIndex: 1,
          bestStars: 3,
          completed: true,
          unlocked: true,
          createdAt: now,
          updatedAt: "2026-07-16T09:00:00.000Z"
        }]
      }]
    };
    actions.length = 0;
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));
    expect(storageApi.getAppStorage().children[0].adventureProgress[0]).toMatchObject({
      level: 2,
      stageIndex: 1,
      completed: true,
      bestStars: 3
    });

    actions.length = 0;
    act(() => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));

    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(await screen.findByRole("button", { name: "同步数据" })).toBeTruthy();
    actions.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "同步数据" }));
    await waitFor(() => expect(actions).toEqual(["pull", "sync"]));
    expect(screen.getByText(/最后同步：/)).toBeTruthy();
  });

  test("automatically uploads a pending local result when the browser comes back online", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { default: App } = await import("../App");
    const storageApi = await import("../lib/storage");
    const { container } = render(<App />);
    await waitFor(() => expect(storageApi.getStorageSyncState().status).toBe("error"));
    expect(container.querySelector(".app-sync-banner")).toBeNull();
    expect(screen.queryByText("同步失败，点击重试")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "设置" }));
    expect(await screen.findByText("同步暂不可用")).toBeTruthy();
    expect(screen.getByText("学习记录仍保存在当前设备，可稍后重试。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新同步" })).toBeTruthy();

    const pendingRecord: PracticeRecord = {
      id: "pending-after-offline",
      parentId: parent.id,
      childId: child.id,
      puzzleId: "pending-puzzle",
      gradeLevel: child.gradeLevel,
      level: 1,
      size: 4,
      difficulty: "starter",
      startedAt: now,
      finishedAt: now,
      createdAt: now,
      updatedAt: now,
      durationSeconds: 80,
      mistakeCount: 0,
      hintCount: 0,
      completed: true,
      gaveUp: false,
      stars: 3,
      mode: "practice",
      source: "smart"
    };
    act(() => storageApi.addPracticeRecord(pendingRecord));
    await waitFor(() => expect(storageApi.getAppStorage().practiceRecords).toHaveLength(1));

    const uploadedRecordIds: string[][] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { action: string; storage?: AppStorage };
      if (body.action === "pull") return new Response(JSON.stringify({ storage }), { status: 200 });
      uploadedRecordIds.push(body.storage?.practiceRecords.map((record) => record.id) ?? []);
      return new Response(JSON.stringify({ ok: true, storage: { ...body.storage!, revision: 2 } }), { status: 200 });
    }));

    act(() => window.dispatchEvent(new Event("online")));

    await waitFor(() => expect(uploadedRecordIds).toContainEqual(["pending-after-offline"]));
    expect(storageApi.getStorageSyncState().status).toBe("synced");
  });
});
