import type { Badge, DifficultyLevelConfig, PracticeRecord } from "../types";

export const calculateStars = (record: PracticeRecord, levelConfig: DifficultyLevelConfig): 0 | 1 | 2 | 3 => {
  if (record.gaveUp || !record.completed) return 0;
  if (record.mode === "adventure") {
    if (record.guidanceUsed) return 1;
    return (record.submissionCount ?? 1) <= 1 ? 3 : 2;
  }
  if (
    record.mistakeCount === 0 &&
    record.hintCount === 0 &&
    record.durationSeconds <= levelConfig.recommendedTimeSeconds
  ) {
    return 3;
  }
  if (record.mistakeCount <= 1 && record.hintCount <= 1) return 2;
  return 1;
};

export const getStarEvaluation = (stars: number): string => {
  if (stars >= 3) return "太棒了！你又快又准，获得 3 颗星！";
  if (stars === 2) return "完成得不错！再少用一次提示，就有机会拿到 3 星。";
  if (stars === 1) return "你坚持完成了这道题，这就是进步！";
  return "这题有点难，先看看答案也没关系，下次可以从提示开始试试。";
};

const latestFirst = (records: PracticeRecord[]): PracticeRecord[] =>
  [...records].sort((a, b) => (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt));

const earnedAt = (records: PracticeRecord[]): string | undefined => records[0]?.finishedAt ?? records[0]?.startedAt;

export const getEarnedBadges = (records: PracticeRecord[]): Badge[] => {
  const sorted = latestFirst(records);
  const recentThree = sorted.slice(0, 3);
  const badges: Badge[] = [];

  if (recentThree.length === 3 && recentThree.every((record) => record.completed && !record.gaveUp)) {
    badges.push({
      id: "practice-streak",
      name: "坚持练习星",
      description: "连续完成 3 题获得",
      earnedAt: earnedAt(recentThree)
    });
  }
  if (recentThree.length === 3 && recentThree.every((record) => record.completed && record.mistakeCount === 0)) {
    badges.push({
      id: "careful-observer",
      name: "细心观察星",
      description: "连续 3 题无错误获得",
      earnedAt: earnedAt(recentThree)
    });
  }
  if (recentThree.length === 3 && recentThree.every((record) => record.completed && record.hintCount === 0)) {
    badges.push({
      id: "independent-thinker",
      name: "独立思考星",
      description: "连续 3 题不用提示获得",
      earnedAt: earnedAt(recentThree)
    });
  }
  const latestChallenge = sorted.find((record) => record.completed && !record.gaveUp && record.mode === "challenge");
  if (latestChallenge) {
    badges.push({
      id: "challenge-courage",
      name: "挑战勇气星",
      description: "完成一题挑战模式获得",
      earnedAt: latestChallenge.finishedAt ?? latestChallenge.startedAt
    });
  }

  return badges;
};

export const getNewlyEarnedBadges = (previousRecords: PracticeRecord[], nextRecords: PracticeRecord[]): Badge[] => {
  const previousIds = new Set(getEarnedBadges(previousRecords).map((badge) => badge.id));
  return getEarnedBadges(nextRecords).filter((badge) => !previousIds.has(badge.id));
};

export const getTotalPracticeStars = (records: PracticeRecord[]): number =>
  records.reduce((sum, record) => sum + (record.stars ?? 0), 0);
