import type { AppStorage, ChildProfile, ParentAccount, PracticeRecord, SudokuPuzzleItem } from "../types";

export interface LocalRepository {
  getStorage(): AppStorage;
  saveStorage(storage: AppStorage): void;
  getChildren(parentId: string): ChildProfile[];
  getPracticeRecords(parentId: string, childId: string): PracticeRecord[];
  getPuzzles(parentId: string, childId: string): SudokuPuzzleItem[];
  getParents(): ParentAccount[];
}
