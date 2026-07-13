import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { RewardResultCard } from "../components/RewardResultCard";
import type { Badge, ChildProfile } from "../types";

const settings = (overrides: Partial<ChildProfile["settings"]> = {}): ChildProfile["settings"] => ({
  soundEnabled: false,
  immediateErrorFeedback: true,
  showTimer: true,
  practiceMode: "adventure",
  successAnimationEnabled: true,
  reducedMotion: false,
  ...overrides
});

const badges: Badge[] = [{ id: "practice-streak", name: "坚持练习星", description: "连续完成 3 题" }];

describe("RewardResultCard", () => {
  const renderCard = (mode: "adventure" | "practice" | "challenge" = "adventure", overrides: { stars?: number; settings?: ChildProfile["settings"] } = {}) => {
    const onPrimaryAction = vi.fn();
    const onSecondaryAction = vi.fn();
    const result = render(
      <RewardResultCard
        settings={overrides.settings ?? settings()}
        completed
        mode={mode}
        duration={67}
        mistakes={0}
        hints={0}
        stars={overrides.stars ?? 3}
        currentTitle="L5 数独小侦探"
        adaptiveMessage="当前难度很适合你，再稳定练几题就有机会升级。"
        nextSuggestion="下一题建议：继续挑战 L5-2。"
        unlockMessage="已解锁 L5-2。"
        badges={badges}
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />
    );
    return { ...result, onPrimaryAction, onSecondaryAction };
  };

  test("shows only the concise three-star reward by default", () => {
    renderCard();

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "恭喜完成！" })).toBeTruthy();
    expect(screen.getByText("★★★")).toBeTruthy();
    expect(screen.getByText("又快又准，获得 3 颗星！")).toBeTruthy();
    expect(document.querySelectorAll(".reward-encouragement")).toHaveLength(1);
    expect(screen.getByLabelText("本题表现").textContent).toContain("用时1:07错误0提示0");
    expect(screen.queryByText(/当前称号/)).toBeNull();
    expect(screen.queryByText(/当前难度很适合你/)).toBeNull();
    expect(screen.queryByText(/坚持练习星/)).toBeNull();
    expect(screen.getByTestId("success-animation")).toBeTruthy();
  });

  test("uses adventure actions and reveals details only after request", () => {
    const actions = renderCard("adventure");

    expect(screen.getByRole("button", { name: "继续下一关" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "回到地图" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "回到地图" }));
    expect(actions.onPrimaryAction).toHaveBeenCalledOnce();
    expect(actions.onSecondaryAction).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(screen.getByText(/本题模式：/).parentElement?.textContent).toContain("闯关");
    expect(screen.getByText(/当前称号：/).parentElement?.textContent).toContain("L5 数独小侦探");
    expect(screen.getByText(/智能难度：/).parentElement?.textContent).toContain("当前难度很适合你");
    expect(screen.getByText(/下一步：/).parentElement?.textContent).toContain("继续挑战 L5-2");
    expect(screen.getByText(/闯关进度：/).parentElement?.textContent).toContain("已解锁 L5-2");
  });

  test("uses practice actions", () => {
    renderCard("practice", { stars: 2 });
    expect(screen.getByRole("heading", { name: "完成啦！" })).toBeTruthy();
    expect(screen.getByText("完成得不错，继续保持！")).toBeTruthy();
    expect(screen.getByRole("button", { name: "再练一题" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "回到自由练习" })).toBeTruthy();
  });

  test("uses fallback actions for challenge mode and keeps zero-star feedback gentle", () => {
    renderCard("challenge", { stars: 0 });
    expect(screen.getByText("这题有点难，下次可以先用提示试试。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成下一题" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "返回" })).toBeTruthy();
    expect(screen.queryByTestId("success-animation")).toBeNull();
  });

  test("hides success animation when animation is disabled or reduced motion is enabled", () => {
    const { unmount } = renderCard("adventure", { settings: settings({ successAnimationEnabled: false }) });
    expect(screen.queryByTestId("success-animation")).toBeNull();
    unmount();
    renderCard("adventure", { settings: settings({ reducedMotion: true }) });
    expect(screen.queryByTestId("success-animation")).toBeNull();
  });
});
