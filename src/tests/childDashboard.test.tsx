import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ChildDashboard } from "../components/ChildDashboard";
import { addPracticeRecord } from "../lib/storage";
import type { ChildProfile } from "../types";

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  avatar: "sun",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 5,
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

beforeEach(() => {
  localStorage.clear();
});

describe("ChildDashboard", () => {
  test("renders one primary task, two secondary entries and the lightweight mini game without legacy modules", () => {
    render(
      <ChildDashboard
        child={child}
        onOpenPractice={vi.fn()}
        onOpenCurve={vi.fn()}
        onOpenAdventure={vi.fn()}
      />
    );

    expect(screen.getByRole("article", { name: "今日任务" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "自由练习入口" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "成长报告入口" })).toBeTruthy();
    expect(document.querySelector(".home-dashboard-grid")).toBeTruthy();
    expect(document.querySelector(".home-side-panel")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "今日小游戏" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "星星连连消" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "继续闯关" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "进入自由练习" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看成长" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "开始小游戏" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看规则" })).toBeTruthy();

    expect(screen.queryByRole("article", { name: "首页总览" })).toBeNull();
    expect(screen.queryByRole("article", { name: "当前关卡地图" })).toBeNull();
    expect(screen.queryByRole("article", { name: "自由练习岛" })).toBeNull();
    expect(screen.queryByRole("article", { name: "探险成长记录" })).toBeNull();
    expect(screen.queryByText("最近练习")).toBeNull();
    expect(screen.queryByText("今日方法")).toBeNull();
    expect(screen.queryByText("当前目标")).toBeNull();
    expect(screen.queryByText("最近获得")).toBeNull();
    expect(document.querySelector(".explorer-sidebar")).toBeNull();

    const trail = document.querySelector(".bottom-trail-animation");
    expect(trail).toBeTruthy();
    expect(trail?.closest(".home-side-panel")).toBeTruthy();
    expect(trail?.getAttribute("aria-hidden")).toBe("true");
    expect(trail?.querySelector(".trail-path")).toBeTruthy();
    expect(trail?.querySelector(".trail-star")).toBeTruthy();
    expect(trail?.querySelectorAll(".trail-cloud")).toHaveLength(2);
    expect(trail?.querySelectorAll("button, a, h1, h2, h3, p")).toHaveLength(0);
  });

  test("keeps ability, progress and empty data in their single intended locations", () => {
    render(
      <ChildDashboard
        child={child}
        onOpenPractice={vi.fn()}
        onOpenCurve={vi.fn()}
        onOpenAdventure={vi.fn()}
      />
    );

    const task = within(screen.getByRole("article", { name: "今日任务" }));
    expect(task.getByRole("heading", { name: "欢迎回来，安安！" })).toBeTruthy();
    expect(task.getByRole("heading", { name: "继续挑战 L1-1 数字小苗村" })).toBeTruthy();
    expect(task.getByText("能力等级").parentElement?.textContent).toContain("待探索");
    expect(task.getByText("闯关进度").parentElement?.textContent).toContain("L1-1 数字小苗村");
    expect(task.getByText("今日完成").parentElement?.textContent).toContain("0");
    expect(task.getByText("当前进度").parentElement?.textContent).toContain("0/5");
    expect(task.getByText("最近正确率").parentElement?.textContent).toContain("暂无");
    expect(task.getAllByLabelText(/L1-\d/)).toHaveLength(5);

    const practice = within(screen.getByRole("article", { name: "自由练习入口" }));
    expect(practice.getByText("推荐题型：").parentElement?.textContent).toContain("4×4");

    const growth = within(screen.getByRole("article", { name: "成长报告入口" }));
    expect(growth.getByText("累计星星").parentElement?.textContent).toContain("0");
    expect(growth.getByText("已完成小关").parentElement?.textContent).toContain("0");
    expect(growth.getByText("最近完成率").parentElement?.textContent).toContain("暂无");
    expect(screen.queryByText("最高等级")).toBeNull();
    expect(screen.queryByText("连续学习")).toBeNull();
  });

  test("does not turn a free-practice L11 record into homepage adventure progress", () => {
    addPracticeRecord({
      id: "record-level-11",
      parentId: child.parentId,
      childId: child.id,
      puzzleId: "puzzle-level-11",
      gradeLevel: child.gradeLevel,
      level: 11,
      size: 9,
      difficulty: "challenge",
      startedAt: "2026-07-10T10:00:00.000Z",
      finishedAt: "2026-07-10T10:02:00.000Z",
      durationSeconds: 120,
      mistakeCount: 0,
      hintCount: 0,
      completed: true,
      gaveUp: false,
      stars: 3,
      mode: "practice",
      source: "custom"
    });

    render(
      <ChildDashboard
        child={{ ...child, currentLevel: 1 }}
        onOpenPractice={vi.fn()}
        onOpenCurve={vi.fn()}
        onOpenAdventure={vi.fn()}
      />
    );

    const task = within(screen.getByRole("article", { name: "今日任务" }));
    expect(task.getByRole("heading", { name: "继续挑战 L1-1 数字小苗村" })).toBeTruthy();
    expect(task.getByText("闯关进度").parentElement?.textContent).toContain("L1-1 数字小苗村");
  });

  test("connects the only three homepage actions", () => {
    const onOpenPractice = vi.fn();
    const onOpenCurve = vi.fn();
    const onOpenAdventure = vi.fn();

    render(
      <ChildDashboard
        child={child}
        onOpenPractice={onOpenPractice}
        onOpenCurve={onOpenCurve}
        onOpenAdventure={onOpenAdventure}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "继续闯关" }));
    fireEvent.click(screen.getByRole("button", { name: "进入自由练习" }));
    fireEvent.click(screen.getByRole("button", { name: "查看成长" }));

    expect(onOpenAdventure).toHaveBeenCalledTimes(1);
    expect(onOpenPractice).toHaveBeenCalledTimes(1);
    expect(onOpenCurve).toHaveBeenCalledTimes(1);
  });

});
