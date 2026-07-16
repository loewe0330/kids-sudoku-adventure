import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SudokuBoard } from "../components/SudokuBoard";
import { getBusinessDate } from "../lib/guidance";
import { getPracticeRecordsByChild } from "../lib/storage";
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

const fillPuzzle = (container: HTMLElement, values: number[][]) => {
  const cells = Array.from(container.querySelectorAll<HTMLButtonElement>(".cell"));
  const numberSection = screen.getByRole("heading", { name: "选择数字" }).closest("section");
  expect(numberSection).toBeTruthy();
  values.flat().forEach((value, index) => {
    if (puzzle.puzzle.flat()[index] !== 0) return;
    fireEvent.click(cells[index]);
    fireEvent.click(within(numberSection!).getByRole("button", { name: String(value) }));
  });
};

const setStoredChild = (profile: ChildProfile) => {
  localStorage.setItem("kids-sudoku-trainer:v2", JSON.stringify({
    adminAccount: { username: "admin", passwordHash: "hash", createdAt: child.createdAt, updatedAt: child.updatedAt },
    parentAccounts: [],
    activeSession: null,
    activeChildId: null,
    children: [profile],
    practiceRecords: [],
    puzzleBank: []
  }));
};

beforeEach(() => {
  localStorage.clear();
  setStoredChild(child);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
    fireEvent.click(screen.getByTestId("guided-hint-backdrop"));
    expect(screen.queryByRole("button", { name: "我再想想" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "引导提示" }));
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
    fillPuzzle(container, puzzle.solution);

    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(screen.getByText(/本题完成/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("太棒了！");
    expect(screen.getByRole("status").textContent).toContain("全部答对啦");
    expect(screen.getByRole("button", { name: "再来一题" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "回到练习" })).toBeTruthy();
    expect(onChildChanged).toHaveBeenCalledTimes(1);
  });

  test("shows adventure-stage actions after completing L2-1", () => {
    const onStartAdventureStage = vi.fn();
    const onOpenAdventureLevel = vi.fn();
    const { container } = render(
      <SudokuBoard
        child={{ ...child, currentLevel: 2 }}
        puzzle={{ ...puzzle, id: "adventure-l2-1", level: 2, mode: "adventure", source: "stage", stageIndex: 1 }}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onStartAdventureStage={onStartAdventureStage}
        onOpenAdventureLevel={onOpenAdventureLevel}
        onChildChanged={vi.fn()}
      />
    );
    fillPuzzle(container, puzzle.solution);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "挑战成功！" })).toBeTruthy();
    expect(dialog.textContent).toContain("完成 L2-1");
    expect(dialog.textContent).toContain("获得 3 ★");
    expect(dialog.textContent).toContain("已解锁下一关：L2-2");
    expect(within(dialog).queryByRole("button", { name: "再来一题" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "回到练习" })).toBeNull();
    expect(dialog.textContent).not.toContain("继续第 2 题");

    fireEvent.click(within(dialog).getByRole("button", { name: "继续挑战 L2-2" }));
    expect(onStartAdventureStage).toHaveBeenCalledWith(2, 2);
    fireEvent.click(within(dialog).getByRole("button", { name: "返回 L2 关卡" }));
    expect(onOpenAdventureLevel).toHaveBeenCalledWith(2);
  });

  test("hands a managed challenge result to its flow without writing ability records", () => {
    const onManagedResult = vi.fn();
    const onNext = vi.fn();
    const onBackToMap = vi.fn();
    const onChildChanged = vi.fn();
    const { container } = render(
      <SudokuBoard
        child={child}
        puzzle={{ ...puzzle, mode: "challenge", source: "challenge" }}
        onBack={vi.fn()}
        onNext={onNext}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={onBackToMap}
        onBackToPractice={vi.fn()}
        onChildChanged={onChildChanged}
        onManagedResult={onManagedResult}
        nextLabel="继续第 2 题"
        managedResultFeedback={{
          title: "第 1 题完成",
          progress: "挑战进度：1 / 3",
          message: "还剩 2 题，继续完成即可进行秘籍验证。"
        }}
      />
    );
    fillPuzzle(container, puzzle.solution);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(onManagedResult).toHaveBeenCalledWith(expect.objectContaining({ completed: true, mode: "challenge" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "第 1 题完成" })).toBeTruthy();
    expect(dialog.textContent).toContain("本题已记录");
    expect(dialog.textContent).toContain("挑战进度：1 / 3");
    expect(dialog.textContent).toContain("还剩 2 题，继续完成即可进行秘籍验证。");
    expect(within(dialog).queryByRole("button", { name: "查看挑战结果" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "继续第 2 题" }));
    expect(onNext).toHaveBeenCalledOnce();
    fireEvent.click(within(dialog).getByRole("button", { name: "返回探险地图" }));
    expect(onBackToMap).toHaveBeenCalledOnce();
    expect(onChildChanged).not.toHaveBeenCalled();
    expect(getPracticeRecordsByChild(child.parentId, child.id)).toHaveLength(0);
  });

  test("gives lightweight feedback for an incomplete board without recording a result", () => {
    const onChildChanged = vi.fn();
    render(
      <SudokuBoard child={child} puzzle={puzzle} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={onChildChanged} />
    );

    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(screen.getByRole("dialog").textContent).toContain("还有空格没有填完哦");
    expect(screen.getByRole("dialog").textContent).toContain("先把数独完成，再来检查答案吧。");
    expect(screen.getByText("错误 0")).toBeTruthy();
    expect(onChildChanged).not.toHaveBeenCalled();
  });

  test("allows one incorrect completed attempt to be corrected, then ends on a later incorrect check", () => {
    const onChildChanged = vi.fn();
    const { container } = render(
      <SudokuBoard child={child} puzzle={puzzle} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={onChildChanged} />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);

    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(screen.getByRole("dialog").textContent).toContain("再想一想");
    expect(container.querySelector(".cell.error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    expect(screen.getByRole("dialog").textContent).toContain("需要解题引导吗");
    fireEvent.click(screen.getByRole("button", { name: "暂不使用" }));

    const cells = Array.from(container.querySelectorAll<HTMLButtonElement>(".cell"));
    const numberSection = screen.getByRole("heading", { name: "选择数字" }).closest("section");
    fireEvent.click(cells[1]);
    fireEvent.click(within(numberSection!).getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(screen.getByRole("dialog").textContent).toContain("太棒了！");
    expect(onChildChanged).toHaveBeenCalledTimes(1);
  });

  test("shows encouragement after a second incorrect completed check without revealing the answer", () => {
    const { container } = render(
      <SudokuBoard child={child} puzzle={puzzle} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={vi.fn()} />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    fireEvent.click(screen.getByRole("button", { name: "暂不使用" }));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(screen.getByRole("dialog").textContent).toContain("下次努力");
    expect(screen.getByRole("button", { name: "重新挑战" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "返回当前大关" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看解题方法" })).toBeTruthy();
    expect(container.querySelectorAll(".cell")[1].textContent).toBe("3");
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("uses the dedicated final-failure flow for an adventure stage", async () => {
    const onRetryAdventureStage = vi.fn();
    const onOpenAdventureLevel = vi.fn();
    const onChildChanged = vi.fn();
    const adventureChild: ChildProfile = {
      ...child,
      currentLevel: 7,
      adventureProgress: [{
        parentId: child.parentId,
        childId: child.id,
        level: 2,
        stageIndex: 1,
        completed: true,
        bestStars: 2,
        unlocked: true,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z"
      }]
    };
    const { container } = render(
      <SudokuBoard
        child={adventureChild}
        puzzle={{ ...puzzle, id: "adventure-failure-l2-1", level: 2, mode: "adventure", source: "stage", stageIndex: 1 }}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onRetryAdventureStage={onRetryAdventureStage}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onOpenAdventureLevel={onOpenAdventureLevel}
        onBackToPractice={vi.fn()}
        onChildChanged={onChildChanged}
      />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    expect((screen.getByRole("button", { name: "引导提示" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(container.querySelector("main")?.getAttribute("data-submission-state")).toBe("incorrect-editable");
    expect(container.querySelector(".cell.error")).toBeNull();
    expect(screen.getByText("提交 1/2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    const guidanceDialog = screen.getByRole("dialog", { name: "使用免费引导？" });
    expect(within(guidanceDialog).getByText("今日免费剩余 3/3 次")).toBeTruthy();
    const useGuidance = screen.getByRole("button", { name: "使用引导" });
    fireEvent.click(useGuidance);
    fireEvent.click(useGuidance);
    expect(await screen.findByText(/第 1 级提示/)).toBeTruthy();
    expect(screen.getByText(/第 1 行、第 2 列/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "换一个提示格" })).toBeNull();
    expect((screen.getByRole("button", { name: "引导提示" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("guided-hint-backdrop"));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    const failureDialog = screen.getByRole("dialog");
    expect(within(failureDialog).getByRole("heading", { name: "本关暂未通过" })).toBeTruthy();
    expect(failureDialog.textContent).toContain("这次还差一点，可以重新挑战，或者先回到关卡地图。");
    expect(within(failureDialog).getByRole("button", { name: "重新挑战 L2-1" })).toBeTruthy();
    expect(within(failureDialog).getByRole("button", { name: "返回 L2 关卡" })).toBeTruthy();
    expect(within(failureDialog).getByRole("button", { name: "查看解题方法" })).toBeTruthy();
    expect(failureDialog.textContent).not.toContain("下次努力");
    expect(failureDialog.textContent).not.toContain("继续看看");
    expect(screen.queryByText(/下次努力/)).toBeNull();
    expect(screen.queryByRole("button", { name: "再来一题" })).toBeNull();
    expect(screen.queryByRole("button", { name: "回到练习" })).toBeNull();
    expect(container.querySelector("main")?.getAttribute("data-submission-state")).toBe("failed-final");
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(true);

    const records = getPracticeRecordsByChild(child.parentId, child.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ completed: false, gaveUp: false, viewedAnswer: false, stars: 0, hintCount: 1, guidanceUsed: true, guidanceSource: "free", mode: "adventure", stageIndex: 1 });
    expect(adventureChild.adventureProgress[0]).toMatchObject({ bestStars: 2, completed: true });
    expect(onChildChanged).toHaveBeenCalledTimes(2);
    const guidanceChild = JSON.parse(localStorage.getItem("kids-sudoku-trainer:v2")!).children.find((item: ChildProfile) => item.id === child.id) as ChildProfile;
    expect(guidanceChild.guidanceUsage?.freeUsed).toBe(1);
    expect(guidanceChild.guidanceOperations).toHaveLength(1);

    fireEvent.click(within(failureDialog).getByRole("button", { name: "查看解题方法" }));
    const methodDialog = screen.getByRole("dialog", { name: "解题方法" });
    expect(methodDialog.textContent).toContain("唯一候选法");
    expect(methodDialog.textContent).not.toContain("正确答案");
    expect(methodDialog.textContent).not.toContain("显示答案");
    fireEvent.click(within(methodDialog).getByRole("button", { name: "我知道了" }));
    expect(screen.getByRole("dialog", { name: "本关暂未通过" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "重新挑战 L2-1" }));
    expect(onRetryAdventureStage).toHaveBeenCalledOnce();
    expect(getPracticeRecordsByChild(child.parentId, child.id)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "返回 L2 关卡" }));
    expect(onOpenAdventureLevel).toHaveBeenCalledWith(2);
  });

  test("exchanges one available star after free uses and never lowers historical stage stars on failure", async () => {
    const paidChild: ChildProfile = {
      ...child,
      currentLevel: 2,
      guidanceUsage: { date: getBusinessDate(), freeUsed: 3, paidUsed: 0 },
      guidanceOperations: [],
      spentStars: 0,
      adventureProgress: [{
        parentId: child.parentId,
        childId: child.id,
        level: 2,
        stageIndex: 1,
        completed: true,
        bestStars: 3,
        unlocked: true,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt
      }]
    };
    setStoredChild(paidChild);
    const { container } = render(
      <SudokuBoard
        child={paidChild}
        puzzle={{ ...puzzle, id: "paid-guidance-puzzle", level: 2, mode: "adventure", source: "stage", stageIndex: 1 }}
        onBack={vi.fn()}
        onNext={vi.fn()}
        onSave={vi.fn()}
        onPrint={vi.fn()}
        onBackToMap={vi.fn()}
        onBackToPractice={vi.fn()}
        onChildChanged={vi.fn()}
      />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));

    const dialog = screen.getByRole("dialog", { name: "兑换解题引导？" });
    expect(dialog.textContent).toContain("历史累计星星不会减少");
    expect(dialog.textContent).toContain("可用星星：3");
    fireEvent.click(within(dialog).getByRole("button", { name: "使用 1 星" }));
    expect(await screen.findByText(/第 1 级提示/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("guided-hint-backdrop"));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    const stored = JSON.parse(localStorage.getItem("kids-sudoku-trainer:v2")!).children[0] as ChildProfile;
    expect(stored.spentStars).toBe(1);
    expect(stored.guidanceUsage?.paidUsed).toBe(1);
    expect(stored.adventureProgress[0].bestStars).toBe(3);
    expect(getPracticeRecordsByChild(child.parentId, child.id)[0]).toMatchObject({
      completed: false,
      stars: 0,
      guidanceUsed: true,
      guidanceSource: "star"
    });
  });

  test("keeps guidance hidden when stars are unavailable", () => {
    const noStarChild: ChildProfile = {
      ...child,
      guidanceUsage: { date: getBusinessDate(), freeUsed: 3, paidUsed: 0 },
      guidanceOperations: [],
      spentStars: 0,
      adventureProgress: []
    };
    setStoredChild(noStarChild);
    const { container } = render(
      <SudokuBoard child={noStarChild} puzzle={{ ...puzzle, mode: "adventure", stageIndex: 1 }} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={vi.fn()} />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    expect(screen.getByRole("dialog", { name: "今日免费引导已用完" }).textContent).toContain("当前没有足够的可用星星");
    expect(screen.getByRole("button", { name: "继续答题" })).toBeTruthy();
    expect(screen.queryByText(/第 1 级提示/)).toBeNull();
  });

  test("does not reveal or mark guidance used when cloud saving fails", async () => {
    vi.stubEnv("VITE_CLOUD_API_URL", "https://sync.test/api/cloud");
    localStorage.setItem("kids-sudoku-cloud-session:v1", JSON.stringify({ token: "token-a", role: "parent", parentId: child.parentId }));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { container } = render(
      <SudokuBoard child={child} puzzle={{ ...puzzle, id: "save-failure-puzzle", mode: "adventure", stageIndex: 1 }} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={vi.fn()} />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    fireEvent.click(screen.getByRole("button", { name: "使用引导" }));

    expect((await screen.findByRole("alert")).textContent).toContain("暂时无法连接云端账号服务");
    expect(screen.queryByText(/第 1 级提示/)).toBeNull();
    expect(screen.getByText("提示 0")).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem("kids-sudoku-trainer:v2")!).children[0] as ChildProfile;
    expect(stored.guidanceOperations ?? []).toHaveLength(0);
    expect(stored.guidanceUsage?.freeUsed ?? 0).toBe(0);
  });

  test("offers guided help and a method dialog before retrying a failed puzzle", () => {
    const onBackToChapter = vi.fn();
    const { container } = render(
      <SudokuBoard child={child} puzzle={puzzle} onBack={vi.fn()} onNext={vi.fn()} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToChapter={onBackToChapter} onBackToPractice={vi.fn()} onChildChanged={vi.fn()} />
    );
    const wrong = puzzle.solution.map((row) => [...row]);
    wrong[0][1] = 3;
    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    fireEvent.click(screen.getByRole("button", { name: "使用解题引导" }));
    expect(screen.getByText(/第 1 级提示/)).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByTestId("guided-hint-backdrop"));
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "查看解题方法" }));
    expect(screen.getByRole("dialog", { name: "数独怎么玩？" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "返回本题" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "重新开始" }));
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(false);
    expect(container.querySelectorAll(".cell")[1].textContent).toBe("");

    fillPuzzle(container, wrong);
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "继续修改" }));
    fireEvent.click(screen.getByRole("button", { name: "暂不使用" }));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(screen.getByRole("button", { name: "返回当前大关" }));
    expect(onBackToChapter).toHaveBeenCalledOnce();
  });

  test("generates the next same-config puzzle through the continue action", () => {
    const onNext = vi.fn();
    render(
      <SudokuBoard child={child} puzzle={puzzle} onBack={vi.fn()} onNext={onNext} onSave={vi.fn()} onPrint={vi.fn()} onBackToMap={vi.fn()} onBackToPractice={vi.fn()} onChildChanged={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: "换一题" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "生成下一题" }));
    expect(onNext).toHaveBeenCalledTimes(1);
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
    expect(getPracticeRecordsByChild(child.parentId, child.id)[0]).toMatchObject({
      completed: false,
      gaveUp: true,
      viewedAnswer: true
    });
    expect(onChildChanged).toHaveBeenCalledTimes(1);
  });
});
