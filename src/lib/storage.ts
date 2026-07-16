import { clampLevel } from "../constants/difficultyLevels";
import { APP_STORAGE_KEY } from "../data/storageSchema";
import type {
  AdminAccount,
  AppStorage,
  AuthSession,
  ChildProfile,
  ChildProfileInput,
  ParentAccount,
  ParentAccountInput,
  ParentAccountUpdate,
  PracticeRecord,
  PracticeMode,
  SudokuPuzzleItem,
  SyncTombstone
} from "../types";
import { getRawStorageItem, setRawStorageItem } from "../platform/web/webStorageAdapter";
import {
  hasCloudSession,
  isCloudAccountEnabled,
  consumeCloudGuidance,
  loginCloudAdmin,
  loginCloudParent,
  logoutCloudSession,
  pullCloudStorage,
  syncCloudStorage
} from "./cloudClient";
import { createUuid, sha256 } from "./browserCrypto";
import { nowIso } from "./time";
import {
  applyGuidanceConsumption,
  getBusinessDate,
  mergeGuidanceData,
  type GuidanceConsumptionResult
} from "./guidance";
import { mergeAppStorage, remapAuthenticatedParent, SYNC_SCHEMA_VERSION } from "./storageMerge";

const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const defaultPracticeMode: PracticeMode = "adventure";
const SYNC_STATE_KEY = "kids-sudoku-sync-state:v1";

export type SyncStatus = "synced" | "syncing" | "pending" | "error";

export interface StorageSyncState {
  status: SyncStatus;
  lastSyncedAt?: string;
  message?: string;
}

const syncListeners = new Set<(state: StorageSyncState) => void>();
let syncInFlight: Promise<AppStorage> | null = null;
let syncQueued = false;
let syncScheduled = false;

export const getStorageSyncState = (): StorageSyncState => {
  const raw = getRawStorageItem(SYNC_STATE_KEY);
  if (!raw) return { status: "synced" };
  try {
    const parsed = JSON.parse(raw) as Partial<StorageSyncState>;
    if (["synced", "syncing", "pending", "error"].includes(parsed.status ?? "")) return parsed as StorageSyncState;
  } catch {
    // Invalid legacy state is replaced below.
  }
  return { status: "synced" };
};

const setStorageSyncState = (state: StorageSyncState): void => {
  setRawStorageItem(SYNC_STATE_KEY, JSON.stringify(state));
  syncListeners.forEach((listener) => listener(state));
};

export const subscribeStorageSyncState = (listener: (state: StorageSyncState) => void): (() => void) => {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
};

const createDefaultAdmin = (): AdminAccount => {
  const timestamp = nowIso();
  return {
    username: "admin",
    passwordHash: DEFAULT_ADMIN_HASH,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

const defaultStorage = (): AppStorage => ({
  adminAccount: createDefaultAdmin(),
  parentAccounts: [],
  activeSession: null,
  activeChildId: null,
  children: [],
  practiceRecords: [],
  puzzleBank: [],
  schemaVersion: SYNC_SCHEMA_VERSION,
  revision: 0,
  syncTombstones: []
});

const isStorageLike = (value: unknown): value is Partial<AppStorage> => {
  if (!value || typeof value !== "object") return false;
  const storage = value as Partial<AppStorage>;
  return Array.isArray(storage.children) && Array.isArray(storage.practiceRecords) && Array.isArray(storage.puzzleBank);
};

const normalizeChild = (child: ChildProfile): ChildProfile => {
  const fallbackTimestamp = child.updatedAt ?? child.createdAt ?? nowIso();
  const currentLevel = clampLevel(typeof child.currentLevel === "number" ? child.currentLevel : 1);
  const syncFieldUpdatedAt = child.syncFieldUpdatedAt ?? {};
  const guidanceData = mergeGuidanceData(child, child, getBusinessDate());
  return {
    ...child,
    currentLevel,
    schemaVersion: Math.max(child.schemaVersion ?? 0, SYNC_SCHEMA_VERSION),
    revision: child.revision ?? 0,
    ...guidanceData,
    syncFieldUpdatedAt: {
      name: syncFieldUpdatedAt.name ?? fallbackTimestamp,
      gradeLevel: syncFieldUpdatedAt.gradeLevel ?? fallbackTimestamp,
      avatar: syncFieldUpdatedAt.avatar ?? fallbackTimestamp,
      smartDifficultyEnabled: syncFieldUpdatedAt.smartDifficultyEnabled ?? fallbackTimestamp,
      settings: syncFieldUpdatedAt.settings ?? fallbackTimestamp
    },
    settings: {
      soundEnabled: child.settings?.soundEnabled ?? false,
      immediateErrorFeedback: child.settings?.immediateErrorFeedback ?? true,
      showTimer: child.settings?.showTimer ?? true,
      practiceMode: child.settings?.practiceMode ?? defaultPracticeMode,
      successAnimationEnabled: child.settings?.successAnimationEnabled ?? true,
      reducedMotion: child.settings?.reducedMotion ?? false
    },
    adventureProgress: Array.isArray(child.adventureProgress)
      ? child.adventureProgress.map((stage) => ({
        parentId: stage.parentId ?? child.parentId,
        childId: stage.childId ?? child.id,
        level: stage.level,
        stageIndex: stage.stageIndex,
        bestStars: stage.bestStars ?? 0,
        completed: stage.completed ?? false,
        unlocked: stage.unlocked ?? false,
        createdAt: stage.createdAt ?? stage.updatedAt ?? fallbackTimestamp,
        updatedAt: stage.updatedAt ?? fallbackTimestamp
      }))
      : [],
    fastPass: child.fastPass ? {
      attempts: Array.isArray(child.fastPass.attempts) ? child.fastPass.attempts.map((attempt) => ({
        ...attempt,
        createdAt: attempt.createdAt ?? attempt.startedAt,
        updatedAt: attempt.updatedAt ?? attempt.finishedAt
      })) : [],
      highestPassedLevel: typeof child.fastPass.highestPassedLevel === "number"
        ? clampLevel(child.fastPass.highestPassedLevel)
        : undefined,
      validatedSkipLevels: Array.isArray(child.fastPass.validatedSkipLevels)
        ? Array.from(new Set(child.fastPass.validatedSkipLevels.map(clampLevel))).sort((a, b) => a - b)
        : [],
      updatedAt: child.fastPass.updatedAt
    } : undefined
  };
};

const normalizeRecord = (record: PracticeRecord): PracticeRecord => ({
  ...record,
  createdAt: record.createdAt ?? record.startedAt,
  updatedAt: record.updatedAt ?? record.finishedAt ?? record.startedAt,
  viewedAnswer: record.viewedAnswer ?? record.gaveUp,
  guidanceUsed: record.guidanceUsed ?? false,
  guidanceSource: record.guidanceSource ?? null,
  stars: record.stars ?? 0,
  mode: record.mode ?? "practice",
  source: record.source ?? ((record.mode ?? "practice") === "adventure" ? "challenge" : "smart")
});

const normalizePuzzle = (puzzle: SudokuPuzzleItem): SudokuPuzzleItem => ({
  ...puzzle,
  updatedAt: puzzle.updatedAt ?? puzzle.createdAt
});

const normalizeStorage = (storage: Partial<AppStorage>): AppStorage => {
  const parentAccounts = Array.isArray(storage.parentAccounts) ? storage.parentAccounts : [];
  const children = Array.isArray(storage.children) ? storage.children.filter((child) => Boolean(child.parentId)).map(normalizeChild) : [];
  const practiceRecords = Array.isArray(storage.practiceRecords)
    ? storage.practiceRecords.filter((record) => Boolean(record.parentId) && Boolean(record.childId)).map(normalizeRecord)
    : [];
  const puzzleBank = Array.isArray(storage.puzzleBank)
    ? storage.puzzleBank.filter((puzzle) => Boolean(puzzle.parentId) && Boolean(puzzle.childId)).map(normalizePuzzle)
    : [];
  const syncTombstones = Array.isArray(storage.syncTombstones)
    ? storage.syncTombstones.filter((item) => Boolean(item.id) && Boolean(item.parentId) && Boolean(item.deletedAt))
    : [];
  const activeSession = storage.activeSession && isSessionValid(storage.activeSession, parentAccounts)
    ? storage.activeSession
    : null;
  const activeChildId = activeSession?.role === "parent" && children.some((child) => child.id === storage.activeChildId && child.parentId === activeSession.parentId)
    ? storage.activeChildId ?? null
    : null;

  return {
    adminAccount: storage.adminAccount ?? createDefaultAdmin(),
    parentAccounts,
    activeSession,
    activeChildId,
    children,
    practiceRecords,
    puzzleBank,
    schemaVersion: Math.max(storage.schemaVersion ?? 0, SYNC_SCHEMA_VERSION),
    revision: storage.revision ?? 0,
    syncTombstones
  };
};

const isSessionValid = (session: AuthSession, parentAccounts: ParentAccount[]): boolean => {
  if (session.role === "admin") return session.username === "admin";
  if (!session.parentId) return false;
  const parent = parentAccounts.find((item) => item.id === session.parentId);
  return Boolean(parent && parent.status === "enabled");
};

export const getAppStorage = (): AppStorage => {
  try {
    const raw = getRawStorageItem(APP_STORAGE_KEY);
    if (!raw) return defaultStorage();
    const parsed = JSON.parse(raw);
    if (!isStorageLike(parsed)) return defaultStorage();
    const normalized = normalizeStorage(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      setRawStorageItem(APP_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return defaultStorage();
  }
};

export const saveAppStorage = (storage: AppStorage): void => {
  const normalized = normalizeStorage(storage);
  setRawStorageItem(APP_STORAGE_KEY, JSON.stringify(normalized));
  requestStorageSync();
};

const saveCloudStorage = (storage: AppStorage): void => {
  setRawStorageItem(APP_STORAGE_KEY, JSON.stringify(normalizeStorage(storage)));
};

const preserveLocalRuntimeState = (storage: AppStorage, local: AppStorage): AppStorage => {
  const activeChildId = local.activeChildId && storage.children.some((child) => child.id === local.activeChildId)
    ? local.activeChildId
    : null;
  return normalizeStorage({
    ...storage,
    activeSession: local.activeSession,
    activeChildId
  });
};

const isBrowserOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export const synchronizeAppStorage = async (): Promise<AppStorage> => {
  if (!isCloudAccountEnabled() || !hasCloudSession()) return getAppStorage();
  if (syncInFlight) {
    syncQueued = true;
    return syncInFlight;
  }
  if (isBrowserOffline()) {
    const state = { ...getStorageSyncState(), status: "pending" as const, message: "等待联网同步" };
    setStorageSyncState(state);
    throw new Error("当前处于离线状态");
  }

  syncQueued = false;
  setStorageSyncState({ ...getStorageSyncState(), status: "syncing", message: "正在同步数据…" });
  syncInFlight = (async () => {
    const localBeforePull = getAppStorage();
    const cloud = await pullCloudStorage();
    const mergedForUpload = preserveLocalRuntimeState(mergeAppStorage(localBeforePull, cloud), localBeforePull);
    const authoritative = await syncCloudStorage(mergedForUpload);
    const localAfterUpload = getAppStorage();
    const finalStorage = preserveLocalRuntimeState(
      mergeAppStorage(mergeAppStorage(mergedForUpload, authoritative), localAfterUpload),
      localAfterUpload
    );
    saveCloudStorage(finalStorage);
    setStorageSyncState({ status: "synced", lastSyncedAt: nowIso(), message: "已同步" });
    return finalStorage;
  })().catch((error) => {
    setStorageSyncState({
      ...getStorageSyncState(),
      status: isBrowserOffline() ? "pending" : "error",
      message: isBrowserOffline() ? "等待联网同步" : "同步失败，点击重试"
    });
    throw error;
  }).finally(() => {
    syncInFlight = null;
    if (syncQueued) requestStorageSync();
  });
  return syncInFlight;
};

export const requestStorageSync = (): void => {
  if (!isCloudAccountEnabled() || !hasCloudSession()) return;
  syncQueued = true;
  setStorageSyncState({
    ...getStorageSyncState(),
    status: "pending",
    message: isBrowserOffline() ? "等待联网同步" : "等待同步"
  });
  if (syncScheduled || syncInFlight) return;
  syncScheduled = true;
  queueMicrotask(() => {
    syncScheduled = false;
    if (!syncQueued) return;
    void synchronizeAppStorage().catch(() => undefined);
  });
};

const mutateStorage = (updater: (storage: AppStorage) => AppStorage): AppStorage => {
  const next = normalizeStorage(updater(getAppStorage()));
  saveAppStorage(next);
  return next;
};

export const hashPassword = async (password: string): Promise<string> => {
  return sha256(password);
};

export const initDefaultAdminIfNeeded = async (): Promise<AdminAccount> => {
  const raw = getRawStorageItem(APP_STORAGE_KEY);
  const storage = getAppStorage();
  if (!raw) saveAppStorage(storage);
  return storage.adminAccount;
};

export const getAdminAccount = (): AdminAccount => getAppStorage().adminAccount;

export const loginAdmin = async (username: string, password: string): Promise<AuthSession> => {
  const storage = getAppStorage();
  if (isCloudAccountEnabled()) {
    const result = await loginCloudAdmin(username, password, storage);
    const session: AuthSession = { role: "admin", username: username.trim(), loggedInAt: nowIso() };
    saveCloudStorage({ ...result.storage, activeSession: session, activeChildId: null });
    return session;
  }
  const admin = storage.adminAccount;
  if (username.trim() !== admin.username) throw new Error("管理员账号不存在");
  if ((await hashPassword(password)) !== admin.passwordHash) throw new Error("管理员密码错误");
  const session: AuthSession = { role: "admin", username: admin.username, loggedInAt: nowIso() };
  saveAppStorage({ ...storage, activeSession: session, activeChildId: null });
  return session;
};

export const updateAdminPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
  if (newPassword.length < 6) throw new Error("密码至少 6 位");
  const storage = getAppStorage();
  if ((await hashPassword(oldPassword)) !== storage.adminAccount.passwordHash) throw new Error("原密码错误");
  const passwordHash = await hashPassword(newPassword);
  saveAppStorage({
    ...storage,
    adminAccount: { ...storage.adminAccount, passwordHash, updatedAt: nowIso() }
  });
};

export const logout = (): void => {
  logoutCloudSession();
  mutateStorage((storage) => ({ ...storage, activeSession: null, activeChildId: null }));
};

export const logoutParent = logout;

export const getCurrentSession = (): AuthSession | null => {
  const session = getAppStorage().activeSession;
  if (session && isCloudAccountEnabled() && !hasCloudSession(session.role)) return null;
  return session;
};

export const getParentAccounts = (): ParentAccount[] =>
  [...getAppStorage().parentAccounts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const validateParentInput = (input: ParentAccountInput, parentAccounts: ParentAccount[]): void => {
  if (!input.username.trim()) throw new Error("账号不能为空");
  if (!input.displayName.trim()) throw new Error("家长昵称不能为空");
  if (input.password.length < 6) throw new Error("密码至少 6 位");
  if (parentAccounts.some((parent) => parent.username === input.username.trim())) throw new Error("账号已存在");
};

export const createParentAccount = async (input: ParentAccountInput): Promise<ParentAccount> => {
  const storage = getAppStorage();
  validateParentInput(input, storage.parentAccounts);
  const timestamp = nowIso();
  const parent: ParentAccount = {
    id: createUuid(),
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    passwordHash: await hashPassword(input.password),
    status: input.enabled === false ? "disabled" : "enabled",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const nextStorage = { ...storage, parentAccounts: [...storage.parentAccounts, parent] };
  saveAppStorage(nextStorage);
  await synchronizeAppStorage();
  return parent;
};

export const updateParentAccount = (parentId: string, changes: ParentAccountUpdate): ParentAccount | null => {
  let updated: ParentAccount | null = null;
  mutateStorage((storage) => ({
    ...storage,
    parentAccounts: storage.parentAccounts.map((parent) => {
      if (parent.id !== parentId) return parent;
      updated = {
        ...parent,
        displayName: changes.displayName?.trim() || parent.displayName,
        status: changes.status ?? parent.status,
        updatedAt: nowIso()
      };
      return updated;
    }),
    activeSession:
      changes.status === "disabled" && storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId
        ? null
        : storage.activeSession,
    activeChildId:
      changes.status === "disabled" && storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId
        ? null
        : storage.activeChildId
  }));
  return updated;
};

export const disableParentAccount = (parentId: string): void => {
  updateParentAccount(parentId, { status: "disabled" });
};

export const enableParentAccount = (parentId: string): void => {
  updateParentAccount(parentId, { status: "enabled" });
};

export const resetParentPassword = async (parentId: string, newPassword: string): Promise<void> => {
  if (newPassword.length < 6) throw new Error("密码至少 6 位");
  const passwordHash = await hashPassword(newPassword);
  mutateStorage((storage) => ({
    ...storage,
    parentAccounts: storage.parentAccounts.map((parent) =>
      parent.id === parentId ? { ...parent, passwordHash, updatedAt: nowIso() } : parent
    )
  }));
  await synchronizeAppStorage();
};

export const clearParentData = (parentId: string): void => {
  const deletedAt = nowIso();
  mutateStorage((storage) => ({
    ...storage,
    activeSession: storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId ? null : storage.activeSession,
    activeChildId:
      storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId ? null : storage.activeChildId,
    parentAccounts: storage.parentAccounts.filter((parent) => parent.id !== parentId),
    children: storage.children.filter((child) => child.parentId !== parentId),
    practiceRecords: storage.practiceRecords.filter((record) => record.parentId !== parentId),
    puzzleBank: storage.puzzleBank.filter((puzzle) => puzzle.parentId !== parentId),
    syncTombstones: [
      ...(storage.syncTombstones ?? []),
      { entityType: "parent", id: parentId, parentId, deletedAt } satisfies SyncTombstone
    ]
  }));
};

export const deleteParentAccount = (parentId: string): void => {
  clearParentData(parentId);
};

export const loginParent = async (username: string, password: string): Promise<AuthSession> => {
  const storage = getAppStorage();
  if (isCloudAccountEnabled()) {
    const result = await loginCloudParent(username, password);
    const session = result.storage.activeSession;
    if (!session || session.role !== "parent") throw new Error("云端账号返回异常，请重试。");
    const parentId = session.parentId;
    if (!parentId) throw new Error("云端账号缺少家长标识，请重试。");
    const remappedLocal = remapAuthenticatedParent(storage, session.username, parentId);
    const merged = preserveLocalRuntimeState(
      mergeAppStorage(remappedLocal, result.storage),
      { ...remappedLocal, activeSession: session }
    );
    const loginStorage = { ...merged, activeSession: session };
    saveCloudStorage(loginStorage);
    try {
      const authoritative = await syncCloudStorage(loginStorage);
      saveCloudStorage(preserveLocalRuntimeState(mergeAppStorage(loginStorage, authoritative), loginStorage));
      setStorageSyncState({ status: "synced", lastSyncedAt: nowIso(), message: "已同步" });
    } catch {
      setStorageSyncState({ ...getStorageSyncState(), status: "pending", message: "等待同步" });
    }
    return session;
  }
  const parent = storage.parentAccounts.find((item) => item.username === username.trim());
  if (!parent) throw new Error("账号不存在，请联系管理者创建账号。");
  if (parent.status === "disabled") throw new Error("账号已停用，请联系管理者。");
  if ((await hashPassword(password)) !== parent.passwordHash) throw new Error("密码错误。");

  const session: AuthSession = { role: "parent", parentId: parent.id, username: parent.username, loggedInAt: nowIso() };
  saveAppStorage({
    ...storage,
    activeSession: session,
    activeChildId: null,
    parentAccounts: storage.parentAccounts.map((item) =>
      item.id === parent.id ? { ...item, lastLoginAt: session.loggedInAt, updatedAt: item.updatedAt } : item
    )
  });
  return session;
};

export const getCurrentParent = (): ParentAccount | null => {
  const storage = getAppStorage();
  if (isCloudAccountEnabled() && !hasCloudSession("parent")) return null;
  if (storage.activeSession?.role !== "parent" || !storage.activeSession.parentId) return null;
  return storage.parentAccounts.find((parent) => parent.id === storage.activeSession?.parentId && parent.status === "enabled") ?? null;
};

export const requireParentSession = (): ParentAccount => {
  const parent = getCurrentParent();
  if (!parent) throw new Error("请先登录家长账号");
  return parent;
};

export const updateCurrentParentPassword = async (oldPassword: string, newPassword: string): Promise<void> => {
  if (newPassword.length < 6) throw new Error("密码至少 6 位");
  const parent = requireParentSession();
  if ((await hashPassword(oldPassword)) !== parent.passwordHash) throw new Error("原密码错误");
  await resetParentPassword(parent.id, newPassword);
};

export const getChildrenByParent = (parentId: string): ChildProfile[] =>
  getAppStorage()
    .children.filter((child) => child.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const createChild = (parentId: string, input: ChildProfileInput): ChildProfile => {
  const existing = getChildrenByParent(parentId);
  if (existing.length >= 2) throw new Error("当前测试版每个家长账号最多创建 2 个学习账号。");
  const timestamp = nowIso();
  const childId = createUuid();
  const child: ChildProfile = {
    id: childId,
    parentId,
    name: input.name.trim(),
    gradeLevel: input.gradeLevel,
    avatar: input.avatar,
    createdAt: timestamp,
    updatedAt: timestamp,
    smartDifficultyEnabled: input.smartDifficultyEnabled ?? true,
    currentLevel: 1,
    abilityAssessmentStatus: "unassessed",
    guidanceUsage: { date: getBusinessDate(), freeUsed: 0, paidUsed: 0 },
    guidanceOperations: [],
    spentStars: 0,
    schemaVersion: SYNC_SCHEMA_VERSION,
    revision: 1,
    syncFieldUpdatedAt: {
      name: timestamp,
      gradeLevel: timestamp,
      avatar: timestamp,
      smartDifficultyEnabled: timestamp,
      settings: timestamp
    },
    adventureProgress: [{
      parentId,
      childId,
      level: 1,
      stageIndex: 1,
      bestStars: 0,
      completed: false,
      unlocked: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }],
    settings: {
      soundEnabled: false,
      immediateErrorFeedback: true,
      showTimer: true,
      practiceMode: defaultPracticeMode,
      successAnimationEnabled: true,
      reducedMotion: false
    }
  };
  mutateStorage((storage) => ({
    ...storage,
    activeChildId: storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId && !storage.activeChildId ? child.id : storage.activeChildId,
    children: [...storage.children, child]
  }));
  return child;
};

export const updateChild = (parentId: string, childId: string, changes: Partial<ChildProfile>): ChildProfile | null => {
  let updated: ChildProfile | null = null;
  const timestamp = nowIso();
  mutateStorage((storage) => ({
    ...storage,
    children: storage.children.map((child) => {
      if (child.id !== childId || child.parentId !== parentId) return child;
      const trackedFields = ["name", "gradeLevel", "avatar", "smartDifficultyEnabled", "settings"] as const;
      const changedFieldTimestamps = Object.fromEntries(
        trackedFields
          .filter((field) => Object.prototype.hasOwnProperty.call(changes, field))
          .map((field) => [field, timestamp])
      );
      updated = {
        ...child,
        ...changes,
        id: child.id,
        parentId: child.parentId,
        schemaVersion: SYNC_SCHEMA_VERSION,
        revision: (child.revision ?? 0) + 1,
        syncFieldUpdatedAt: { ...child.syncFieldUpdatedAt, ...changedFieldTimestamps },
        updatedAt: timestamp
      };
      return updated;
    })
  }));
  return updated;
};

export const consumeGuidance = async ({
  parentId,
  childId,
  puzzleId,
  operationId
}: {
  parentId: string;
  childId: string;
  puzzleId: string;
  operationId: string;
}): Promise<GuidanceConsumptionResult> => {
  const currentStorage = getAppStorage();
  const child = currentStorage.children.find((item) => item.parentId === parentId && item.id === childId);
  if (!child) throw new Error("孩子档案不存在，请返回后重试。");

  if (isCloudAccountEnabled() && hasCloudSession("parent")) {
    const cloudResult = await consumeCloudGuidance({ childId, puzzleId, operationId });
    const merged = preserveLocalRuntimeState(mergeAppStorage(currentStorage, cloudResult.storage), currentStorage);
    saveCloudStorage(merged);
    const mergedChild = merged.children.find((item) => item.parentId === parentId && item.id === childId);
    const operation = mergedChild?.guidanceOperations?.find((item) => item.id === operationId);
    if (!mergedChild || !operation) throw new Error("引导数据暂未同步，请重试。");
    return {
      status: cloudResult.status,
      child: mergedChild,
      operation,
      guidanceSource: operation.source
    };
  }

  const result = applyGuidanceConsumption({ child, puzzleId, operationId });
  if (result.status === "consumed") {
    mutateStorage((storage) => ({
      ...storage,
      children: storage.children.map((item) => item.parentId === parentId && item.id === childId ? result.child : item)
    }));
  }
  return result;
};

export const clearChildData = (parentId: string, childId: string): void => {
  const deletedAt = nowIso();
  mutateStorage((storage) => ({
    ...storage,
    activeChildId: storage.activeChildId === childId ? null : storage.activeChildId,
    children: storage.children.filter((child) => !(child.parentId === parentId && child.id === childId)),
    practiceRecords: storage.practiceRecords.filter((record) => !(record.parentId === parentId && record.childId === childId)),
    puzzleBank: storage.puzzleBank.filter((puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId)),
    syncTombstones: [
      ...(storage.syncTombstones ?? []),
      { entityType: "child", id: childId, parentId, childId, deletedAt } satisfies SyncTombstone
    ]
  }));
};

export const deleteChild = (parentId: string, childId: string): void => {
  clearChildData(parentId, childId);
};

export const setActiveChild = (childId: string | null): void => {
  mutateStorage((storage) => {
    if (!childId || storage.activeSession?.role !== "parent") return { ...storage, activeChildId: null };
    const valid = storage.children.some((child) => child.id === childId && child.parentId === storage.activeSession?.parentId);
    return { ...storage, activeChildId: valid ? childId : null };
  });
};

export const getActiveChild = (): ChildProfile | null => {
  const storage = getAppStorage();
  if (storage.activeSession?.role !== "parent" || !storage.activeSession.parentId) return null;
  return storage.children.find((child) => child.id === storage.activeChildId && child.parentId === storage.activeSession?.parentId) ?? null;
};

export const getPuzzlesByChild = (parentId: string, childId: string): SudokuPuzzleItem[] =>
  getAppStorage()
    .puzzleBank.filter((puzzle) => puzzle.parentId === parentId && puzzle.childId === childId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const addPuzzleToBank = (puzzle: SudokuPuzzleItem): void => {
  const normalized = normalizePuzzle(puzzle);
  mutateStorage((storage) => ({
    ...storage,
    puzzleBank: [...storage.puzzleBank.filter((item) => item.id !== normalized.id), normalized]
  }));
};

export const deletePuzzle = (parentId: string, childId: string, puzzleId: string): void => {
  const deletedAt = nowIso();
  mutateStorage((storage) => ({
    ...storage,
    puzzleBank: storage.puzzleBank.filter(
      (puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId && puzzle.id === puzzleId)
    ),
    syncTombstones: [
      ...(storage.syncTombstones ?? []),
      { entityType: "puzzle", id: puzzleId, parentId, childId, deletedAt } satisfies SyncTombstone
    ]
  }));
};

export const clearChildPuzzleBank = (parentId: string, childId: string): void => {
  const deletedAt = nowIso();
  mutateStorage((storage) => {
    const deleted = storage.puzzleBank.filter((puzzle) => puzzle.parentId === parentId && puzzle.childId === childId);
    return {
      ...storage,
      puzzleBank: storage.puzzleBank.filter((puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId)),
      syncTombstones: [
        ...(storage.syncTombstones ?? []),
        ...deleted.map((puzzle) => ({ entityType: "puzzle" as const, id: puzzle.id, parentId, childId, deletedAt }))
      ]
    };
  });
};

export const getPracticeRecordsByChild = (parentId: string, childId: string): PracticeRecord[] =>
  getAppStorage()
    .practiceRecords.filter((record) => record.parentId === parentId && record.childId === childId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export const getPracticeRecordsByParent = (parentId: string): PracticeRecord[] =>
  getAppStorage()
    .practiceRecords.filter((record) => record.parentId === parentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export const addPracticeRecord = (record: PracticeRecord): void => {
  const normalized = normalizeRecord(record);
  mutateStorage((storage) => ({
    ...storage,
    practiceRecords: [...storage.practiceRecords.filter((item) => item.id !== normalized.id), normalized]
  }));
};
