import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AdventureMap } from "../components/AdventureMap";
import type { AdventureStageProgress, ChildProfile } from "../types";

const progress = (level: number, stageIndex: number, stars: number): AdventureStageProgress => ({
  parentId: "parent-a",
  childId: "child-a",
  level,
  stageIndex,
  bestStars: stars,
  completed: true,
  unlocked: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
});

const child = (adventureProgress: AdventureStageProgress[] = []): ChildProfile => ({
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade4",
  avatar: "leaf",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 2,
  adventureProgress,
  settings: {
    soundEnabled: true,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
});

const progressedChild = child([
  progress(1, 1, 3),
  progress(1, 2, 3),
  progress(1, 3, 2),
  progress(1, 4, 3),
  progress(1, 5, 1),
  progress(2, 1, 3),
  progress(2, 2, 2)
]);

describe("AdventureMap", () => {
  test("renders a two-level map with 11 chapter cards and 5 selected stage cards", () => {
    render(<AdventureMap child={progressedChild} onStartStage={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "冒险地图 · 11 大关探索之旅" })).toBeTruthy();
    expect(screen.getByText("能力等级").parentElement?.textContent).toContain("L2");
    expect(screen.getByText("闯关进度").parentElement?.textContent).toContain("L2-3 观察森林");
    expect(screen.getAllByTestId("adventure-chapter-card")).toHaveLength(11);
    expect(screen.getByRole("heading", { name: "当前大关：L2 观察森林" })).toBeTruthy();

    const detail = screen.getByLabelText("当前大关详情");
    expect(within(detail).getAllByTestId("adventure-stage-card")).toHaveLength(5);
    expect(within(detail).getByText("推荐挑战：L2-3")).toBeTruthy();
    expect(within(detail).getByRole("button", { name: "开始挑战 L2-3" })).toBeTruthy();
  });

  test("separates a higher ability level from an unstarted adventure route", () => {
    const highAbilityChild = { ...child([]), currentLevel: 7 };
    render(<AdventureMap child={highAbilityChild} onStartStage={vi.fn()} />);

    expect(screen.getByText("能力等级").parentElement?.textContent).toContain("L7 九宫格勇士");
    expect(screen.getByText("闯关进度").parentElement?.textContent).toContain("L1-1 数字小苗村");
    expect(screen.getByText("能力已到 L7，闯关地图可从 L1-1 开始补星。")).toBeTruthy();
  });

  test("selects unlocked chapters and shows a gentle notice for locked chapters", () => {
    render(<AdventureMap child={progressedChild} onStartStage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /L1 数字小苗村/ }));
    expect(screen.getByRole("heading", { name: "当前大关：L1 数字小苗村" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /L4 排除法小路/ }));
    expect(screen.getByText("先完成前面的关卡，就能来到这里啦！")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "当前大关：L1 数字小苗村" })).toBeTruthy();
  });

  test("starts the recommended selected stage without changing adventure data logic", () => {
    const onStartStage = vi.fn();
    render(<AdventureMap child={progressedChild} onStartStage={onStartStage} />);

    fireEvent.click(screen.getByRole("button", { name: "开始挑战 L2-3" }));

    expect(onStartStage).toHaveBeenCalledWith(expect.objectContaining({ level: 2, stageIndex: 3, unlocked: true }));
  });
});
