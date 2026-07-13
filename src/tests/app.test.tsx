import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import App from "../App";

beforeEach(() => {
  localStorage.clear();
  window.history.pushState(null, "", "/");
});

describe("app entry", () => {
  test("shows parent login when there is no parent session", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "家长登录" })).toBeTruthy();
    expect(screen.getByText("家长只能使用管理者提前创建的测试账号登录。")).toBeTruthy();
  });

  test("admin login exposes an entry back to parent login", () => {
    window.history.pushState(null, "", "/admin");

    render(<App />);

    expect(screen.getByRole("heading", { name: "管理者后台" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "进入家长登录" })).toBeTruthy();
  });
});
