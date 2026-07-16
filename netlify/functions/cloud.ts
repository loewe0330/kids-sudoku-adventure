import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import type { AppStorage, AuthSession } from "../../src/types";
import { mergeCloudStorage, scopeIncomingStorageForParent, scopeStorageForParent } from "./cloudStorageMerge";
import { mergeAppStorage, SYNC_SCHEMA_VERSION } from "../../src/lib/storageMerge";
import { applyGuidanceConsumption, getBusinessDate } from "../../src/lib/guidance";

const STORAGE_KEY = "storage/global";
const SESSION_PREFIX = "sessions/";
const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const allowedOrigins = new Set([
  "https://loewe0330.github.io",
  "https://kids-sudoku-adventure-cloud.netlify.app",
  "https://sudoku-explorer.netlify.app"
]);

interface CloudSessionRecord {
  role: AuthSession["role"];
  parentId?: string;
  username: string;
  expiresAt: string;
}

const nowIso = () => new Date().toISOString();

const defaultStorage = (): AppStorage => {
  const timestamp = nowIso();
  return {
    adminAccount: { username: "admin", passwordHash: DEFAULT_ADMIN_HASH, createdAt: timestamp, updatedAt: timestamp },
    parentAccounts: [],
    activeSession: null,
    activeChildId: null,
    children: [],
    practiceRecords: [],
    puzzleBank: [],
    schemaVersion: SYNC_SCHEMA_VERSION,
    revision: 0,
    syncTombstones: []
  };
};

const hashPassword = async (password: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sanitizeStorage = (value: unknown, fallback = defaultStorage()): AppStorage => {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<AppStorage>;
  return {
    adminAccount: candidate.adminAccount ?? fallback.adminAccount,
    parentAccounts: Array.isArray(candidate.parentAccounts) ? candidate.parentAccounts : fallback.parentAccounts,
    activeSession: null,
    activeChildId: null,
    children: Array.isArray(candidate.children) ? candidate.children : fallback.children,
    practiceRecords: Array.isArray(candidate.practiceRecords) ? candidate.practiceRecords : fallback.practiceRecords,
    puzzleBank: Array.isArray(candidate.puzzleBank) ? candidate.puzzleBank : fallback.puzzleBank,
    schemaVersion: Math.max(candidate.schemaVersion ?? 0, fallback.schemaVersion ?? 0, SYNC_SCHEMA_VERSION),
    revision: candidate.revision ?? fallback.revision ?? 0,
    syncTombstones: Array.isArray(candidate.syncTombstones) ? candidate.syncTombstones : fallback.syncTombstones ?? []
  };
};

const corsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get("origin") ?? "";
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isPrivateNetworkOrigin = /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);
  const allowedOrigin = allowedOrigins.has(origin) || isLocalOrigin || isPrivateNetworkOrigin ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin"
  };
};

const json = (request: Request, value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: corsHeaders(request) });

const createSession = async (role: AuthSession["role"], username: string, parentId?: string): Promise<string> => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await getStore({ name: "kids-sudoku-data", consistency: "strong" }).setJSON(`${SESSION_PREFIX}${token}`, {
    role,
    username,
    parentId,
    expiresAt
  } satisfies CloudSessionRecord);
  return token;
};

const getSession = async (token: unknown): Promise<CloudSessionRecord | null> => {
  if (typeof token !== "string" || !token) return null;
  const store = getStore({ name: "kids-sudoku-data", consistency: "strong" });
  const session = await store.get(`${SESSION_PREFIX}${token}`, { type: "json" }) as CloudSessionRecord | null;
  if (!session || session.expiresAt <= nowIso()) {
    if (session) await store.delete(`${SESSION_PREFIX}${token}`);
    return null;
  }
  return session;
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed" }, 405);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json(request, { message: "请求格式错误" }, 400);

  const store = getStore({ name: "kids-sudoku-data", consistency: "strong" });
  let storage = sanitizeStorage(await store.get(STORAGE_KEY, { type: "json" }));

  if (body.action === "adminLogin") {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (username !== storage.adminAccount.username) return json(request, { message: "管理员账号不存在" }, 401);
    if ((await hashPassword(password)) !== storage.adminAccount.passwordHash) return json(request, { message: "管理员密码错误" }, 401);

    if (body.seedStorage) {
      const seed = sanitizeStorage(body.seedStorage, storage);
      storage = mergeCloudStorage(storage, seed);
      storage = { ...storage, revision: (storage.revision ?? 0) + 1, schemaVersion: SYNC_SCHEMA_VERSION };
      await store.setJSON(STORAGE_KEY, storage);
    }
    const token = await createSession("admin", username);
    return json(request, { token, storage: { ...storage, activeSession: { role: "admin", username, loggedInAt: nowIso() } } });
  }

  if (body.action === "parentLogin") {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const parent = storage.parentAccounts.find((item) => item.username === username);
    if (!parent) return json(request, { message: "账号不存在，请联系管理者创建账号。" }, 401);
    if (parent.status === "disabled") return json(request, { message: "账号已停用，请联系管理者。" }, 403);
    if ((await hashPassword(password)) !== parent.passwordHash) return json(request, { message: "密码错误。" }, 401);

    const loggedInAt = nowIso();
    const updatedParent = { ...parent, lastLoginAt: loggedInAt };
    storage = { ...storage, parentAccounts: storage.parentAccounts.map((item) => item.id === parent.id ? updatedParent : item) };
    await store.setJSON(STORAGE_KEY, storage);
    const token = await createSession("parent", parent.username, parent.id);
    const session: AuthSession = { role: "parent", parentId: parent.id, username: parent.username, loggedInAt };
    return json(request, { token, storage: scopeStorageForParent(storage, updatedParent, session) });
  }

  if (body.action === "logout") {
    if (typeof body.token === "string") await store.delete(`${SESSION_PREFIX}${body.token}`);
    return json(request, { ok: true });
  }

  if (body.action === "pull") {
    const session = await getSession(body.token);
    if (!session) return json(request, { message: "登录已过期，请重新登录。" }, 401);
    if (session.role === "admin") return json(request, { storage });
    const parent = storage.parentAccounts.find((item) => item.id === session.parentId && item.status === "enabled");
    if (!parent) return json(request, { message: "账号不存在或已停用。" }, 403);
    const authSession: AuthSession = {
      role: "parent",
      parentId: parent.id,
      username: parent.username,
      loggedInAt: nowIso()
    };
    return json(request, { storage: scopeStorageForParent(storage, parent, authSession) });
  }

  if (body.action === "consumeGuidance") {
    const session = await getSession(body.token);
    if (!session || session.role !== "parent" || !session.parentId) {
      return json(request, { message: "需要家长账号登录" }, 401);
    }
    const childId = typeof body.childId === "string" ? body.childId : "";
    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId : "";
    const operationId = typeof body.operationId === "string" ? body.operationId : "";
    if (!childId || !puzzleId || !operationId) return json(request, { message: "引导消费参数不完整" }, 400);

    const latestStorage = sanitizeStorage(await store.get(STORAGE_KEY, { type: "json" }));
    const child = latestStorage.children.find((item) => item.parentId === session.parentId && item.id === childId);
    if (!child) return json(request, { message: "孩子档案不存在" }, 404);

    const result = applyGuidanceConsumption({
      child,
      puzzleId,
      operationId,
      businessDate: getBusinessDate(),
      createdAt: nowIso()
    });
    if (result.status === "already-used") return json(request, { message: "本题已经使用过解题引导" }, 409);
    if (result.status === "no-stars") return json(request, { message: "当前没有足够的可用星星" }, 409);
    if (result.status === "daily-limit") return json(request, { message: "今天的兑换次数已经用完" }, 409);

    storage = {
      ...latestStorage,
      children: latestStorage.children.map((item) =>
        item.parentId === session.parentId && item.id === childId ? result.child : item
      ),
      schemaVersion: SYNC_SCHEMA_VERSION,
      revision: (latestStorage.revision ?? 0) + 1
    };
    await store.setJSON(STORAGE_KEY, storage);
    const parent = storage.parentAccounts.find((item) => item.id === session.parentId && item.status === "enabled");
    if (!parent) return json(request, { message: "账号不存在或已停用。" }, 403);
    const authSession: AuthSession = {
      role: "parent",
      parentId: parent.id,
      username: parent.username,
      loggedInAt: nowIso()
    };
    return json(request, {
      status: result.status,
      storage: scopeStorageForParent(storage, parent, authSession)
    });
  }

  if (body.action === "crossDeviceSelfTest") {
    const session = await getSession(body.token);
    if (!session || session.role !== "admin") return json(request, { message: "需要管理员登录" }, 401);
    const verificationKey = `verification/${crypto.randomUUID()}`;
    const verificationPassword = crypto.randomUUID();
    const verificationAccount = {
      username: `verification-${crypto.randomUUID()}`,
      passwordHash: await hashPassword(verificationPassword)
    };
    try {
      await store.setJSON(verificationKey, verificationAccount);
      const accountFromAnotherDevice = await store.get(verificationKey, { type: "json" }) as typeof verificationAccount | null;
      const loginSucceeded = Boolean(
        accountFromAnotherDevice
        && accountFromAnotherDevice.username === verificationAccount.username
        && accountFromAnotherDevice.passwordHash === await hashPassword(verificationPassword)
      );
      return json(request, { ok: loginSucceeded, createdOn: "device-a", loggedInOn: "device-b" }, loginSucceeded ? 200 : 500);
    } finally {
      await store.delete(verificationKey);
    }
  }

  if (body.action === "sync") {
    const session = await getSession(body.token);
    if (!session) return json(request, { message: "登录已过期，请重新登录。" }, 401);
    const incoming = sanitizeStorage(body.storage, storage);
    const latestStorage = sanitizeStorage(await store.get(STORAGE_KEY, { type: "json" }));
    if (session.role === "admin") {
      storage = {
        ...mergeAppStorage(latestStorage, incoming),
        activeSession: null,
        activeChildId: null,
        schemaVersion: SYNC_SCHEMA_VERSION,
        revision: (latestStorage.revision ?? 0) + 1
      };
    } else if (session.parentId) {
      const parentId = session.parentId;
      const parent = latestStorage.parentAccounts.find((item) => item.id === parentId && item.status === "enabled");
      if (!parent) return json(request, { message: "账号不存在或已停用。" }, 403);
      const scopedIncoming = scopeIncomingStorageForParent(latestStorage, incoming, parentId);
      storage = mergeAppStorage(latestStorage, scopedIncoming);
      storage = {
        ...storage,
        activeSession: null,
        activeChildId: null,
        schemaVersion: SYNC_SCHEMA_VERSION,
        revision: (latestStorage.revision ?? 0) + 1
      };
    }
    await store.setJSON(STORAGE_KEY, storage);
    if (session.role === "parent" && session.parentId) {
      const parent = storage.parentAccounts.find((item) => item.id === session.parentId)!;
      const authSession: AuthSession = { role: "parent", parentId: parent.id, username: parent.username, loggedInAt: nowIso() };
      return json(request, { ok: true, storage: scopeStorageForParent(storage, parent, authSession) });
    }
    return json(request, { ok: true, storage });
  }

  return json(request, { message: "未知操作" }, 400);
};

export const config: Config = { path: "/api/cloud" };
