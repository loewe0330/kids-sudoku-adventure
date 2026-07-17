import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import type { PracticeTab } from "../app/routes";
import { PracticeWorkspace } from "../features/practice/PracticeWorkspace";
import { getPuzzlesByChild } from "../lib/storage";
import type { ChildProfile } from "../types";

const child: ChildProfile = {
  id: "child-a", parentId: "parent-a", name: "安安", gradeLevel: "grade3", avatar: "leaf",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true, currentLevel: 5, adventureProgress: [],
  settings: { soundEnabled: false, immediateErrorFeedback: true, showTimer: true, practiceMode: "practice", successAnimationEnabled: true, reducedMotion: false }
};

const renderWorkspace = (overrides: { onQuickPractice?: ReturnType<typeof vi.fn>; onGenerateCustom?: ReturnType<typeof vi.fn> } = {}) => {
  const onQuickPractice = overrides.onQuickPractice ?? vi.fn();
  const onGenerateCustom = overrides.onGenerateCustom ?? vi.fn();
  function Harness() {
    const [activeTab, setActiveTab] = useState<PracticeTab>("select");
    return <PracticeWorkspace child={child} activeTab={activeTab} onTabChange={setActiveTab} manual={{ size: 4, difficulty: "starter" }} onManualChange={vi.fn()} onQuickPractice={onQuickPractice} onGenerateCustom={onGenerateCustom} onChanged={vi.fn()} onPractice={vi.fn()} onPrint={vi.fn()} />;
  }
  render(<Harness />);
  return { onQuickPractice, onGenerateCustom };
};

describe("PracticeWorkspace forest hub", () => {
  beforeEach(() => localStorage.clear());

  test("renders four core entries and keeps custom configuration in a drawer", () => {
    const { onQuickPractice, onGenerateCustom } = renderWorkspace();
    expect(screen.getByRole("heading", { name: "自由练习" })).toBeTruthy();
    expect(screen.getByAltText("带木牌和花草的自由练习页头")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /今日推荐/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /自选练习/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /我的题库/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /打印练习/ })).toBeTruthy();
    expect(screen.getByText(/推荐：4×4 \/ 中等/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "开始今日推荐" }));
    expect(onQuickPractice).toHaveBeenCalledWith("smart", expect.objectContaining({ size: 4, difficulty: "normal", source: "grade-cold-start" }));

    fireEvent.click(screen.getByRole("button", { name: /自选练习/ }));
    expect(screen.getByRole("dialog", { name: "自选练习设置" })).toBeTruthy();
    expect(screen.getByLabelText("题型")).toBeTruthy();
    expect(screen.getByLabelText("难度")).toBeTruthy();
    expect(screen.getByLabelText("题目数量")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("题目数量"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("保存到题库"));
    fireEvent.click(screen.getByRole("button", { name: "开始自选练习" }));
    expect(onGenerateCustom).toHaveBeenCalledWith(true, 5);

    fireEvent.click(screen.getByRole("button", { name: /我的题库/ }));
    expect(screen.getByRole("heading", { name: "我的练习收藏" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "‹ 返回练习入口" }));
    fireEvent.click(screen.getByRole("button", { name: /打印练习/ }));
    expect(screen.getByRole("heading", { name: "打印练习卷" })).toBeTruthy();
  });

  test("keeps review, challenge and batch generation available as secondary tools", () => {
    const { onQuickPractice } = renderWorkspace();
    fireEvent.click(screen.getByText("更多练习工具"));
    fireEvent.click(screen.getByRole("button", { name: "巩固练习" }));
    fireEvent.click(screen.getByRole("button", { name: "挑战练习" }));
    expect(onQuickPractice).toHaveBeenNthCalledWith(1, "review");
    expect(onQuickPractice).toHaveBeenNthCalledWith(2, "challenge");
    fireEvent.click(screen.getByRole("button", { name: "批量出题" }));
    fireEvent.click(screen.getByRole("button", { name: "开始批量出题" }));
    fireEvent.click(screen.getByRole("button", { name: "生成并保存到题库" }));
    expect(getPuzzlesByChild(child.parentId, child.id)).toHaveLength(6);
  });
});
