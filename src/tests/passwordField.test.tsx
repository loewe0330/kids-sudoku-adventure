import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PasswordField } from "../components/PasswordField";

describe("PasswordField", () => {
  test("toggles password visibility without losing the value", () => {
    render(<PasswordField label="测试密码" value="secret123" onChange={() => undefined} />);

    const input = screen.getByLabelText("测试密码") as HTMLInputElement;
    expect(input.type).toBe("password");

    const showButton = screen.getByRole("button", { name: "显示测试密码" });
    expect(showButton.textContent?.trim()).toBe("");

    fireEvent.click(showButton);
    expect(input.type).toBe("text");
    expect(input.value).toBe("secret123");

    const hideButton = screen.getByRole("button", { name: "隐藏测试密码" });
    expect(hideButton.textContent?.trim()).toBe("");

    fireEvent.click(hideButton);
    expect(input.type).toBe("password");
  });
});
