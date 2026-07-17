import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ChildDashboard } from "../components/ChildDashboard";
import { addPracticeRecord } from "../lib/storage";
import type { ChildProfile } from "../types";

const child: ChildProfile = {
  id: "child-a", parentId: "parent-a", name: "安安", gradeLevel: "grade3", avatar: "sun",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true, currentLevel: 5, adventureProgress: [],
  settings: { soundEnabled: true, immediateErrorFeedback: true, showTimer: true, practiceMode: "adventure", successAnimationEnabled: true, reducedMotion: false }
};

beforeEach(() => localStorage.clear());

describe("ChildDashboard forest home", () => {
  test("renders the five core forest-adventure entries with real image assets", () => {
    render(<ChildDashboard child={child} onOpenPractice={vi.fn()} onOpenCurve={vi.fn()} onOpenAdventure={vi.fn()} onOpenFastPass={vi.fn()} />);

    expect(screen.getByRole("button", { name: /今日任务/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /闯关地图/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /自由练习/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /成长报告/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /闯关秘籍/ })).toBeTruthy();
    expect(screen.getByAltText("森林河流闯关地图")).toBeTruthy();
    expect(screen.getByAltText("带铅笔的数独棋盘")).toBeTruthy();
    expect(screen.getByText(/探险休息站/)).toBeTruthy();
  });

  test("uses the existing daily recommendation and adventure progress models", () => {
    render(<ChildDashboard child={child} onOpenPractice={vi.fn()} onOpenCurve={vi.fn()} onOpenAdventure={vi.fn()} onOpenFastPass={vi.fn()} />);

    const today = within(screen.getByRole("button", { name: /今日任务/ }));
    expect(today.getByText(/今日起步推荐/)).toBeTruthy();
    expect(today.getByText(/4×4 中等/)).toBeTruthy();
    const map = within(screen.getByRole("button", { name: /闯关地图/ }));
    expect(map.getByText(/当前进度 L1-1/)).toBeTruthy();
    expect(map.getByText((_, element) => element?.classList.contains("forest-map-stats") === true && element.textContent?.includes("0 已完成") === true)).toBeTruthy();
  });

  test("does not turn a free-practice L11 record into adventure progress", () => {
    addPracticeRecord({
      id: "record-level-11", parentId: child.parentId, childId: child.id, puzzleId: "puzzle-level-11",
      gradeLevel: child.gradeLevel, level: 11, size: 9, difficulty: "challenge",
      startedAt: "2026-07-10T10:00:00.000Z", finishedAt: "2026-07-10T10:02:00.000Z",
      durationSeconds: 120, mistakeCount: 0, hintCount: 0, completed: true, gaveUp: false,
      stars: 3, mode: "practice", source: "custom"
    });
    render(<ChildDashboard child={{ ...child, currentLevel: 1 }} onOpenPractice={vi.fn()} onOpenCurve={vi.fn()} onOpenAdventure={vi.fn()} onOpenFastPass={vi.fn()} />);
    expect(within(screen.getByRole("button", { name: /闯关地图/ })).getByText(/当前进度 L1-1/)).toBeTruthy();
  });

  test("connects home, practice, growth and fast-pass actions", () => {
    const onOpenPractice = vi.fn(); const onOpenCurve = vi.fn(); const onOpenAdventure = vi.fn(); const onOpenFastPass = vi.fn();
    render(<ChildDashboard child={child} onOpenPractice={onOpenPractice} onOpenCurve={onOpenCurve} onOpenAdventure={onOpenAdventure} onOpenFastPass={onOpenFastPass} />);
    fireEvent.click(screen.getByRole("button", { name: /今日任务/ }));
    fireEvent.click(screen.getByRole("button", { name: /闯关地图/ }));
    fireEvent.click(screen.getByRole("button", { name: /成长报告/ }));
    fireEvent.click(screen.getByRole("button", { name: /闯关秘籍/ }));
    expect(onOpenPractice).toHaveBeenCalledTimes(1);
    expect(onOpenAdventure).toHaveBeenCalledTimes(1);
    expect(onOpenCurve).toHaveBeenCalledTimes(1);
    expect(onOpenFastPass).toHaveBeenCalledTimes(1);
  });
});
