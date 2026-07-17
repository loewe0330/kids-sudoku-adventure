import { getRawStorageItem, setRawStorageItem } from "../platform/web/webStorageAdapter";

export interface ChildUiPreferences {
  eyeCare: boolean;
  vibration: boolean;
  reminder: boolean;
}

const defaults: ChildUiPreferences = { eyeCare: false, vibration: true, reminder: false };
const keyFor = (childId: string) => `kids-sudoku-ui-preferences:${childId}:v1`;

export const getChildUiPreferences = (childId: string): ChildUiPreferences => {
  const raw = getRawStorageItem(keyFor(childId));
  if (!raw) return defaults;
  try {
    return { ...defaults, ...JSON.parse(raw) as Partial<ChildUiPreferences> };
  } catch {
    return defaults;
  }
};

export const setChildUiPreferences = (childId: string, value: ChildUiPreferences): void => {
  setRawStorageItem(keyFor(childId), JSON.stringify(value));
};
