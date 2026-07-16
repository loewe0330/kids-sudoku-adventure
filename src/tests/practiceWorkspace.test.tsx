import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import { PracticeWorkspace } from "../features/practice/PracticeWorkspace";
import { getPuzzlesByChild } from "../lib/storage";
import type { ChildProfile } from "../types";
import type { PracticeTab } from "../app/routes";

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  avatar: "leaf",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 5,
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "practice",
    successAnimationEnabled: true,
    reducedMotion: false
  }
};

describe("PracticeWorkspace copy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("uses child-friendly practice selection naming and tab labels", () => {
    const onManualChange = vi.fn();
    const onGenerateCustom = vi.fn();
    const onQuickPractice = vi.fn();
    function Harness() {
      const [activeTab, setActiveTab] = useState<PracticeTab>("select");
      return (
        <PracticeWorkspace
          child={child}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          manual={{ size: 4, difficulty: "starter" }}
          onManualChange={onManualChange}
          onQuickPractice={onQuickPractice}
          onGenerateCustom={onGenerateCustom}
          onChanged={vi.fn()}
          onPractice={vi.fn()}
          onPrint={vi.fn()}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByRole("heading", { name: "自由练习" })).toBeTruthy();
    expect(screen.getByText("不受闯关限制，选择适合今天的练习方式。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "练习选择" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "我的题库" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "批量出题" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "打印练习" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "选择今天的探索任务" })).toBeTruthy();
    expect(screen.getByText("根据当前能力等级推荐题目，也可以选择今天想练的题型和难度。")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "今日推荐练习" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "推荐" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "今日起步推荐" })).toBeTruthy();
    expect(screen.getByText("年级起步")).toBeTruthy();
    expect(screen.getByText("4×4")).toBeTruthy();
    expect(screen.getByText("中等")).toBeTruthy();
    expect(screen.getByRole("button", { name: "开始今日推荐" })).toBeTruthy();
    expect(document.querySelectorAll(".recommended-practice-card")).toHaveLength(1);
    expect(document.querySelectorAll(".practice-choice-card")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "巩固" }));
    expect(screen.getByRole("heading", { name: "巩固练习" })).toBeTruthy();
    expect(screen.getByText("L4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "开始巩固" }));
    expect(onQuickPractice).toHaveBeenLastCalledWith("review");
    fireEvent.click(screen.getByRole("button", { name: "挑战" }));
    expect(screen.getByRole("heading", { name: "挑战练习" })).toBeTruthy();
    expect(screen.getByText("L6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "开始挑战" }));
    expect(onQuickPractice).toHaveBeenLastCalledWith("challenge");
    fireEvent.click(screen.getByRole("button", { name: "推荐" }));
    fireEvent.click(screen.getByRole("button", { name: "开始今日推荐" }));
    expect(onQuickPractice).toHaveBeenLastCalledWith("smart", expect.objectContaining({ size: 4, difficulty: "normal", source: "grade-cold-start" }));
    expect(screen.getByRole("heading", { name: "自己选一题" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "设置并开始" })).toBeTruthy();
    expect(screen.getByText("自己选择题型、难度和题目数量。")).toBeTruthy();
    expect(document.querySelector(".practice-garden-decor")).toBeTruthy();
    expect(document.querySelector(".garden-sudoku-board")).toBeTruthy();
    expect(document.querySelector(".garden-path")).toBeTruthy();
    expect(document.querySelector(".garden-flower")).toBeTruthy();
    expect(document.querySelector(".garden-chest")).toBeTruthy();
    expect(screen.queryByText("家长自定义")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "自选练习设置" })).toBeNull();
    expect(screen.queryByLabelText("题型")).toBeNull();
    expect(screen.queryByRole("heading", { name: "我的练习收藏" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "生成练习卷" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "打印练习卷" })).toBeNull();
    expect(screen.queryByText(/练习工作台/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "设置并开始" }));
    expect(screen.getByRole("dialog", { name: "自选练习设置" })).toBeTruthy();
    expect(screen.getByText("题目设置")).toBeTruthy();
    expect(screen.getByText("练习辅助")).toBeTruthy();
    expect(screen.getByText("题库设置")).toBeTruthy();
    expect(screen.getByLabelText("题型")).toBeTruthy();
    expect(screen.getByLabelText("难度")).toBeTruthy();
    expect(screen.getByLabelText("题目数量")).toBeTruthy();
    expect(screen.getByLabelText("保存到题库")).toBeTruthy();
    expect(screen.getByLabelText("显示候选数")).toBeTruthy();
    expect(screen.getByLabelText("开启建议时间")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("题目数量"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("显示候选数"));
    fireEvent.click(screen.getByLabelText("开启建议时间"));
    fireEvent.click(screen.getByLabelText("保存到题库"));
    expect(screen.getByLabelText<HTMLInputElement>("显示候选数").checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>("开启建议时间").checked).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>("保存到题库").checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "开始自选练习" }));
    expect(onGenerateCustom).toHaveBeenCalledWith(true, 5);
    expect(screen.queryByRole("dialog", { name: "自选练习设置" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "我的题库" }));
    expect(screen.getAllByRole("heading", { name: "我的练习收藏" }).length).toBeGreaterThan(0);
    expect(screen.getByText("只显示安安收藏的练习题，当前共 0 题。")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "暂无保存的题目" })).toBeTruthy();
    expect(screen.getByText("完成练习后可以把喜欢的题保存到题库。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "去练一题" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "批量出题" }));
    expect(screen.getAllByRole("heading", { name: "批量出题" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "生成并保存到题库" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "开始批量出题" }));
    expect(screen.getByRole("dialog", { name: "批量出题设置" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成并保存到题库" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    fireEvent.click(screen.getByRole("button", { name: "打印练习" }));
    expect(screen.getAllByRole("heading", { name: "打印练习卷" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "打印题目" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "打印答案" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "打印方法说明" })).toBeTruthy();
  });

  test("batch generation saves puzzles to the current child bank", () => {
    function Harness() {
      const [activeTab, setActiveTab] = useState<PracticeTab>("select");
      return (
        <PracticeWorkspace
          child={child}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          manual={{ size: 4, difficulty: "starter" }}
          onManualChange={vi.fn()}
          onQuickPractice={vi.fn()}
          onGenerateCustom={vi.fn()}
          onChanged={vi.fn()}
          onPractice={vi.fn()}
          onPrint={vi.fn()}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "批量出题" }));
    fireEvent.click(screen.getByRole("button", { name: "开始批量出题" }));
    fireEvent.click(screen.getByRole("button", { name: "生成并保存到题库" }));

    const puzzles = getPuzzlesByChild(child.parentId, child.id);
    expect(puzzles).toHaveLength(6);
    expect(puzzles.every((puzzle) => puzzle.parentId === child.parentId && puzzle.childId === child.id)).toBe(true);
  });
});
