import { describe, expect, test } from "vitest";
import { getAdventureFailureActionModel, getCompletionActionModel } from "../lib/completionActions";
import { updateAdventureProgress } from "../lib/adventure";
import type { AdventureStageProgress, ChildProfile } from "../types";

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 2,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "practice",
    successAnimationEnabled: false,
    reducedMotion: true
  }
};

const completeStage = (progress: AdventureStageProgress[], level: number, stageIndex: number, stars = 3) =>
  updateAdventureProgress(progress, {
    parentId: child.parentId,
    childId: child.id,
    level,
    stageIndex,
    stars,
    completedAt: `2026-01-${String(level).padStart(2, "0")}T00:00:0${stageIndex}.000Z`
  });

describe("completion action model", () => {
  test("uses a dedicated final-failure model for an adventure stage", () => {
    const model = getAdventureFailureActionModel({
      level: 2,
      stageIndex: 1,
      previousStars: 2,
      guidanceUsed: true,
      submitAttemptCount: 2
    });

    expect(model.title).toBe("本关暂未通过");
    expect(model.message).toEqual(["这次还差一点，", "可以重新挑战，或者先回到关卡地图。"]);
    expect(model.primaryAction).toEqual({ label: "重新挑战 L2-1", action: { type: "retry-stage", level: 2, stageIndex: 1 } });
    expect(model.secondaryAction).toEqual({ label: "返回 L2 关卡", action: { type: "return-level", level: 2 } });
    expect(model.tertiaryAction).toEqual({ label: "查看解题方法", action: { type: "view-method" } });
    expect(JSON.stringify(model)).not.toContain("再来一题");
    expect(JSON.stringify(model)).not.toContain("继续看看");
  });

  test("keeps free practice completion actions unchanged", () => {
    const model = getCompletionActionModel({ child, mode: "practice", level: 2, stars: 3, updatedProgress: [] });

    expect(model.context).toBe("free-practice");
    expect(model.primaryAction.label).toBe("再来一题");
    expect(model.secondaryAction.label).toBe("回到练习");
  });

  test("uses updated progress to continue from L2-1 to L2-2", () => {
    const updatedProgress = completeStage([], 2, 1, 3);
    const model = getCompletionActionModel({ child, mode: "adventure", level: 2, stageIndex: 1, stars: 3, updatedProgress });

    expect(model.context).toBe("adventure-stage");
    expect(model.title).toBe("挑战成功！");
    expect(model.summary).toEqual(["完成 L2-1", "获得 3 ★"]);
    expect(model.hint).toBe("已解锁下一关：L2-2");
    expect(model.primaryAction).toEqual({ label: "继续挑战 L2-2", action: { type: "next-adventure-stage", level: 2, stageIndex: 2 } });
    expect(model.secondaryAction).toEqual({ label: "返回 L2 关卡", action: { type: "open-adventure-level", level: 2 } });
  });

  test("finishes L2 without inventing L2-6 and offers the unlocked L3", () => {
    let progress: AdventureStageProgress[] = [];
    for (let stageIndex = 1; stageIndex <= 5; stageIndex += 1) progress = completeStage(progress, 2, stageIndex, 3);
    const model = getCompletionActionModel({ child, mode: "adventure", level: 2, stageIndex: 5, stars: 3, updatedProgress: progress });

    expect(model.title).toBe("L2 挑战完成！");
    expect(model.summary).toEqual(["观察森林已经通关", "本关累计 15 / 15 ★"]);
    expect(model.hint).toBe("已解锁 L3-1");
    expect(model.primaryAction).toEqual({ label: "前往 L3", action: { type: "open-adventure-level", level: 3 } });
    expect(model.primaryAction.label).not.toContain("L2-6");
    expect(model.secondaryAction.label).toBe("返回探险地图");
  });

  test("finishes L11 without calculating a twelfth level", () => {
    const progress = completeStage([], 11, 5, 3);
    const model = getCompletionActionModel({ child, mode: "adventure", level: 11, stageIndex: 5, stars: 3, updatedProgress: progress });

    expect(model.title).toBe("全部探险完成！");
    expect(model.summary).toEqual(["你已经完成所有数独关卡。"]);
    expect(model.primaryAction.label).toBe("查看探险地图");
    expect(model.secondaryAction.label).toBe("查看成长记录");
    expect(JSON.stringify(model)).not.toContain("L12");
  });

  test("keeps fast-pass question actions separate from adventure stages", () => {
    const model = getCompletionActionModel({
      child,
      mode: "challenge",
      level: 2,
      stars: 0,
      updatedProgress: [],
      fastPass: {
        title: "第 1 题完成",
        progress: "挑战进度：1 / 3",
        message: "还剩 2 题",
        nextLabel: "继续第 2 题"
      }
    });

    expect(model.context).toBe("fast-pass-question");
    expect(model.primaryAction.label).toBe("继续第 2 题");
    expect(model.secondaryAction.label).toBe("返回探险地图");
    expect(JSON.stringify(model)).not.toContain("继续挑战 L2-2");
    expect(JSON.stringify(model)).not.toContain("再来一题");
  });
});
