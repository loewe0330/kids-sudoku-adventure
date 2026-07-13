import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SudokuBoard } from "../components/SudokuBoard";
import type { ChildProfile, SudokuPuzzleItem } from "../types";

const child: ChildProfile = {
  id: "child-a",
  parentId: "parent-a",
  name: "安安",
  gradeLevel: "grade3",
  avatar: "leaf",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true,
  currentLevel: 1,
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

const puzzle: SudokuPuzzleItem = {
  id: "puzzle-a",
  parentId: "parent-a",
  childId: "child-a",
  size: 4,
  boxRows: 2,
  boxCols: 2,
  gradeLevel: "grade3",
  difficulty: "starter",
  level: 1,
  puzzle: [
    [1, 0, 0, 4],
    [0, 4, 1, 0],
    [0, 1, 4, 0],
    [4, 0, 0, 1]
  ],
  solution: [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
  ],
  clues: 8,
  emptyCount: 8,
  createdAt: "2026-01-01T00:00:00.000Z",
  mode: "practice"
};

const puzzle9: SudokuPuzzleItem = {
  ...puzzle,
  id: "puzzle-9",
  size: 9,
  boxRows: 3,
  boxCols: 3,
  difficulty: "hard",
  level: 10,
  puzzle: Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1)
  ),
  solution: Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1)
  ),
  clues: 81,
  emptyCount: 0
};

beforeEach(() => {
  localStorage.clear();
});

describe("SudokuBoard layout", () => {
  test("locks a 9×9 hard puzzle to nine explicit rows and columns", () => {
    const { container } = render(
      <SudokuBoard
        child={child}
        puzzle={puzzle9}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={vi.fn()}
      />
    );

    const board = screen.getByRole("grid", { name: "9×9 数独棋盘" });
    expect(within(board).getAllByRole("gridcell")).toHaveLength(81);
    expect(board.style.gridTemplateColumns).toBe("repeat(9, minmax(0, 1fr))");
    expect(board.style.gridTemplateRows).toBe("repeat(9, minmax(0, 1fr))");
    expect(container.querySelectorAll(".cell:nth-child(n+28):nth-child(-n+54)")).toHaveLength(27);
  });

  test("groups number pad and play actions in the action panel", () => {
    render(
      <SudokuBoard
        child={child}
        puzzle={puzzle}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "选择数字" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "做题操作" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "继续练习" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "打印" })).toBeTruthy();

    const numberSection = screen.getByRole("heading", { name: "选择数字" }).closest("section");
    expect(numberSection).toBeTruthy();
    expect(within(numberSection!).getByRole("button", { name: "删除" })).toBeTruthy();
    expect(within(numberSection!).getByRole("button", { name: "1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "引导提示" })).toBeTruthy();
  });

  test("supports board input, helper actions, print, save, next and back buttons", () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    const onSave = vi.fn();
    const onPrint = vi.fn();
    const onChildChanged = vi.fn();
    const { container } = render(
      <SudokuBoard
        child={child}
        puzzle={puzzle}
        onBack={onBack}
        onNext={onNext}
        onSave={onSave}
        onPrint={onPrint}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={onChildChanged}
      />
    );
    const cells = Array.from(container.querySelectorAll<HTMLButtonElement>(".cell"));
    const numberSection = screen.getByRole("heading", { name: "选择数字" }).closest("section");
    expect(numberSection).toBeTruthy();

    fireEvent.click(cells[1]);
    fireEvent.click(within(numberSection!).getByRole("button", { name: "2" }));
    expect(cells[1].textContent).toBe("2");

    fireEvent.click(within(numberSection!).getByRole("button", { name: "删除" }));
    expect(cells[1].textContent).toBe("");

    fireEvent.click(cells[1]);
    fireEvent.click(screen.getByRole("button", { name: "引导提示" }));
    expect(screen.getByRole("button", { name: "我再想想" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "换一个提示格" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "我再想想" }));

    fireEvent.click(cells[1]);
    fireEvent.click(within(numberSection!).getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "重做本题" }));
    expect(cells[1].textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "保存到题库" }));
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "打印当前题" }));
    fireEvent.click(screen.getByRole("button", { name: "打印答案" }));
    expect(onPrint).toHaveBeenNthCalledWith(1, false);
    expect(onPrint).toHaveBeenNthCalledWith(2, true);

    fireEvent.click(screen.getByRole("button", { name: "生成下一题" }));
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("checks a completed board and records the result", () => {
    const onChildChanged = vi.fn();
    const { container } = render(
      <SudokuBoard
        child={child}
        puzzle={puzzle}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={onChildChanged}
      />
    );
    const cells = Array.from(container.querySelectorAll<HTMLButtonElement>(".cell"));
    const numberSection = screen.getByRole("heading", { name: "选择数字" }).closest("section");
    expect(numberSection).toBeTruthy();

    puzzle.solution.flat().forEach((value, index) => {
      if (puzzle.puzzle.flat()[index] !== 0) return;
      fireEvent.click(cells[index]);
      fireEvent.click(within(numberSection!).getByRole("button", { name: String(value) }));
    });

    fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

    expect(screen.getByText(/本题完成/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("太棒了！");
    expect(screen.getByRole("status").textContent).toContain("全部答对啦");
    expect(onChildChanged).toHaveBeenCalledTimes(1);
  });

  test("reveals the answer and ends the puzzle", () => {
    const onChildChanged = vi.fn();
    render(
      <SudokuBoard
        child={child}
        puzzle={puzzle}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={onChildChanged}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "显示答案" }));

    expect(screen.getByText(/本题已结束/)).toBeTruthy();
    expect(onChildChanged).toHaveBeenCalledTimes(1);
  });
});
