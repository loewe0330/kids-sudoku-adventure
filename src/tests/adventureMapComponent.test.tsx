import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AdventureMap } from "../components/AdventureMap";
import { adventureChapterPresentation } from "../components/adventurePresentation";
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
  test("maps every chapter detail page to its supplied scene image", () => {
    expect(adventureChapterPresentation).toHaveLength(11);
    adventureChapterPresentation.forEach((chapter) => {
      expect(chapter.heroAsset).toContain(`chapter-${chapter.level}.png`);
    });
  });

  test("renders L1 to L11 as map stations and delegates unlocked chapter navigation", () => {
    const onOpenChapter = vi.fn();
    render(<AdventureMap child={progressedChild} onOpenChapter={onOpenChapter} onStartStage={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "11 大关探索之旅" })).toBeTruthy();
    expect(screen.getByText("能力等级").parentElement?.textContent).toContain("L2");
    expect(screen.getByText("闯关进度").parentElement?.textContent).toContain("L2-3 观察森林");
    expect(screen.getAllByTestId("adventure-chapter-card")).toHaveLength(11);
    expect(screen.queryAllByTestId("adventure-stage-card")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /L1 数字小苗村/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /L11 .*数独王国/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /L2 数学学堂/ }));
    expect(onOpenChapter).toHaveBeenCalledWith(2);
  });

  test("separates a higher ability level from an unstarted adventure route", () => {
    const highAbilityChild = { ...child([]), currentLevel: 7 };
    render(<AdventureMap child={highAbilityChild} onStartStage={vi.fn()} />);

    expect(screen.getByText("能力等级").parentElement?.textContent).toContain("L7 九宫格勇士");
    expect(screen.getByText("闯关进度").parentElement?.textContent).toContain("L1-1 数字小苗村");
    expect(screen.getByText("能力已到 L7，闯关地图可从 L1-1 开始补星。")).toBeTruthy();
    expect(screen.getByRole("button", { name: /L1 数字小苗村，当前挑战/ })).toBeTruthy();
  });

  test("selects unlocked chapters and shows a gentle notice for locked chapters", () => {
    const onOpenChapter = vi.fn();
    render(<AdventureMap child={progressedChild} onOpenChapter={onOpenChapter} onStartStage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /L1 数字小苗村/ }));
    expect(onOpenChapter).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /L4 河边小屋/ }));
    expect(screen.getByText("先完成前面的关卡，就能来到这里啦！")).toBeTruthy();
    expect(onOpenChapter).not.toHaveBeenCalledWith(4);
    expect(screen.getAllByTestId("adventure-chapter-card")).toHaveLength(11);
  });

  test("shows five stages in a routed detail page and starts its recommended stage", () => {
    const onStartStage = vi.fn();
    const onBackToMap = vi.fn();
    render(<AdventureMap child={progressedChild} detailLevel={2} onBackToMap={onBackToMap} onStartStage={onStartStage} />);

    const detail = screen.getByLabelText("等级挑战二级页面");
    expect(detail.querySelector(".touch-chapter-hero img")?.getAttribute("src")).toContain("chapter-2.png");
    expect(within(detail).getAllByTestId("adventure-stage-card")).toHaveLength(5);
    expect(within(detail).getByText("数字观察站")).toBeTruthy();
    expect(within(detail).getByText("学堂终点站")).toBeTruthy();
    fireEvent.click(within(detail).getByRole("button", { name: /继续挑战 L2-3/ }));

    expect(onStartStage).toHaveBeenCalledWith(expect.objectContaining({ level: 2, stageIndex: 3, unlocked: true }));
    fireEvent.click(within(detail).getByRole("button", { name: /返回地图/ }));
    expect(onBackToMap).toHaveBeenCalledOnce();
  });
});
