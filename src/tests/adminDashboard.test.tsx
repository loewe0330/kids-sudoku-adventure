import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdminDashboard } from "../components/AdminDashboard";
import { getAppStorage } from "../lib/storage";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("AdminDashboard actions", () => {
  test("covers demo data, import/export, parent create/edit/status/reset/delete buttons", async () => {
    const onChanged = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminDashboard onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "生成示例数据" }));
    await waitFor(() => expect(screen.getByText("已生成示例测试数据。")).toBeTruthy());
    expect(getAppStorage().parentAccounts.some((parent) => parent.username === "demo-parent")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "导出测试数据" }));
    const textarea = screen.getByPlaceholderText("导出的 JSON 会显示在这里，也可以粘贴 JSON 后导入。") as HTMLTextAreaElement;
    expect(textarea.value).toContain("demo-parent");
    fireEvent.click(screen.getByRole("button", { name: "导入测试数据" }));
    await waitFor(() => expect(screen.getByText("已导入测试数据。")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "新增家长" }));
    fireEvent.change(screen.getByLabelText("登录账号"), { target: { value: "qa-parent" } });
    fireEvent.change(screen.getByLabelText("家长昵称"), { target: { value: "测试家长" } });
    fireEvent.change(screen.getByLabelText("初始密码"), { target: { value: "qa123456" } });
    fireEvent.click(screen.getByRole("button", { name: "创建家长账号" }));

    await waitFor(() => expect(getAppStorage().parentAccounts.some((parent) => parent.username === "qa-parent")).toBe(true));
    const createdRow = screen.getByText("qa-parent").closest("tr");
    expect(createdRow).toBeTruthy();

    fireEvent.click(within(createdRow!).getByRole("button", { name: "编辑" }));
    fireEvent.change(screen.getByLabelText("家长昵称"), { target: { value: "测试家长改" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(getAppStorage().parentAccounts.find((parent) => parent.username === "qa-parent")?.displayName).toBe("测试家长改"));

    const editedRow = screen.getByText("qa-parent").closest("tr");
    expect(editedRow).toBeTruthy();
    fireEvent.click(within(editedRow!).getByRole("button", { name: "停用" }));
    expect(getAppStorage().parentAccounts.find((parent) => parent.username === "qa-parent")?.status).toBe("disabled");

    fireEvent.click(within(editedRow!).getByRole("button", { name: "重置密码" }));
    fireEvent.change(screen.getByLabelText("新密码"), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByLabelText("确认新密码"), { target: { value: "newpass123" } });
    fireEvent.click(screen.getByRole("button", { name: "确认重置密码" }));
    await waitFor(() => expect(screen.getByText("密码已重置。")).toBeTruthy());

    fireEvent.click(within(editedRow!).getByRole("button", { name: "删除" }));
    expect(getAppStorage().parentAccounts.some((parent) => parent.username === "qa-parent")).toBe(false);
  });
});
