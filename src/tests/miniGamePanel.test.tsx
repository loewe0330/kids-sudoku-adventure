import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MiniGameModal, MiniGamePanel } from "../components/MiniGamePanel";
import { getPracticeRecordsByChild } from "../lib/storage";
import type { MiniGameBoard } from "../lib/miniGame";

const playableBoard: MiniGameBoard = [
  ["star", "leaf", "star", "chest", "flag", "grass"],
  ["leaf", "star", "grass", "flag", "chest", "leaf"],
  ["flag", "star", "chest", "grass", "leaf", "flag"],
  ["grass", "chest", "leaf", "star", "flag", "grass"],
  ["chest", "flag", "grass", "leaf", "star", "chest"],
  ["leaf", "grass", "flag", "chest", "leaf", "star"]
];

afterEach(() => {
  vi.useRealTimers();
});

describe("MiniGamePanel", () => {
  test("opens the game and rules from the homepage panel", () => {
    render(<MiniGamePanel />);
    expect(screen.getByRole("heading", { name: "今日小游戏" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "星星连连消" })).toBeTruthy();
    expect(screen.getByText("已收集：").parentElement?.textContent).toContain("0/5 星星");

    fireEvent.click(screen.getByRole("button", { name: "查看规则" }));
    expect(screen.getByRole("dialog", { name: "星星连连消规则" })).toBeTruthy();
    expect(screen.getByText("小游戏奖励不会计入数独闯关星星。", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "关闭规则" }));

    fireEvent.click(screen.getByRole("button", { name: "开始小游戏" }));
    const modal = screen.getByRole("dialog", { name: "星星连连消" });
    expect(within(modal).getByRole("grid", { name: "星星连连消 6×6 棋盘" })).toBeTruthy();
    expect(within(modal).getAllByRole("gridcell")).toHaveLength(36);
  });

  test("does not exchange non-adjacent tiles", () => {
    render(<MiniGameModal initialBoard={playableBoard} onClose={vi.fn()} onResult={vi.fn()} />);
    const first = screen.getByRole("gridcell", { name: "第 1 行第 1 列，星星" });
    const distant = screen.getByRole("gridcell", { name: "第 3 行第 3 列，宝箱" });
    fireEvent.click(first);
    fireEvent.click(distant);
    expect(screen.getByRole("gridcell", { name: "第 1 行第 1 列，星星" })).toBeTruthy();
    expect(distant.getAttribute("aria-pressed")).toBe("true");
  });

  test("rolls back an adjacent swap that cannot make a match", () => {
    render(<MiniGameModal initialBoard={playableBoard} onClose={vi.fn()} onResult={vi.fn()} />);
    const leaf = screen.getByRole("gridcell", { name: "第 6 行第 5 列，叶子" });
    const star = screen.getByRole("gridcell", { name: "第 6 行第 6 列，星星" });
    fireEvent.click(leaf);
    fireEvent.click(star);
    expect(screen.getByRole("gridcell", { name: "第 6 行第 5 列，叶子" })).toBeTruthy();
    expect(screen.getByRole("gridcell", { name: "第 6 行第 6 列，星星" })).toBeTruthy();
  });

  test("resolves a three-match, adds score and collects star tiles", () => {
    vi.useFakeTimers();
    let value = 0;
    render(
      <MiniGameModal
        initialBoard={playableBoard}
        random={() => ((value += 0.17) % 1)}
        onClose={vi.fn()}
        onResult={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("gridcell", { name: "第 1 行第 2 列，叶子" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "第 2 行第 2 列，星星" }));
    act(() => vi.advanceTimersByTime(200));
    const status = screen.getByLabelText("小游戏状态");
    expect(within(status).getByText("00:30")).toBeTruthy();
    expect(within(status).getByText("3/5")).toBeTruthy();
  });

  test("shows a result when the countdown ends", () => {
    vi.useFakeTimers();
    const onResult = vi.fn();
    render(<MiniGameModal durationSeconds={1} initialBoard={playableBoard} onClose={vi.fn()} onResult={onResult} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "完成小游戏！" })).toBeTruthy();
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  test("does not create Sudoku records or change adventure stars", () => {
    localStorage.clear();
    render(<MiniGamePanel />);
    fireEvent.click(screen.getByRole("button", { name: "开始小游戏" }));
    fireEvent.click(screen.getByRole("button", { name: "结束游戏" }));
    expect(screen.getByRole("heading", { name: "完成小游戏！" })).toBeTruthy();
    expect(getPracticeRecordsByChild("parent-a", "child-a")).toEqual([]);
    expect(localStorage.length).toBe(0);
  });
});
