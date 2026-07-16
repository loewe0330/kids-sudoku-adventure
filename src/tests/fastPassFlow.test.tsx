import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FastPassFlow } from "../features/adventure/FastPassFlow";
import { addPracticeRecord } from "../lib/storage";
import type { ChildProfile, PracticeRecord, SudokuPuzzleItem } from "../types";

const storageSpies = vi.hoisted(() => ({ updateChild: vi.fn() }));

vi.mock("../lib/storage", async () => {
  const actual = await vi.importActual<typeof import("../lib/storage")>("../lib/storage");
  return { ...actual, updateChild: storageSpies.updateChild };
});

vi.mock("../components/SudokuBoard", () => ({
  SudokuBoard: ({ puzzle, onManagedResult }: {
    puzzle: SudokuPuzzleItem;
    onManagedResult: (record: PracticeRecord) => void;
  }) => (
    <section aria-label={`模拟挑战题 ${puzzle.stageIndex} · L${puzzle.level}`}>
      <button type="button" onClick={() => onManagedResult({
        id: `record-${puzzle.id}`,
        parentId: puzzle.parentId,
        childId: puzzle.childId,
        puzzleId: puzzle.id,
        gradeLevel: puzzle.gradeLevel,
        level: puzzle.level,
        size: puzzle.size,
        difficulty: puzzle.difficulty,
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:05:00.000Z",
        durationSeconds: 300,
        mistakeCount: 0,
        hintCount: 0,
        completed: true,
        gaveUp: false,
        stars: 0,
        mode: "challenge",
        source: "challenge"
      })}>完成本题</button>
      <button type="button" onClick={() => onManagedResult({
        id: `failed-record-${puzzle.id}`,
        parentId: puzzle.parentId,
        childId: puzzle.childId,
        puzzleId: puzzle.id,
        gradeLevel: puzzle.gradeLevel,
        level: puzzle.level,
        size: puzzle.size,
        difficulty: puzzle.difficulty,
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:05:00.000Z",
        durationSeconds: 300,
        mistakeCount: 3,
        hintCount: 0,
        completed: true,
        gaveUp: false,
        stars: 0,
        mode: "challenge",
        source: "challenge"
      })}>未达标完成本题</button>
    </section>
  )
}));

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade5",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
  abilityAssessmentStatus: "unassessed",
  adventureProgress: [],
  settings: {
    soundEnabled: false,
    immediateErrorFeedback: true,
    showTimer: true,
    practiceMode: "adventure",
    successAnimationEnabled: true,
    reducedMotion: false
  }
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("FastPassFlow", () => {
  test("keeps question results separate and writes the final attempt only after question three", () => {
    const onChildChanged = vi.fn();
    render(<FastPassFlow child={child} onBackToMap={vi.fn()} onOpenLevel={vi.fn()} onChildChanged={onChildChanged} />);

    expect(screen.getByRole("heading", { name: "用 3 道挑战题验证闯关起点" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "选择挑战等级" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "L5 推荐" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "L6 进阶" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /L4/ })).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "L6 进阶" }));
    expect(screen.getByRole("button", { name: "L6 进阶" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("6×6 · 中等")).toBeTruthy();
    expect(screen.getByText("通过后前往").parentElement?.textContent).toBe("通过后前往L6-1");
    expect(screen.getAllByText(/L6/).length).toBeGreaterThan(1);
    expect(onChildChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "挑战说明" }));
    expect(screen.getByRole("dialog", { name: "挑战说明" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("基础热身")).toBeTruthy();
    expect(screen.getByText(/L5 数独小侦探/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    expect(screen.queryByRole("dialog", { name: "挑战说明" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "开始 3 题挑战" }));

    expect(screen.getByRole("region", { name: "模拟挑战题 1 · L5" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "完成本题" }));
    fireEvent.click(screen.getByRole("button", { name: "完成本题" }));
    expect(screen.getByText("第 1 题完成，还剩 2 题")).toBeTruthy();
    expect(screen.getByRole("button", { name: "继续第 2 题" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "查看挑战结果" })).toBeNull();
    expect(storageSpies.updateChild).not.toHaveBeenCalled();
    expect(onChildChanged).not.toHaveBeenCalled();

    const questionTwoButton = screen.getByRole("button", { name: "继续第 2 题" });
    fireEvent.click(questionTwoButton);
    fireEvent.click(questionTwoButton);
    expect(screen.getByRole("region", { name: "模拟挑战题 2 · L6" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "完成本题" }));
    expect(screen.getByText("第 2 题完成，还剩最后 1 题")).toBeTruthy();
    expect(screen.getByRole("button", { name: "继续第 3 题" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "查看挑战结果" })).toBeNull();
    expect(storageSpies.updateChild).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "继续第 3 题" }));
    expect(screen.getByRole("region", { name: "模拟挑战题 3 · L6" })).toBeTruthy();
    expect(screen.getByText("最后一题，通过验证即可解锁 L6-1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "完成本题" }));
    expect(screen.getByText("3 道挑战题已全部完成")).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看挑战结果" })).toBeTruthy();
    expect(storageSpies.updateChild).not.toHaveBeenCalled();
    expect(onChildChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "查看挑战结果" }));

    expect(screen.getByRole("heading", { name: "秘籍验证通过" })).toBeTruthy();
    expect(screen.getByText("已解锁 L6-1，前面的关卡已标记为“秘籍已验证”，以后仍可回来补星星。")).toBeTruthy();
    expect(onChildChanged).toHaveBeenCalledOnce();
    expect(storageSpies.updateChild).toHaveBeenCalledOnce();
    const savedChanges = storageSpies.updateChild.mock.calls[0][2];
    const savedAttempt = savedChanges.fastPass.attempts.at(-1);
    expect(savedAttempt.results).toHaveLength(3);
    expect(savedAttempt.results.map((result: { questionIndex: number }) => result.questionIndex)).toEqual([1, 2, 3]);
    expect(savedAttempt.passed).toBe(true);
  });

  test("leaving an unfinished challenge does not save a failed attempt or pollute a new visit", () => {
    const onBackToMap = vi.fn();
    const onChildChanged = vi.fn();
    const firstVisit = render(
      <FastPassFlow child={child} onBackToMap={onBackToMap} onOpenLevel={vi.fn()} onChildChanged={onChildChanged} />
    );

    fireEvent.click(screen.getByRole("button", { name: "开始 3 题挑战" }));
    fireEvent.click(screen.getByRole("button", { name: "完成本题" }));
    fireEvent.click(screen.getByRole("button", { name: "退出挑战" }));

    expect(onBackToMap).toHaveBeenCalledOnce();
    expect(storageSpies.updateChild).not.toHaveBeenCalled();
    expect(onChildChanged).not.toHaveBeenCalled();

    firstVisit.unmount();
    render(<FastPassFlow child={child} onBackToMap={vi.fn()} onOpenLevel={vi.fn()} onChildChanged={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "用 3 道挑战题验证闯关起点" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /秘籍验证通过|这次还差一点/ })).toBeNull();
  });

  test("shows only L11 when the suggested target is already the highest level", () => {
    const establishedChild = { ...child, currentLevel: 11, abilityAssessmentStatus: "established" as const };
    for (let index = 1; index <= 5; index += 1) {
      addPracticeRecord({
        id: `record-${index}`,
        parentId: child.parentId,
        childId: child.id,
        puzzleId: `puzzle-${index}`,
        gradeLevel: child.gradeLevel,
        level: 11,
        size: 9,
        difficulty: "challenge",
        startedAt: `2026-01-0${index}T00:00:00.000Z`,
        finishedAt: `2026-01-0${index}T00:05:00.000Z`,
        durationSeconds: 300,
        mistakeCount: 0,
        hintCount: 0,
        completed: true,
        gaveUp: false,
        stars: 3,
        mode: "practice",
        source: "smart"
      });
    }

    render(<FastPassFlow child={establishedChild} onBackToMap={vi.fn()} onOpenLevel={vi.fn()} onChildChanged={vi.fn()} />);

    expect(screen.getByRole("button", { name: "L11 推荐" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /进阶/ })).toBeNull();
    expect(screen.queryByText(/L12/)).toBeNull();
  });

  test("shows a gentle failure result when the representative question misses the rule", () => {
    render(<FastPassFlow child={child} onBackToMap={vi.fn()} onOpenLevel={vi.fn()} onChildChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "开始 3 题挑战" }));

    for (let question = 1; question <= 3; question += 1) {
      fireEvent.click(screen.getByRole("button", { name: question === 3 ? "未达标完成本题" : "完成本题" }));
      fireEvent.click(screen.getByRole("button", { name: question === 3 ? "查看挑战结果" : `继续第 ${question + 1} 题` }));
    }

    expect(screen.getByRole("heading", { name: "这次还差一点" })).toBeTruthy();
    expect(screen.getByText("目标关卡暂未解锁。继续练习后，可以再来挑战。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "再次挑战" })).toBeTruthy();
  });
});
