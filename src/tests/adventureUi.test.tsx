import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdventureAppShell } from "../components/ui/AdventureAppShell";
import { AssetImage } from "../components/ui/AssetImage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { getAbilityDisplayModel } from "../lib/ability";
import type { ChildProfile } from "../types";

const child: ChildProfile = {
  id: "ui-child", parentId: "ui-parent", name: "安安", gradeLevel: "grade3",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  smartDifficultyEnabled: true, currentLevel: 1, adventureProgress: [],
  settings: { soundEnabled: true, immediateErrorFeedback: true, showTimer: true, practiceMode: "practice", successAnimationEnabled: true, reducedMotion: false }
};

beforeEach(() => localStorage.clear());

describe("forest adventure UI foundations", () => {
  test("AssetImage replaces a broken asset without blocking nearby content", () => {
    render(<div><AssetImage src="/missing.webp" alt="测试插画" /><strong>卡片标题</strong><button>继续</button></div>);
    fireEvent.error(screen.getByAltText("测试插画"));
    expect(screen.getByRole("img", { name: "测试插画" })).toBeTruthy();
    expect(screen.getByText("卡片标题")).toBeTruthy();
    expect(screen.getByRole("button", { name: "继续" })).toBeTruthy();
  });

  test("shared bottom navigation highlights the current page and connects all five routes", () => {
    const actions = { home: vi.fn(), adventure: vi.fn(), practice: vi.fn(), growth: vi.fn(), settings: vi.fn() };
    render(<AdventureAppShell child={child} ability={getAbilityDisplayModel(child, [])} view="growth" onHome={actions.home} onAdventure={actions.adventure} onPractice={actions.practice} onGrowth={actions.growth} onSettings={actions.settings} onSwitchChild={vi.fn()} onLogout={vi.fn()}><p>页面内容</p></AdventureAppShell>);
    const navigation = within(screen.getByRole("navigation", { name: "主导航" }));
    expect(navigation.getByRole("button", { name: "成长", current: "page" })).toBeTruthy();
    fireEvent.click(navigation.getByRole("button", { name: "首页" }));
    fireEvent.click(navigation.getByRole("button", { name: "闯关" }));
    fireEvent.click(navigation.getByRole("button", { name: "练习" }));
    fireEvent.click(navigation.getByRole("button", { name: "设置" }));
    expect(actions.home).toHaveBeenCalledOnce();
    expect(actions.adventure).toHaveBeenCalledOnce();
    expect(actions.practice).toHaveBeenCalledOnce();
    expect(actions.settings).toHaveBeenCalledOnce();
  });

  test("settings toggles persist UI preferences and use existing settings and sync callbacks", async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    const onSettingsChange = vi.fn();
    const { unmount } = render(<SettingsPage child={child} syncState={{ status: "synced", message: "已同步" }} cloudEnabled onSync={onSync} onSettingsChange={onSettingsChange} />);
    fireEvent.click(screen.getByLabelText("声音与音乐"));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ soundEnabled: false }));
    fireEvent.click(screen.getByLabelText("护眼模式"));
    expect(screen.getByLabelText<HTMLInputElement>("护眼模式").checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "同步数据" }));
    await waitFor(() => expect(onSync).toHaveBeenCalledOnce());
    unmount();
    render(<SettingsPage child={child} syncState={{ status: "synced", message: "已同步" }} cloudEnabled onSync={onSync} onSettingsChange={onSettingsChange} />);
    expect(screen.getByLabelText<HTMLInputElement>("护眼模式").checked).toBe(true);
  });
});
