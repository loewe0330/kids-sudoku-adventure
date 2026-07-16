import type { AppStorage, AuthSession, ParentAccount } from "../../src/types";
import { mergeAppStorage, SYNC_SCHEMA_VERSION } from "../../src/lib/storageMerge";

export const scopeStorageForParent = (
  storage: AppStorage,
  parent: ParentAccount,
  session: AuthSession
): AppStorage => ({
  ...storage,
  parentAccounts: [parent],
  activeSession: session,
  activeChildId: null,
  children: storage.children.filter((child) => child.parentId === parent.id),
  practiceRecords: storage.practiceRecords.filter((record) => record.parentId === parent.id),
  puzzleBank: storage.puzzleBank.filter((puzzle) => puzzle.parentId === parent.id),
  syncTombstones: (storage.syncTombstones ?? []).filter((item) => item.parentId === parent.id)
});

export const scopeIncomingStorageForParent = (
  storage: AppStorage,
  incoming: AppStorage,
  parentId: string
): AppStorage => {
  const foreignChildIds = new Set(storage.children.filter((child) => child.parentId !== parentId).map((child) => child.id));
  const children = incoming.children.filter((child) => child.parentId === parentId && !foreignChildIds.has(child.id));
  const allowedChildIds = new Set([
    ...storage.children.filter((child) => child.parentId === parentId).map((child) => child.id),
    ...children.map((child) => child.id)
  ]);
  const belongsToOwnedChild = (entity: { parentId: string; childId: string }) =>
    entity.parentId === parentId && allowedChildIds.has(entity.childId);
  return {
    ...incoming,
    adminAccount: storage.adminAccount,
    parentAccounts: incoming.parentAccounts.filter((parent) => parent.id === parentId),
    activeSession: null,
    activeChildId: null,
    children,
    practiceRecords: incoming.practiceRecords.filter(belongsToOwnedChild),
    puzzleBank: incoming.puzzleBank.filter(belongsToOwnedChild),
    syncTombstones: (incoming.syncTombstones ?? []).filter((item) =>
      item.parentId === parentId && (item.entityType === "child" ? allowedChildIds.has(item.id) : Boolean(item.childId && allowedChildIds.has(item.childId)))
    )
  };
};

const newerParent = (cloud: ParentAccount, seed: ParentAccount): ParentAccount => {
  const newer = seed.updatedAt > cloud.updatedAt ? seed : cloud;
  const loginTimes = [cloud.lastLoginAt, seed.lastLoginAt]
    .filter((value): value is string => Boolean(value))
    .sort();
  const lastLoginAt = loginTimes[loginTimes.length - 1];
  return { ...newer, id: cloud.id, lastLoginAt };
};

export const mergeCloudStorage = (cloud: AppStorage, seed: AppStorage): AppStorage => {
  const parentIdMap = new Map<string, string>();
  const parentAccounts = [...cloud.parentAccounts];

  seed.parentAccounts.forEach((seedParent) => {
    const existingIndex = parentAccounts.findIndex(
      (cloudParent) => cloudParent.id === seedParent.id || cloudParent.username === seedParent.username
    );
    if (existingIndex < 0) {
      parentAccounts.push(seedParent);
      parentIdMap.set(seedParent.id, seedParent.id);
      return;
    }

    const cloudParent = parentAccounts[existingIndex];
    parentIdMap.set(seedParent.id, cloudParent.id);
    parentAccounts[existingIndex] = newerParent(cloudParent, seedParent);
  });

  const remapParent = <T extends { parentId: string }>(entity: T): T => ({
    ...entity,
    parentId: parentIdMap.get(entity.parentId) ?? entity.parentId
  });

  const remappedSeed: AppStorage = {
    ...seed,
    parentAccounts,
    activeSession: null,
    activeChildId: null,
    children: seed.children.map((child) => ({
      ...remapParent(child),
      adventureProgress: child.adventureProgress.map((stage) => ({
        ...stage,
        parentId: parentIdMap.get(stage.parentId) ?? stage.parentId
      }))
    })),
    practiceRecords: seed.practiceRecords.map(remapParent),
    puzzleBank: seed.puzzleBank.map(remapParent),
    syncTombstones: (seed.syncTombstones ?? []).map((tombstone) => {
      const remapped = remapParent(tombstone);
      return remapped.entityType === "parent"
        ? { ...remapped, id: remapped.parentId }
        : remapped;
    }),
    schemaVersion: Math.max(seed.schemaVersion ?? 0, SYNC_SCHEMA_VERSION)
  };
  return { ...mergeAppStorage(cloud, remappedSeed), activeSession: null, activeChildId: null };
};
