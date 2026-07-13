import type { StorageAdapter } from "../adapters/storageAdapter";

const getLocalStorage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const getRawStorageItem = (key: string): string | null => getLocalStorage()?.getItem(key) ?? null;

export const setRawStorageItem = (key: string, value: string): void => {
  getLocalStorage()?.setItem(key, value);
};

export const createWebStorageAdapter = (): StorageAdapter => ({
  async getItem<T>(key: string, fallback: T): Promise<T> {
    const raw = getRawStorageItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      setRawStorageItem(key, JSON.stringify(fallback));
      return fallback;
    }
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    setRawStorageItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    getLocalStorage()?.removeItem(key);
  },
  async clear(): Promise<void> {
    getLocalStorage()?.clear();
  }
});

export const webStorageAdapter = createWebStorageAdapter();
