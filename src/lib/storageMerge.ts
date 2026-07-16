import { evaluateNextLevel } from "./adaptiveDifficulty";
import { getAbilityAssessmentStatus } from "./ability";
import { mergeGuidanceData } from "./guidance";
import type {
  AdventureStageProgress,
  AppStorage,
  ChildProfile,
  ChildSyncField,
  FastPassAttempt,
  FastPassState,
  ParentAccount,
  PracticeRecord,
  SudokuPuzzleItem,
  SyncTombstone
} from "../types";

export const SYNC_SCHEMA_VERSION = 4;

type TimestampedEntity = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  deletedAt?: string;
};

const entityTimestamp = (entity: Omit<TimestampedEntity, "id">): string =>
  entity.deletedAt ?? entity.updatedAt ?? entity.finishedAt ?? entity.createdAt ?? "";

const latestTimestamp = (...values: Array<string | undefined>): string | undefined => {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted[sorted.length - 1];
};

const newerEntity = <T extends TimestampedEntity>(left: T, right: T): T =>
  entityTimestamp(right) >= entityTimestamp(left) ? right : left;

const mergeEntities = <T extends TimestampedEntity>(left: T[], right: T[]): T[] => {
  const merged = new Map<string, T>();
  [...left, ...right].forEach((entity) => {
    const existing = merged.get(entity.id);
    merged.set(entity.id, existing ? newerEntity(existing, entity) : entity);
  });
  return Array.from(merged.values());
};

const stageKey = (stage: AdventureStageProgress): string => `${stage.level}:${stage.stageIndex}`;

const mergeAdventureProgress = (
  left: AdventureStageProgress[],
  right: AdventureStageProgress[]
): AdventureStageProgress[] => {
  const merged = new Map<string, AdventureStageProgress>();
  [...left, ...right].forEach((stage) => {
    const key = stageKey(stage);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, stage);
      return;
    }
    const newer = stage.updatedAt >= existing.updatedAt ? stage : existing;
    merged.set(key, {
      ...newer,
      parentId: existing.parentId,
      childId: existing.childId,
      bestStars: Math.max(existing.bestStars, stage.bestStars),
      completed: existing.completed || stage.completed,
      unlocked: existing.unlocked || stage.unlocked,
      createdAt: [existing.createdAt, stage.createdAt].filter(Boolean).sort()[0],
      updatedAt: latestTimestamp(existing.updatedAt, stage.updatedAt) ?? newer.updatedAt
    });
  });
  return Array.from(merged.values()).sort((a, b) => a.level - b.level || a.stageIndex - b.stageIndex);
};

const mergeFastPass = (left?: FastPassState, right?: FastPassState): FastPassState | undefined => {
  if (!left) return right;
  if (!right) return left;
  const attempts = mergeEntities<FastPassAttempt>(left.attempts, right.attempts)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return {
    attempts,
    highestPassedLevel: Math.max(left.highestPassedLevel ?? 0, right.highestPassedLevel ?? 0) || undefined,
    validatedSkipLevels: Array.from(new Set([
      ...(left.validatedSkipLevels ?? []),
      ...(right.validatedSkipLevels ?? [])
    ])).sort((a, b) => a - b),
    updatedAt: latestTimestamp(left.updatedAt, right.updatedAt, ...attempts.map((attempt) => attempt.updatedAt ?? attempt.finishedAt))
  };
};

const mergeChildPair = (left: ChildProfile, right: ChildProfile): ChildProfile => {
  const newer = right.updatedAt >= left.updatedAt ? right : left;
  const trackedFields: ChildSyncField[] = ["name", "gradeLevel", "avatar", "smartDifficultyEnabled", "settings"];
  const syncFieldUpdatedAt = Object.fromEntries(trackedFields.map((field) => {
    const leftTimestamp = left.syncFieldUpdatedAt?.[field] ?? left.updatedAt;
    const rightTimestamp = right.syncFieldUpdatedAt?.[field] ?? right.updatedAt;
    return [field, leftTimestamp >= rightTimestamp ? leftTimestamp : rightTimestamp];
  })) as Partial<Record<ChildSyncField, string>>;
  const mergedFields = Object.fromEntries(trackedFields.map((field) => {
    const leftTimestamp = left.syncFieldUpdatedAt?.[field] ?? left.updatedAt;
    const rightTimestamp = right.syncFieldUpdatedAt?.[field] ?? right.updatedAt;
    return [field, rightTimestamp >= leftTimestamp ? right[field] : left[field]];
  })) as Pick<ChildProfile, ChildSyncField>;
  return {
    ...newer,
    ...mergedFields,
    ...mergeGuidanceData(left, right),
    id: left.id,
    parentId: left.parentId,
    createdAt: [left.createdAt, right.createdAt].filter(Boolean).sort()[0] ?? newer.createdAt,
    updatedAt: latestTimestamp(left.updatedAt, right.updatedAt) ?? newer.updatedAt,
    adventureProgress: mergeAdventureProgress(left.adventureProgress ?? [], right.adventureProgress ?? []),
    fastPass: mergeFastPass(left.fastPass, right.fastPass),
    schemaVersion: Math.max(left.schemaVersion ?? 0, right.schemaVersion ?? 0, SYNC_SCHEMA_VERSION),
    revision: Math.max(left.revision ?? 0, right.revision ?? 0),
    syncFieldUpdatedAt
  };
};

const mergeChildren = (left: ChildProfile[], right: ChildProfile[]): ChildProfile[] => {
  const merged = new Map<string, ChildProfile>();
  [...left, ...right].forEach((child) => {
    const existing = merged.get(child.id);
    if (!existing) merged.set(child.id, child);
    else if (existing.parentId === child.parentId) merged.set(child.id, mergeChildPair(existing, child));
  });
  return Array.from(merged.values());
};

const mergeParents = (left: ParentAccount[], right: ParentAccount[]): ParentAccount[] => {
  const merged = new Map(left.map((parent) => [parent.id, parent]));
  right.forEach((parent) => {
    const existing = merged.get(parent.id);
    if (!existing) merged.set(parent.id, parent);
    else {
      const newer = parent.updatedAt >= existing.updatedAt ? parent : existing;
      merged.set(parent.id, {
        ...newer,
        id: existing.id,
        lastLoginAt: latestTimestamp(existing.lastLoginAt, parent.lastLoginAt)
      });
    }
  });
  return Array.from(merged.values());
};

const tombstoneKey = (tombstone: SyncTombstone): string =>
  `${tombstone.parentId}:${tombstone.entityType}:${tombstone.id}`;

const mergeTombstones = (left: SyncTombstone[], right: SyncTombstone[]): SyncTombstone[] => {
  const merged = new Map<string, SyncTombstone>();
  [...left, ...right].forEach((tombstone) => {
    const key = tombstoneKey(tombstone);
    const existing = merged.get(key);
    if (!existing || tombstone.deletedAt > existing.deletedAt) merged.set(key, tombstone);
  });
  return Array.from(merged.values());
};

const applyTombstones = ({
  children,
  practiceRecords,
  puzzleBank,
  tombstones
}: {
  children: ChildProfile[];
  practiceRecords: PracticeRecord[];
  puzzleBank: SudokuPuzzleItem[];
  tombstones: SyncTombstone[];
}) => {
  const childDeletes = new Set(tombstones.filter((item) => item.entityType === "child").map((item) => `${item.parentId}:${item.id}`));
  const recordDeletes = new Set(tombstones.filter((item) => item.entityType === "practiceRecord").map((item) => `${item.parentId}:${item.id}`));
  const puzzleDeletes = new Set(tombstones.filter((item) => item.entityType === "puzzle").map((item) => `${item.parentId}:${item.id}`));
  const activeChildren = children.filter((child) => !childDeletes.has(`${child.parentId}:${child.id}`));
  const childIds = new Set(activeChildren.map((child) => `${child.parentId}:${child.id}`));
  return {
    children: activeChildren,
    practiceRecords: practiceRecords.filter((record) =>
      childIds.has(`${record.parentId}:${record.childId}`) && !recordDeletes.has(`${record.parentId}:${record.id}`)
    ),
    puzzleBank: puzzleBank.filter((puzzle) =>
      childIds.has(`${puzzle.parentId}:${puzzle.childId}`) && !puzzleDeletes.has(`${puzzle.parentId}:${puzzle.id}`)
    )
  };
};

const deriveAbility = (child: ChildProfile, records: PracticeRecord[]): ChildProfile => {
  const childRecords = records.filter((record) => record.parentId === child.parentId && record.childId === child.id);
  const eligible = childRecords
    .filter((record) => record.mode === "adventure" || record.source === "smart")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const currentLevel = eligible.length > 0
    ? evaluateNextLevel(childRecords, eligible[0].level, child.smartDifficultyEnabled).nextLevel
    : child.currentLevel;
  return {
    ...child,
    currentLevel,
    abilityAssessmentStatus: getAbilityAssessmentStatus(child, childRecords)
  };
};

export const mergeAppStorage = (left: AppStorage, right: AppStorage): AppStorage => {
  const tombstones = mergeTombstones(left.syncTombstones ?? [], right.syncTombstones ?? []);
  const mergedEntities = applyTombstones({
    children: mergeChildren(left.children, right.children),
    practiceRecords: mergeEntities(left.practiceRecords, right.practiceRecords),
    puzzleBank: mergeEntities(left.puzzleBank, right.puzzleBank),
    tombstones
  });
  const children = mergedEntities.children.map((child) => deriveAbility(child, mergedEntities.practiceRecords));
  const activeChildId = [left.activeChildId, right.activeChildId]
    .find((id) => Boolean(id && children.some((child) => child.id === id))) ?? null;
  return {
    adminAccount: left.adminAccount.updatedAt >= right.adminAccount.updatedAt ? left.adminAccount : right.adminAccount,
    parentAccounts: mergeParents(left.parentAccounts, right.parentAccounts),
    activeSession: left.activeSession ?? right.activeSession,
    activeChildId,
    children,
    practiceRecords: mergedEntities.practiceRecords,
    puzzleBank: mergedEntities.puzzleBank,
    schemaVersion: Math.max(left.schemaVersion ?? 0, right.schemaVersion ?? 0, SYNC_SCHEMA_VERSION),
    revision: Math.max(left.revision ?? 0, right.revision ?? 0),
    syncTombstones: tombstones
  };
};

export const remapAuthenticatedParent = (
  storage: AppStorage,
  username: string,
  cloudParentId: string
): AppStorage => {
  const localParent = storage.parentAccounts.find((parent) => parent.username === username);
  if (!localParent || localParent.id === cloudParentId) return storage;
  const remapParentId = (parentId: string) => parentId === localParent.id ? cloudParentId : parentId;
  return {
    ...storage,
    parentAccounts: storage.parentAccounts.map((parent) =>
      parent.id === localParent.id ? { ...parent, id: cloudParentId } : parent
    ),
    children: storage.children.map((child) => child.parentId === localParent.id ? {
      ...child,
      parentId: cloudParentId,
      adventureProgress: child.adventureProgress.map((stage) => ({ ...stage, parentId: cloudParentId }))
    } : child),
    practiceRecords: storage.practiceRecords.map((record) => ({ ...record, parentId: remapParentId(record.parentId) })),
    puzzleBank: storage.puzzleBank.map((puzzle) => ({ ...puzzle, parentId: remapParentId(puzzle.parentId) })),
    syncTombstones: (storage.syncTombstones ?? []).map((item) => ({ ...item, parentId: remapParentId(item.parentId) }))
  };
};
