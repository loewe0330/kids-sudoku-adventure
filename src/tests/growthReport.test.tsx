import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { LearningCurve } from "../components/LearningCurve";
import { getHighestAdventureLevel, getHighestCompletedLevel } from "../lib/stats";
import { addPracticeRecord } from "../lib/storage";
import type { ChildProfile, PracticeRecord } from "../types";

const child: ChildProfile = {
  id: "growth-child",
  parentId: "growth-parent",
  name: "安安",
  gradeLevel: "grade3",
  avatar: "sun",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
  adventureProgress: [],
  settings: {
    soundEnabled: true,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
};

const record = (level: number, overrides: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: `record-${level}-${overrides.id ?? "base"}`,
  parentId: child.parentId,
  childId: child.id,
  puzzleId: `puzzle-${level}`,
  gradeLevel: child.gradeLevel,
  level,
  size: level >= 7 ? 9 : level >= 4 ? 6 : 4,
  difficulty: "starter",
  startedAt: `2026-07-${String(level).padStart(2, "0")}T10:00:00.000Z`,
  finishedAt: `2026-07-${String(level).padStart(2, "0")}T10:02:00.000Z`,
  durationSeconds: 120,
  mistakeCount: 1,
  hintCount: 1,
  completed: true,
  gaveUp: false,
  stars: 2,
  mode: "practice",
  source: "smart",
  ...overrides
});

beforeEach(() => {
  localStorage.clear();
});

describe("growth report statistics", () => {
  test("ignores abandoned records when calculating the highest title", () => {
    expect(getHighestCompletedLevel([record(11, { completed: false, gaveUp: true, source: "custom" })], 1)).toBe(1);
  });

  test("ignores custom records for highest adventure level", () => {
    expect(getHighestAdventureLevel([record(11, { mode: "adventure", source: "custom" })], 1)).toBe(1);
  });

  test("includes completed non-abandoned adventure records", () => {
    expect(getHighestAdventureLevel([record(7, { mode: "adventure", source: "stage" })], 1)).toBe(7);
  });

  test("falls back to the current level when there is no completed record", () => {
    expect(getHighestCompletedLevel([record(11, { completed: false, gaveUp: true })], 5)).toBe(5);
    expect(getHighestAdventureLevel([], 5)).toBe(5);
  });
});

describe("LearningCurve record disclosure", () => {
  test("shows a concise empty-state conclusion and exactly four core metrics", () => {
    render(<LearningCurve child={child} />);

    expect(screen.getByRole("heading", { name: "安安的成长报告" })).toBeTruthy();
    expect(screen.getAllByText("刚开始探索，先从第一关稳稳练起。")).toHaveLength(1);
    expect(screen.getByText("继续完成 L1-1，熟悉规则和观察法。")).toBeTruthy();
    expect(screen.queryByText("暂无练习记录，完成一题后这里会留下新的探险足迹。")).toBeNull();
    expect(screen.getByRole("button", { name: "展开练习日志" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "展开练习日志" }));
    expect(screen.getByText("暂无练习记录，完成一题后这里会留下新的探险足迹。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "收起练习日志" })).toBeTruthy();
    expect(document.querySelectorAll(".growth-core-metrics article")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /最近表现/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /闯关进度/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /方法掌握/ })).toBeTruthy();
    expect(document.querySelector(".growth-insight-detail")).toBeNull();
    expect(screen.getByText("累计星星").parentElement?.textContent).toContain("0");
    expect(screen.getAllByText("已完成小关")[0].parentElement?.textContent).toContain("0");
    expect(screen.getAllByText("最近完成率")[0].parentElement?.textContent).toContain("暂无");
    expect(screen.getAllByText("平均用时")[0].parentElement?.textContent).toContain("暂无");
    expect(screen.queryByText("平均错误")).toBeNull();
    expect(screen.queryByText("闯关星星")).toBeNull();
    expect(screen.queryByText(/最高闯关等级/)).toBeNull();
    expect(document.querySelector(".growth-record-table")).toBeNull();
    expect(document.querySelector(".growth-record-cards")).toBeNull();
  });

  test("keeps records folded by default, then shows recent and full records on demand", () => {
    for (let level = 1; level <= 5; level += 1) {
      addPracticeRecord(record(level, { id: String(level), source: level === 1 ? "custom" : "smart" }));
    }

    render(<LearningCurve child={child} />);

    expect(screen.getByRole("heading", { name: "核心数据" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "成长洞察" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "最近表现" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /最近表现/ }));
    expect(screen.getByRole("heading", { name: "最近表现" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "闯关进度" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "返回成长洞察" }));
    fireEvent.click(screen.getByRole("button", { name: /闯关进度/ }));
    expect(screen.getByRole("heading", { name: "闯关进度" })).toBeTruthy();
    expect(screen.getByLabelText("L1 小关路径")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回成长洞察" }));
    fireEvent.click(screen.getByRole("button", { name: /方法掌握/ }));
    expect(screen.getByRole("heading", { name: "方法掌握" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回成长洞察" }));
    expect(screen.getByText("能力等级：L1 数字小苗")).toBeTruthy();
    expect(screen.getByText(/闯关进度：L1-1 数字小苗村/)).toBeTruthy();
    expect(screen.queryByRole("row")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "展开练习日志" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "查看全部记录" }));
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.getAllByText("自选练习").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "只看最近 3 条" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "收起练习日志" }));
    expect(screen.queryByRole("row")).toBeNull();
  });
});
