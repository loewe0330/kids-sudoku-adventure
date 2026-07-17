import { gradeLabels } from "../../constants/gradeLabels";
import type { AbilityDisplayModel } from "../../lib/ability";
import type { ChildProfile, ViewMode } from "../../types";
import { sudokuAdventureAssets } from "../../ui/assets/sudokuAdventureAssets";
import { AssetImage } from "./AssetImage";

interface AdventureAppShellProps {
  child: ChildProfile;
  ability: AbilityDisplayModel | null;
  view: ViewMode;
  children: React.ReactNode;
  onHome: () => void;
  onAdventure: () => void;
  onPractice: () => void;
  onGrowth: () => void;
  onSettings: () => void;
  onSwitchChild: () => void;
  onLogout: () => void;
}

const navItems = [
  { key: "home", label: "首页", icon: "⌂" },
  { key: "adventure", label: "闯关", icon: "◇" },
  { key: "practice", label: "练习", icon: "▦" },
  { key: "growth", label: "成长", icon: "↗" },
  { key: "settings", label: "设置", icon: "⚙" }
] as const;

export function AdventureAppShell({
  child,
  ability,
  view,
  children,
  onHome,
  onAdventure,
  onPractice,
  onGrowth,
  onSettings,
  onSwitchChild,
  onLogout
}: AdventureAppShellProps) {
  const actions = { home: onHome, adventure: onAdventure, practice: onPractice, growth: onGrowth, settings: onSettings };
  const activeKey = view === "fast-pass" ? "adventure" : view === "play" || view === "print" ? "practice" : view;

  return (
    <>
      <header className="adventure-app-header no-print">
        <button type="button" className="adventure-brand" onClick={onHome} aria-label="返回数独探险家首页">
          <AssetImage src={sudokuAdventureAssets.common.explorerMascot} alt="数独探险家吉祥物" className="adventure-brand-mascot" loading="eager" />
          <span><strong>数独探险家</strong><small>森林数独训练营</small></span>
        </button>
        <div className="adventure-child-summary">
          <AssetImage src={sudokuAdventureAssets.common.childAvatarBoy} alt={`${child.name}的头像`} className="adventure-child-avatar" loading="eager" />
          <span><strong>{child.name}</strong><small>{gradeLabels[child.gradeLevel]} · {ability?.title ?? "待探索"}</small></span>
        </div>
        <nav className="adventure-header-actions" aria-label="孩子与设置">
          <button type="button" aria-label="打开设置" onClick={onSettings}><span aria-hidden="true">⚙</span>设置</button>
          <button type="button" onClick={onSwitchChild}><span aria-hidden="true">⇄</span>切换</button>
          <button type="button" className="adventure-logout" onClick={onLogout}>退出</button>
        </nav>
      </header>

      <div className="adventure-page-content">{children}</div>

      <nav className="adventure-bottom-nav mobile-bottom-nav no-print" aria-label="主导航">
        {navItems.map((item) => (
          <button key={item.key} type="button" className={activeKey === item.key ? "active" : ""} aria-current={activeKey === item.key ? "page" : undefined} onClick={actions[item.key]}>
            <span aria-hidden="true">{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </>
  );
}
