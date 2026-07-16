import type { AppStorage, AuthSession } from "../types";
import { getRawStorageItem, setRawStorageItem } from "../platform/web/webStorageAdapter";

const CLOUD_SESSION_KEY = "kids-sudoku-cloud-session:v1";
const GITHUB_PAGES_API = "https://sudoku-explorer.netlify.app/api/cloud";

interface CloudSession {
  token: string;
  role: AuthSession["role"];
  parentId?: string;
}

interface CloudLoginResponse {
  token: string;
  storage: AppStorage;
}

interface CloudStorageResponse {
  storage: AppStorage;
}

interface CloudGuidanceResponse extends CloudStorageResponse {
  status: "consumed" | "duplicate";
}

export const resolveCloudApiUrl = (hostname: string, configured = ""): string => {
  if (configured) return configured;
  if (hostname === "loewe0330.github.io") return GITHUB_PAGES_API;
  if (hostname.endsWith("netlify.app")) return "/api/cloud";
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return GITHUB_PAGES_API;
  return "";
};

const getApiUrl = (): string => resolveCloudApiUrl(
  typeof window === "undefined" ? "" : window.location.hostname,
  import.meta.env.VITE_CLOUD_API_URL?.trim()
);

const parseCloudSession = (): CloudSession | null => {
  const raw = getRawStorageItem(CLOUD_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CloudSession>;
    if (!parsed.token || (parsed.role !== "admin" && parsed.role !== "parent")) return null;
    return parsed as CloudSession;
  } catch {
    return null;
  }
};

const requestCloud = async <T>(body: Record<string, unknown>): Promise<T> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("云端账号服务未配置");
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("暂时无法连接云端账号服务，请检查网络后重试。");
  }
  const payload = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(payload.message || "云端账号服务请求失败");
  return payload;
};

export const isCloudAccountEnabled = (): boolean => Boolean(getApiUrl());

export const hasCloudSession = (role?: AuthSession["role"]): boolean => {
  const session = parseCloudSession();
  return Boolean(session && (!role || session.role === role));
};

export const loginCloudAdmin = async (username: string, password: string, seedStorage: AppStorage): Promise<CloudLoginResponse> => {
  const result = await requestCloud<CloudLoginResponse>({ action: "adminLogin", username, password, seedStorage });
  setRawStorageItem(CLOUD_SESSION_KEY, JSON.stringify({ token: result.token, role: "admin" } satisfies CloudSession));
  return result;
};

export const loginCloudParent = async (username: string, password: string): Promise<CloudLoginResponse> => {
  const result = await requestCloud<CloudLoginResponse>({ action: "parentLogin", username, password });
  const parentId = result.storage.activeSession?.parentId;
  setRawStorageItem(CLOUD_SESSION_KEY, JSON.stringify({ token: result.token, role: "parent", parentId } satisfies CloudSession));
  return result;
};

export const pullCloudStorage = async (): Promise<AppStorage> => {
  const session = parseCloudSession();
  if (!session || !isCloudAccountEnabled()) throw new Error("尚未登录云端账号");
  const result = await requestCloud<CloudStorageResponse>({ action: "pull", token: session.token });
  return result.storage;
};

export const syncCloudStorage = async (storage: AppStorage): Promise<AppStorage> => {
  const session = parseCloudSession();
  if (!session || !isCloudAccountEnabled()) return storage;
  const result = await requestCloud<{ ok: true; storage: AppStorage }>({ action: "sync", token: session.token, storage });
  return result.storage;
};

export const consumeCloudGuidance = async ({
  childId,
  puzzleId,
  operationId
}: {
  childId: string;
  puzzleId: string;
  operationId: string;
}): Promise<CloudGuidanceResponse> => {
  const session = parseCloudSession();
  if (!session || session.role !== "parent" || !isCloudAccountEnabled()) throw new Error("尚未登录云端家长账号");
  return requestCloud<CloudGuidanceResponse>({
    action: "consumeGuidance",
    token: session.token,
    childId,
    puzzleId,
    operationId
  });
};

export const logoutCloudSession = (): void => {
  const session = parseCloudSession();
  setRawStorageItem(CLOUD_SESSION_KEY, "");
  if (session && isCloudAccountEnabled()) {
    void requestCloud({ action: "logout", token: session.token }).catch(() => undefined);
  }
};
