import {
  getAppStorage,
  getChildrenByParent,
  getParentAccounts,
  getPracticeRecordsByChild,
  getPuzzlesByChild,
  saveAppStorage
} from "../lib/storage";
import type { LocalRepository } from "./repositoryTypes";

export const localRepository: LocalRepository = {
  getStorage: getAppStorage,
  saveStorage: saveAppStorage,
  getChildren: getChildrenByParent,
  getPracticeRecords: getPracticeRecordsByChild,
  getPuzzles: getPuzzlesByChild,
  getParents: getParentAccounts
};
