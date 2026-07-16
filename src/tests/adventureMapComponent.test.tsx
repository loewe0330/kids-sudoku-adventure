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

  test("uses the same illustrated map structure on wide web viewports", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    });

    try {
      render(<AdventureMap child={progressedChild} onStartStage={vi.fn()} />);
      expect(screen.getByLabelText("统一冒险地图")).toBeTruthy();
      expect(screen.getByLabelText("11 大关纵向冒险地图")).toBeTruthy();
      expect(screen.queryByLabelText("桌面端冒险地图")).toBeNull();
    } finally {
      Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
    }
  });

  test("keeps an unstarted adventure route independent from an internal ability value", () => {
    const highAbilityChild = { ...child([]), currentLevel: 7 };
    render(<AdventureMap child={highAbilityChild} onStartStage={vi.fn()} />);

    expect(screen.getByText("能力等级").parentElement?.textContent).toContain("待探索");
    expect(screen.getByText("闯关进度").parentElement?.textContent).toContain("L1-1 数字小苗村");
    expect(screen.queryByText("能力等级和闯关进度会分别记录，完成小关即可继续点亮地图。")).toBeNull();
    expect(screen.getByRole("button", { name: /L1 数字小苗村，当前挑战/ })).toBeTruthy();
  });

  test("opens fast-pass rules before target selection and keeps validated chapters available for star replay", () => {
    const onOpenFastPass = vi.fn();
    const onOpenChapter = vi.fn();
    const fastPassChild: ChildProfile = {
      ...child([]),
      fastPass: {
        attempts: [],
        highestPassedLevel: 6,
        validatedSkipLevels: [1, 2, 3, 4, 5],
        updatedAt: "2026-01-02T00:00:00.000Z"
      }
    };
    render(<AdventureMap child={fastPassChild} onOpenFastPass={onOpenFastPass} onOpenChapter={onOpenChapter} onStartStage={vi.fn()} />);

    expect(screen.queryByText("已经会一些数独？完成挑战后，可以快速前往更合适的关卡。")).toBeNull();
    expect(screen.getByRole("button", { name: "开启秘籍" }).textContent).toContain("闯关秘籍");
    fireEvent.click(screen.getByRole("button", { name: "开启秘籍" }));
    expect(screen.getByRole("dialog", { name: "开启闯关秘籍" })).toBeTruthy();
    expect(screen.getByText(/L4-1/)).toBeTruthy();
    expect(onOpenFastPass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "开始 3 题挑战" }));
    expect(onOpenFastPass).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /L3 数字乐园，已通过秘籍/ }));
    expect(onOpenChapter).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: /L6 山谷探索，当前挑战/ })).toBeTruthy();
  });

  test("closes fast-pass rules with the secondary action and Escape", () => {
    render(<AdventureMap child={child([])} onOpenFastPass={vi.fn()} onStartStage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "开启秘籍" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "稍后再试" }));
    expect(screen.queryByRole("dialog", { name: "开启闯关秘籍" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "开启秘籍" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "开启闯关秘籍" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  test("closes fast-pass rules when the backdrop is pressed", () => {
    render(<AdventureMap child={child([])} onOpenFastPass={vi.fn()} onStartStage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "开启秘籍" }));
    const backdrop = screen.getByRole("dialog", { name: "开启闯关秘籍" }).parentElement;
    expect(backdrop).toBeTruthy();
    fireEvent.mouseDown(backdrop!);
    expect(screen.queryByRole("dialog", { name: "开启闯关秘籍" })).toBeNull();
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
