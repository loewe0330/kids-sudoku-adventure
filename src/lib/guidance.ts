import type {
  ChildProfile,
  GuidanceConsumptionOperation,
  GuidanceSource,
  GuidanceUsage
} from "../types";

export const DAILY_FREE_GUIDANCE_LIMIT = 3;
export const DAILY_PAID_GUIDANCE_LIMIT = 3;
export const GUIDANCE_STAR_COST = 1;
export const GUIDANCE_TIME_ZONE = "Asia/Shanghai";

export type GuidanceAvailability = "free" | "star" | "no-stars" | "daily-limit";

export interface GuidanceStatus {
  businessDate: string;
  usage: GuidanceUsage;
  totalEarnedStars: number;
  spentStars: number;
  availableStars: number;
  remainingFree: number;
  remainingPaid: number;
  availability: GuidanceAvailability;
}

export interface GuidanceConsumptionResult {
  status: "consumed" | "duplicate" | "already-used" | "no-stars" | "daily-limit";
  child: ChildProfile;
  operation?: GuidanceConsumptionOperation;
  guidanceSource?: GuidanceSource;
}

const safeCount = (value: number | undefined, limit?: number): number => {
  const count = Math.max(0, Math.floor(value ?? 0));
  return typeof limit === "number" ? Math.min(limit, count) : count;
};

export const getBusinessDate = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GUIDANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const normalizeGuidanceUsage = (
  usage: GuidanceUsage | undefined,
  businessDate = getBusinessDate()
): GuidanceUsage => usage?.date === businessDate
  ? {
    date: businessDate,
    freeUsed: safeCount(usage.freeUsed, DAILY_FREE_GUIDANCE_LIMIT),
    paidUsed: safeCount(usage.paidUsed, DAILY_PAID_GUIDANCE_LIMIT)
  }
  : { date: businessDate, freeUsed: 0, paidUsed: 0 };

export const getTotalEarnedStars = (child: Pick<ChildProfile, "adventureProgress">): number =>
  (child.adventureProgress ?? []).reduce((sum, stage) => sum + safeCount(stage.bestStars, 3), 0);

export const getAvailableStars = (child: Pick<ChildProfile, "adventureProgress" | "spentStars">): number =>
  Math.max(0, getTotalEarnedStars(child) - safeCount(child.spentStars));

export const normalizeGuidanceOperations = (
  operations: GuidanceConsumptionOperation[] | undefined
): GuidanceConsumptionOperation[] => {
  const byId = new Map<string, GuidanceConsumptionOperation>();
  (Array.isArray(operations) ? operations : []).forEach((operation) => {
    if (!operation?.id || !operation.puzzleId || !["free", "star"].includes(operation.source)) return;
    const existing = byId.get(operation.id);
    if (!existing || operation.createdAt < existing.createdAt) byId.set(operation.id, operation);
  });
  return Array.from(byId.values()).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const getGuidanceStatus = (
  child: Pick<ChildProfile, "adventureProgress" | "guidanceUsage" | "spentStars">,
  businessDate = getBusinessDate()
): GuidanceStatus => {
  const usage = normalizeGuidanceUsage(child.guidanceUsage, businessDate);
  const totalEarnedStars = getTotalEarnedStars(child);
  const spentStars = safeCount(child.spentStars);
  const availableStars = Math.max(0, totalEarnedStars - spentStars);
  const remainingFree = Math.max(0, DAILY_FREE_GUIDANCE_LIMIT - usage.freeUsed);
  const remainingPaid = Math.max(0, DAILY_PAID_GUIDANCE_LIMIT - usage.paidUsed);
  const availability: GuidanceAvailability = remainingFree > 0
    ? "free"
    : remainingPaid <= 0
      ? "daily-limit"
      : availableStars >= GUIDANCE_STAR_COST ? "star" : "no-stars";
  return {
    businessDate,
    usage,
    totalEarnedStars,
    spentStars,
    availableStars,
    remainingFree,
    remainingPaid,
    availability
  };
};

export const applyGuidanceConsumption = ({
  child,
  puzzleId,
  operationId,
  businessDate = getBusinessDate(),
  createdAt = new Date().toISOString()
}: {
  child: ChildProfile;
  puzzleId: string;
  operationId: string;
  businessDate?: string;
  createdAt?: string;
}): GuidanceConsumptionResult => {
  const operations = normalizeGuidanceOperations(child.guidanceOperations);
  const duplicate = operations.find((operation) => operation.id === operationId);
  if (duplicate) return { status: "duplicate", child, operation: duplicate, guidanceSource: duplicate.source };
  if (operations.some((operation) => operation.puzzleId === puzzleId)) return { status: "already-used", child };

  const guidance = getGuidanceStatus(child, businessDate);
  if (guidance.availability === "no-stars") return { status: "no-stars", child };
  if (guidance.availability === "daily-limit") return { status: "daily-limit", child };

  const source: GuidanceSource = guidance.availability;
  const operation: GuidanceConsumptionOperation = {
    id: operationId,
    puzzleId,
    source,
    businessDate,
    createdAt
  };
  const guidanceUsage: GuidanceUsage = {
    date: businessDate,
    freeUsed: guidance.usage.freeUsed + (source === "free" ? 1 : 0),
    paidUsed: guidance.usage.paidUsed + (source === "star" ? 1 : 0)
  };
  const nextChild: ChildProfile = {
    ...child,
    guidanceUsage,
    guidanceOperations: [...operations, operation],
    spentStars: guidance.spentStars + (source === "star" ? GUIDANCE_STAR_COST : 0),
    updatedAt: createdAt,
    revision: (child.revision ?? 0) + 1
  };
  return { status: "consumed", child: nextChild, operation, guidanceSource: source };
};

const countOperations = (
  operations: GuidanceConsumptionOperation[],
  source: GuidanceSource,
  businessDate?: string
): number => operations.filter((operation) =>
  operation.source === source && (!businessDate || operation.businessDate === businessDate)
).length;

export const mergeGuidanceData = (
  left: ChildProfile,
  right: ChildProfile,
  businessDate = getBusinessDate()
): Pick<ChildProfile, "guidanceUsage" | "guidanceOperations" | "spentStars"> => {
  const leftOperations = normalizeGuidanceOperations(left.guidanceOperations);
  const rightOperations = normalizeGuidanceOperations(right.guidanceOperations);
  const operations = normalizeGuidanceOperations([...leftOperations, ...rightOperations]);
  const leftUsage = normalizeGuidanceUsage(left.guidanceUsage, businessDate);
  const rightUsage = normalizeGuidanceUsage(right.guidanceUsage, businessDate);

  const mergeDailyCount = (source: GuidanceSource, field: "freeUsed" | "paidUsed", limit: number): number => {
    const leftOperationCount = countOperations(leftOperations, source, businessDate);
    const rightOperationCount = countOperations(rightOperations, source, businessDate);
    const mergedOperationCount = countOperations(operations, source, businessDate);
    const baseline = Math.max(
      0,
      leftUsage[field] - leftOperationCount,
      rightUsage[field] - rightOperationCount
    );
    return Math.min(limit, baseline + mergedOperationCount);
  };

  const leftPaidOperationCount = countOperations(leftOperations, "star");
  const rightPaidOperationCount = countOperations(rightOperations, "star");
  const spentBaseline = Math.max(
    0,
    safeCount(left.spentStars) - leftPaidOperationCount,
    safeCount(right.spentStars) - rightPaidOperationCount
  );

  return {
    guidanceUsage: {
      date: businessDate,
      freeUsed: mergeDailyCount("free", "freeUsed", DAILY_FREE_GUIDANCE_LIMIT),
      paidUsed: mergeDailyCount("star", "paidUsed", DAILY_PAID_GUIDANCE_LIMIT)
    },
    guidanceOperations: operations,
    spentStars: spentBaseline + countOperations(operations, "star")
  };
};
