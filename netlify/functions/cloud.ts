import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import type { AppStorage, AuthSession, ParentAccount } from "../../src/types";

const STORAGE_KEY = "storage/global";
const SESSION_PREFIX = "sessions/";
const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const allowedOrigins = new Set([
  "https://loewe0330.github.io",
  "https://kids-sudoku-adventure-cloud.netlify.app"
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
    puzzleBank: []
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
    puzzleBank: Array.isArray(candidate.puzzleBank) ? candidate.puzzleBank : fallback.puzzleBank
  };
};

const scopedStorage = (storage: AppStorage, parent: ParentAccount, session: AuthSession): AppStorage => ({
  ...storage,
  parentAccounts: [parent],
  activeSession: session,
  activeChildId: null,
  children: storage.children.filter((child) => child.parentId === parent.id),
  practiceRecords: storage.practiceRecords.filter((record) => record.parentId === parent.id),
  puzzleBank: storage.puzzleBank.filter((puzzle) => puzzle.parentId === parent.id)
});

const corsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : "";
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

    if (storage.parentAccounts.length === 0 && body.seedStorage) {
      const seed = sanitizeStorage(body.seedStorage, storage);
      if (seed.adminAccount.passwordHash === storage.adminAccount.passwordHash) {
        storage = { ...seed, activeSession: null, activeChildId: null };
        await store.setJSON(STORAGE_KEY, storage);
      }
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
    return json(request, { token, storage: scopedStorage(storage, updatedParent, session) });
  }

  if (body.action === "logout") {
    if (typeof body.token === "string") await store.delete(`${SESSION_PREFIX}${body.token}`);
    return json(request, { ok: true });
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
    if (session.role === "admin") {
      storage = { ...incoming, activeSession: null, activeChildId: null };
    } else if (session.parentId) {
      const parentId = session.parentId;
      const incomingParent = incoming.parentAccounts.find((item) => item.id === parentId);
      storage = {
        ...storage,
        parentAccounts: storage.parentAccounts.map((item) => item.id === parentId && incomingParent ? incomingParent : item),
        children: [...storage.children.filter((item) => item.parentId !== parentId), ...incoming.children.filter((item) => item.parentId === parentId)],
        practiceRecords: [...storage.practiceRecords.filter((item) => item.parentId !== parentId), ...incoming.practiceRecords.filter((item) => item.parentId === parentId)],
        puzzleBank: [...storage.puzzleBank.filter((item) => item.parentId !== parentId), ...incoming.puzzleBank.filter((item) => item.parentId === parentId)]
      };
    }
    await store.setJSON(STORAGE_KEY, storage);
    return json(request, { ok: true });
  }

  return json(request, { message: "未知操作" }, 400);
};

export const config: Config = { path: "/api/cloud" };
