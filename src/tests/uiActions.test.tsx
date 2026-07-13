import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ChildSelector } from "../components/ChildSelector";
import { ParentLogin } from "../components/ParentLogin";
import { PrintPreview } from "../components/PrintPreview";
import { createParentAccount, getAppStorage, getChildrenByParent } from "../lib/storage";
import type { ChildProfile, ParentAccount, SudokuPuzzleItem } from "../types";

const parent: ParentAccount = {
  id: "parent-a",
  username: "parent-a",
  displayName: "测试家长",
  passwordHash: "",
  status: "enabled",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const child: ChildProfile = {
  id: "child-a",
  parentId: parent.id,
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
  parentId: parent.id,
  childId: child.id,
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

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("cross-page UI actions", () => {
  test("parent login buttons handle success, errors and admin navigation", async () => {
    await createParentAccount({
      username: "parent-login",
      displayName: "登录家长",
      password: "login123",
      enabled: true
    });
    const onLoggedIn = vi.fn();
    const onAdminLink = vi.fn();
    render(<ParentLogin onLoggedIn={onLoggedIn} onAdminLink={onAdminLink} />);

    fireEvent.change(screen.getByLabelText("家长账号"), { target: { value: "missing" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "badpass" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    await waitFor(() => expect(screen.getByText("账号不存在，请联系管理者创建账号。")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("家长账号"), { target: { value: "parent-login" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "login123" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "管理者登录" }));
    expect(onAdminLink).toHaveBeenCalledTimes(1);
  });

  test("child selector creates, enters, edits, deletes and logs out", async () => {
    const onChanged = vi.fn();
    const onEnter = vi.fn();
    const onLogout = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ChildSelector parent={parent} onChanged={onChanged} onEnter={onEnter} onLogout={onLogout} />);

    fireEvent.change(screen.getByLabelText("孩子昵称"), { target: { value: "安安" } });
    fireEvent.click(screen.getByRole("button", { name: "star" }));
    fireEvent.click(screen.getByRole("button", { name: "创建孩子" }));
    await waitFor(() => expect(getChildrenByParent(parent.id)).toHaveLength(1));

    const card = screen.getByText("安安").closest("article");
    expect(card).toBeTruthy();
    fireEvent.click(within(card!).getByRole("button", { name: "进入练习" }));
    expect(onEnter).toHaveBeenCalledWith(getChildrenByParent(parent.id)[0].id);

    fireEvent.click(within(card!).getByRole("button", { name: "编辑" }));
    fireEvent.change(screen.getByLabelText("孩子昵称"), { target: { value: "安安改" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(getChildrenByParent(parent.id)[0].name).toBe("安安改"));

    const editedCard = screen.getByText("安安改").closest("article");
    expect(editedCard).toBeTruthy();
    fireEvent.click(within(editedCard!).getByRole("button", { name: "删除" }));
    expect(getChildrenByParent(parent.id)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test("print preview toggles options, changes per-page setting, prints and returns", () => {
    const onIncludeAnswers = vi.fn();
    const onBack = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    render(
      <PrintPreview
        child={child}
        puzzles={[puzzle]}
        includeAnswers
        onIncludeAnswers={onIncludeAnswers}
        onBack={onBack}
      />
    );

    fireEvent.change(screen.getByLabelText("每页题数"), { target: { value: "1" } });
    expect((screen.getByLabelText("每页题数") as HTMLSelectElement).value).toBe("1");

    fireEvent.click(screen.getByLabelText("附答案页"));
    expect(onIncludeAnswers).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByLabelText("打印数独规则"));
    expect(screen.queryByRole("heading", { name: "数独规则" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "打印" }));
    expect(print).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
