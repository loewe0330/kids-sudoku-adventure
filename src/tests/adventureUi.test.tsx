import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
// @ts-expect-error Vitest runs in Node; the application build intentionally omits Node typings.
import { readFileSync } from "node:fs";
import { AdventureAppShell } from "../components/ui/AdventureAppShell";
import { AssetImage } from "../components/ui/AssetImage";
import { ExplorerHomePage } from "../components/ChildDashboard";
import { SettingsPage } from "../features/settings/SettingsPage";
import { getAbilityDisplayModel } from "../lib/ability";
import type { ChildProfile } from "../types";

const adventureThemeCss = readFileSync("src/styles/sudoku-adventure-theme.css", "utf8");

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
    const onLogout = vi.fn();
    const { unmount } = render(<SettingsPage child={child} syncState={{ status: "synced", message: "已同步" }} cloudEnabled onSync={onSync} onSettingsChange={onSettingsChange} onLogout={onLogout} />);
    fireEvent.click(screen.getByLabelText("声音与音乐"));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ soundEnabled: false }));
    fireEvent.click(screen.getByLabelText("护眼模式"));
    expect(screen.getByLabelText<HTMLInputElement>("护眼模式").checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "同步数据" }));
    await waitFor(() => expect(onSync).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
    expect(onLogout).toHaveBeenCalledOnce();
    unmount();
    render(<SettingsPage child={child} syncState={{ status: "synced", message: "已同步" }} cloudEnabled onSync={onSync} onSettingsChange={onSettingsChange} onLogout={onLogout} />);
    expect(screen.getByLabelText<HTMLInputElement>("护眼模式").checked).toBe(true);
  });

  test("collapses home and settings disclosures when the empty backdrop is pressed", () => {
    const actions = { practice: vi.fn(), curve: vi.fn(), adventure: vi.fn(), fastPass: vi.fn() };
    const home = render(<ExplorerHomePage child={child} onOpenPractice={actions.practice} onOpenCurve={actions.curve} onOpenAdventure={actions.adventure} onOpenFastPass={actions.fastPass} />);
    fireEvent.click(screen.getByText("探险休息站 · 数独小游戏"));
    fireEvent.mouseDown(screen.getByTestId("home-disclosure-backdrop"));
    expect(screen.queryByTestId("home-disclosure-backdrop")).toBeNull();
    home.unmount();

    render(<SettingsPage child={child} syncState={{ status: "synced", message: "已同步" }} cloudEnabled onSync={vi.fn()} onSettingsChange={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("展开关于我们"));
    fireEvent.mouseDown(screen.getByTestId("settings-disclosure-backdrop"));
    expect(screen.queryByTestId("settings-disclosure-backdrop")).toBeNull();
  });
});

describe("fixed-device responsive contracts", () => {
  test("phone layout protects width, touch targets and bottom navigation", () => {
    expect(adventureThemeCss).toContain("@media (max-width: 430px)");
    expect(adventureThemeCss).toContain("overflow-x: clip");
    expect(adventureThemeCss).toContain("calc(80px + env(safe-area-inset-bottom))");
    expect(adventureThemeCss).toMatch(/\.adventure-bottom-nav\.mobile-bottom-nav button \{ min-height: 48px/);
    expect(adventureThemeCss).toMatch(/\.forest-practice-entry-grid \{ gap: 6px/);
    expect(adventureThemeCss).toMatch(/\.forest-growth-metrics \{ gap: 6px/);
    expect(adventureThemeCss).toContain(".practice-more-modes:not([open]) > :not(summary)");
    expect(adventureThemeCss).toContain(".settings-row-details:not([open]) > :not(summary) { display: none; }");
  });

  test("369px phone home keeps every primary section in one compact viewport", () => {
    expect(adventureThemeCss).toMatch(/\.home-shell \.adventure-app-header \{[\s\S]*?height: 72px/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.forest-today-task \{[\s\S]*?height: 92px/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.forest-map-card \{[^}]*height: 136px/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.forest-home-entries \.feature-entry-card \{[\s\S]*?height: 60px/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.home-mini-game-disclosure \{ margin-top: 4px/);
    expect(adventureThemeCss).toContain("@media (max-width: 430px) and (max-height: 630px)");
  });

  test("phone-only child pages use one-screen compositions with secondary detail panels", () => {
    expect(adventureThemeCss).toContain("Phone-only one-screen compositions");
    expect(adventureThemeCss).toMatch(/\.home-shell \.home-mini-game-disclosure\[open\] \{[\s\S]*?position: fixed[\s\S]*?grid-template-rows: 44px minmax\(0, 1fr\)/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.home-mini-game-disclosure\[open\] \.mini-game-panel \{[\s\S]*?overflow-y: auto/);
    expect(adventureThemeCss).toMatch(/\.free-practice-shell \.forest-practice-page \{[\s\S]*?grid-template-rows: 68px minmax\(0, 1fr\) 40px/);
    expect(adventureThemeCss).toMatch(/\.free-practice-shell \.forest-practice-entry-grid \.feature-entry-card \{[\s\S]*?grid-template-columns: 62px minmax\(0, 1fr\)/);
    expect(adventureThemeCss).toMatch(/\.free-practice-shell \.forest-practice-entry-grid \.feature-entry-art \{ width: 58px; height: 58px/);
    expect(adventureThemeCss).toMatch(/\.free-practice-shell \.practice-more-modes\[open\] \{[\s\S]*?position: fixed[\s\S]*?grid-template-rows: 44px 64px/);
    expect(adventureThemeCss).toMatch(/\.free-practice-shell \.practice-more-modes\[open\] > div \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.growth-shell \.forest-growth-page \{[\s\S]*?grid-template-rows: 72px 112px 216px 36px/);
    expect(adventureThemeCss).toMatch(/\.growth-shell \.forest-growth-hero \{[\s\S]*?background: linear-gradient\(100deg, #dff4e6 0 32%, #fffdf1 58% 100%\)/);
    expect(adventureThemeCss).toMatch(/\.growth-shell \.forest-growth-hero-art \{[\s\S]*?width: 128px/);
    expect(adventureThemeCss).toMatch(/\.settings-shell \.adventure-settings-page \{[\s\S]*?grid-template-rows: 46px 72px 300px 44px/);
    expect(adventureThemeCss).toMatch(/\.adventure-shell \.touch-adventure-map \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.adventure-detail-route \.touch-stage-grid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.practice-shell:not\(\.free-practice-shell\):not\(\.fast-pass-shell\) \.practice-layout \{[\s\S]*?grid-template-rows: 80px minmax\(0, 1fr\) 98px/);
    expect(adventureThemeCss).toMatch(/\.app-shell\.fast-pass-shell \.adventure-page-content \{[\s\S]*?padding-bottom: env\(safe-area-inset-bottom\)/);
    expect(adventureThemeCss).toMatch(/\.fast-pass-shell \.fast-pass-challenge-page \.practice-layout \{[\s\S]*?grid-template-areas:[\s\S]*?"board"[\s\S]*?"actions"/);
    expect(adventureThemeCss).toMatch(/\.settings-shell \.adventure-settings-page \{[\s\S]*?grid-template-rows: 42px 68px 284px 44px/);
  });

  test("portrait tablet uses four summary columns and two-column content grids", () => {
    expect(adventureThemeCss).toContain("@media (min-width: 431px) and (max-width: 899px)");
    expect(adventureThemeCss).toMatch(/\.forest-growth-metrics \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.forest-growth-accordions \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.adventure-settings-list \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  });

  test("landscape tablet has dedicated home, practice, growth and settings compositions", () => {
    expect(adventureThemeCss).toContain("@media (min-width: 900px) and (max-width: 1199px) and (orientation: landscape)");
    expect(adventureThemeCss).toMatch(/\.forest-home-page \{[\s\S]*?grid-template-columns: minmax\(0, 1\.55fr\) minmax\(300px, \.8fr\)/);
    expect(adventureThemeCss).toMatch(/\.forest-practice-page \{[\s\S]*?grid-template-columns: minmax\(250px, \.7fr\) minmax\(0, 1\.45fr\)/);
    expect(adventureThemeCss).toMatch(/\.forest-growth-page \{[\s\S]*?grid-template-columns: minmax\(340px, \.9fr\) minmax\(0, 1\.25fr\)/);
    expect(adventureThemeCss).toMatch(/\.adventure-settings-page \{[\s\S]*?grid-template-columns: minmax\(300px, \.72fr\) minmax\(0, 1\.45fr\)/);
    expect(adventureThemeCss).toContain("Fixed iPad landscape composition: 1120 x 738");
    expect(adventureThemeCss).toMatch(/\.adventure-shell \.touch-adventure-map \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)[\s\S]*?grid-template-rows: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(adventureThemeCss).toMatch(/\.adventure-detail-route \.touch-chapter-detail \{[\s\S]*?grid-template-columns: minmax\(320px, \.78fr\) minmax\(0, 1\.35fr\)/);
    expect(adventureThemeCss).toMatch(/\.forest-home-entries \.feature-entry-art \{ width: 114px; height: 114px/);
    expect(adventureThemeCss).toMatch(/\.home-shell \.home-mini-game-disclosure\[open\] \.mini-game-panel \{[\s\S]*?overflow: hidden/);
    expect(adventureThemeCss).toMatch(/\.growth-shell \.adventure-accordion\.is-open \{[\s\S]*?grid-template-rows: 76px auto/);
    expect(adventureThemeCss).toMatch(/\.settings-row-details\[open\] > div \.adventure-toggle > em \{[\s\S]*?position: static/);
    expect(adventureThemeCss).toMatch(/\.practice-shell:not\(\.free-practice-shell\):not\(\.fast-pass-shell\) \.practice-layout,[\s\S]*?grid-template-areas: "info board actions"/);
    expect(adventureThemeCss).toMatch(/\.fast-pass-shell:has\(\.fast-pass-challenge-page\) \.adventure-app-header,[\s\S]*?display: none/);
  });

  test("responsive imagery and typography avoid whole-page scaling", () => {
    render(<AssetImage src="/responsive-image.webp" alt="响应式插画" objectFit="cover" />);
    expect(screen.getByRole<HTMLImageElement>("img", { name: "响应式插画" }).style.objectFit).toBe("cover");
    expect(adventureThemeCss).toContain("overflow-wrap: anywhere");
    expect(adventureThemeCss).not.toMatch(/\.child-shell\s*\{[^}]*transform:\s*scale/);
  });
});
