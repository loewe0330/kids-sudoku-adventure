import { gradeDefaultLevels } from "../constants/difficultyLevels";
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
  SudokuPuzzleItem
} from "../types";
import { getRawStorageItem, setRawStorageItem } from "../platform/web/webStorageAdapter";
import { nowIso } from "./time";

const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const defaultPracticeMode: PracticeMode = "adventure";

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
  puzzleBank: []
});

const isStorageLike = (value: unknown): value is Partial<AppStorage> => {
  if (!value || typeof value !== "object") return false;
  const storage = value as Partial<AppStorage>;
  return Array.isArray(storage.children) && Array.isArray(storage.practiceRecords) && Array.isArray(storage.puzzleBank);
};

const normalizeChild = (child: ChildProfile): ChildProfile => {
  const fallbackTimestamp = child.updatedAt ?? child.createdAt ?? nowIso();
  return {
    ...child,
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
      : []
  };
};

const normalizeRecord = (record: PracticeRecord): PracticeRecord => ({
  ...record,
  stars: record.stars ?? 0,
  mode: record.mode ?? "practice",
  source: record.source ?? ((record.mode ?? "practice") === "adventure" ? "challenge" : "smart")
});

const normalizeStorage = (storage: Partial<AppStorage>): AppStorage => {
  const parentAccounts = Array.isArray(storage.parentAccounts) ? storage.parentAccounts : [];
  const children = Array.isArray(storage.children) ? storage.children.filter((child) => Boolean(child.parentId)).map(normalizeChild) : [];
  const practiceRecords = Array.isArray(storage.practiceRecords)
    ? storage.practiceRecords.filter((record) => Boolean(record.parentId) && Boolean(record.childId)).map(normalizeRecord)
    : [];
  const puzzleBank = Array.isArray(storage.puzzleBank)
    ? storage.puzzleBank.filter((puzzle) => Boolean(puzzle.parentId) && Boolean(puzzle.childId))
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
    puzzleBank
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
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) saveAppStorage(normalized);
    return normalized;
  } catch {
    return defaultStorage();
  }
};

export const saveAppStorage = (storage: AppStorage): void => {
  setRawStorageItem(APP_STORAGE_KEY, JSON.stringify(normalizeStorage(storage)));
};

const mutateStorage = (updater: (storage: AppStorage) => AppStorage): AppStorage => {
  const next = normalizeStorage(updater(getAppStorage()));
  saveAppStorage(next);
  return next;
};

export const hashPassword = async (password: string): Promise<string> => {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  mutateStorage((storage) => ({ ...storage, activeSession: null, activeChildId: null }));
};

export const logoutParent = logout;

export const getCurrentSession = (): AuthSession | null => getAppStorage().activeSession;

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
    id: crypto.randomUUID(),
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    passwordHash: await hashPassword(input.password),
    status: input.enabled === false ? "disabled" : "enabled",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  saveAppStorage({ ...storage, parentAccounts: [...storage.parentAccounts, parent] });
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
};

export const clearParentData = (parentId: string): void => {
  mutateStorage((storage) => ({
    ...storage,
    activeSession: storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId ? null : storage.activeSession,
    activeChildId:
      storage.activeSession?.role === "parent" && storage.activeSession.parentId === parentId ? null : storage.activeChildId,
    parentAccounts: storage.parentAccounts.filter((parent) => parent.id !== parentId),
    children: storage.children.filter((child) => child.parentId !== parentId),
    practiceRecords: storage.practiceRecords.filter((record) => record.parentId !== parentId),
    puzzleBank: storage.puzzleBank.filter((puzzle) => puzzle.parentId !== parentId)
  }));
};

export const deleteParentAccount = (parentId: string): void => {
  clearParentData(parentId);
};

export const loginParent = async (username: string, password: string): Promise<AuthSession> => {
  const storage = getAppStorage();
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
  const child: ChildProfile = {
    id: crypto.randomUUID(),
    parentId,
    name: input.name.trim(),
    gradeLevel: input.gradeLevel,
    avatar: input.avatar,
    createdAt: timestamp,
    updatedAt: timestamp,
    smartDifficultyEnabled: input.smartDifficultyEnabled,
    currentLevel: gradeDefaultLevels[input.gradeLevel],
    adventureProgress: [],
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
  mutateStorage((storage) => ({
    ...storage,
    children: storage.children.map((child) => {
      if (child.id !== childId || child.parentId !== parentId) return child;
      updated = { ...child, ...changes, id: child.id, parentId: child.parentId, updatedAt: nowIso() };
      return updated;
    })
  }));
  return updated;
};

export const clearChildData = (parentId: string, childId: string): void => {
  mutateStorage((storage) => ({
    ...storage,
    activeChildId: storage.activeChildId === childId ? null : storage.activeChildId,
    children: storage.children.filter((child) => !(child.parentId === parentId && child.id === childId)),
    practiceRecords: storage.practiceRecords.filter((record) => !(record.parentId === parentId && record.childId === childId)),
    puzzleBank: storage.puzzleBank.filter((puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId))
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
  mutateStorage((storage) => ({ ...storage, puzzleBank: [...storage.puzzleBank, puzzle] }));
};

export const deletePuzzle = (parentId: string, childId: string, puzzleId: string): void => {
  mutateStorage((storage) => ({
    ...storage,
    puzzleBank: storage.puzzleBank.filter(
      (puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId && puzzle.id === puzzleId)
    )
  }));
};

export const clearChildPuzzleBank = (parentId: string, childId: string): void => {
  mutateStorage((storage) => ({
    ...storage,
    puzzleBank: storage.puzzleBank.filter((puzzle) => !(puzzle.parentId === parentId && puzzle.childId === childId))
  }));
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
  mutateStorage((storage) => ({ ...storage, practiceRecords: [...storage.practiceRecords, normalizeRecord(record)] }));
};
