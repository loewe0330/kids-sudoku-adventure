import { useEffect, useMemo, useRef, useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { ROUTES, childPath, matchChildRoute, type ChildRouteSection, type PracticeTab } from "./routes";
import { AdminDashboard, AdminLogin } from "../features/admin";
import { AdventureMap } from "../features/adventure";
import { ParentLogin, PasswordField } from "../features/auth";
import { ChildSelector } from "../features/children";
import { LearningCurve } from "../features/growth";
import { ChildDashboard } from "../features/home";
import { SudokuBoard } from "../features/play";
import { PracticeWorkspace } from "../features/practice";
import { PrintPreview } from "../features/print";
import {
  addPuzzleToBank,
  getActiveChild,
  getAppStorage,
  getCurrentParent,
  getCurrentSession,
  getPuzzlesByChild,
  initDefaultAdminIfNeeded,
  logoutParent,
  setActiveChild,
  updateCurrentParentPassword,
  updateChild
} from "../lib/storage";
import { generatePracticePuzzle } from "../lib/practiceRules";
import { generatePuzzleForChild } from "../lib/sudoku";
import { isCloudAccountEnabled } from "../lib/cloudClient";
import { getWebAppPathname, webNavigationAdapter } from "../platform/web/webNavigationAdapter";
import type { AdventureStage, PracticeMode, PracticeSource, SudokuDifficulty, SudokuPuzzleItem, SudokuSize, ViewMode } from "../types";

const defaultManual = { size: 4 as SudokuSize, difficulty: "starter" as SudokuDifficulty };

const sectionToView = (section: ChildRouteSection): ViewMode => {
  if (section === "home") return "home";
  if (section === "growth") return "growth";
  return section;
};

export default function App() {
  const [version, setVersion] = useState(0);
  const [path, setPath] = useState(getWebAppPathname);
  const [view, setView] = useState<ViewMode>(() => (getActiveChild() ? "home" : "selector"));
  const [activePuzzle, setActivePuzzle] = useState<SudokuPuzzleItem | null>(null);
  const [manual, setManual] = useState(defaultManual);
  const [printItems, setPrintItems] = useState<SudokuPuzzleItem[]>([]);
  const [printAnswers, setPrintAnswers] = useState(true);
  const [practiceTab, setPracticeTab] = useState<PracticeTab>("select");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const pendingPracticeTab = useRef<PracticeTab | null>(null);

  const session = useMemo(() => getCurrentSession(), [version]);
  const parent = useMemo(() => getCurrentParent(), [version]);
  const child = useMemo(() => getActiveChild(), [version]);

  useEffect(() => {
    void initDefaultAdminIfNeeded();
    const onPop = () => setPath(getWebAppPathname());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!child) setView("selector");
  }, [child]);

  useEffect(() => {
    if (path === ROUTES.ADMIN_LOGIN) return;
    if (path === "/") {
      webNavigationAdapter.replace(parent ? ROUTES.CHILDREN : ROUTES.PARENT_LOGIN);
      return;
    }
    if (!parent) {
      if (path !== ROUTES.PARENT_LOGIN) webNavigationAdapter.replace(ROUTES.PARENT_LOGIN);
      return;
    }
    if (path === ROUTES.PARENT_LOGIN) {
      webNavigationAdapter.replace(ROUTES.CHILDREN);
      return;
    }
    if (path === ROUTES.CHILDREN) {
      setView("selector");
      return;
    }
    const matched = matchChildRoute(path);
    if (!matched) return;
    const routeChild = getAppStorage().children.find((item) => item.parentId === parent.id && item.id === matched.childId);
    if (!routeChild) {
      webNavigationAdapter.replace(ROUTES.CHILDREN);
      return;
    }
    if (child?.id !== routeChild.id) {
      setActiveChild(routeChild.id);
      refresh();
    }
    const nextPracticeTab = pendingPracticeTab.current ?? matched.practiceTab;
    if (nextPracticeTab) setPracticeTab(nextPracticeTab);
    pendingPracticeTab.current = null;
    if (matched.canonicalPath) {
      pendingPracticeTab.current = matched.practiceTab ?? null;
      setView(sectionToView(matched.section));
      webNavigationAdapter.replace(matched.canonicalPath);
      return;
    }
    if (matched.section === "print" && printItems.length === 0) {
      pendingPracticeTab.current = "print";
      setPracticeTab("print");
      setView("practice");
      webNavigationAdapter.replace(childPath(routeChild.id, "practice"));
      return;
    }
    setView(sectionToView(matched.section));
  }, [path, parent, child?.id, printItems.length]);

  useEffect(() => {
    if (window.navigator.userAgent.toLowerCase().includes("jsdom")) return;
    try {
      window.scrollTo({ top: 0, left: 0 });
    } catch {
      // jsdom does not implement scrollTo; browsers do.
    }
  }, [view, path]);

  const refresh = () => setVersion((item) => item + 1);
  const navigate = (nextPath: string) => {
    webNavigationAdapter.goTo(nextPath);
    refresh();
  };

  if (path === ROUTES.ADMIN_LOGIN) {
    if (session?.role !== "admin") return <AdminLogin onLoggedIn={refresh} onParentLink={() => navigate(ROUTES.PARENT_LOGIN)} />;
    return <AdminDashboard onChanged={refresh} />;
  }

  if (!parent) {
    return <ParentLogin onLoggedIn={refresh} onAdminLink={() => navigate(ROUTES.ADMIN_LOGIN)} />;
  }

  const enterChild = (childId: string) => {
    setActiveChild(childId);
    navigate(childPath(childId, "home"));
  };

  const goChild = (section: ChildRouteSection) => {
    const current = getActiveChild();
    if (!current) return;
    if (section === "practice") setPracticeTab("select");
    setView(sectionToView(section));
    navigate(childPath(current.id, section));
  };

  const startPuzzle = (puzzle?: SudokuPuzzleItem, mode?: PracticeMode, stageIndex?: number, source?: PracticeSource) => {
    const current = getActiveChild();
    if (!current) return;
    const nextPuzzle = {
      ...(puzzle ?? generatePracticePuzzle({
        parentId: current.parentId,
        childId: current.id,
        gradeLevel: current.gradeLevel,
        currentLevel: current.currentLevel,
        source: source ?? "smart"
      })),
      mode: mode ?? puzzle?.mode ?? "practice",
      source: source ?? puzzle?.source ?? "smart",
      stageIndex: stageIndex ?? puzzle?.stageIndex
    };
    setActivePuzzle(nextPuzzle);
    setView("play");
    navigate(childPath(current.id, "play"));
  };

  const startPracticeBySource = (source: Exclude<PracticeSource, "custom" | "bank" | "stage">) => {
    const current = getActiveChild();
    if (!current) return;
    startPuzzle(generatePracticePuzzle({
      parentId: current.parentId,
      childId: current.id,
      gradeLevel: current.gradeLevel,
      currentLevel: current.currentLevel,
      source
    }), "practice", undefined, source);
  };

  const generateCustomPractice = (saveToBank: boolean, count: number) => {
    const current = getActiveChild();
    if (!current) return;
    const safeCount = Math.max(1, Math.min(30, count));
    const puzzles = Array.from({ length: safeCount }, () => generatePracticePuzzle({
      parentId: current.parentId,
      childId: current.id,
      gradeLevel: current.gradeLevel,
      currentLevel: current.currentLevel,
      source: "custom",
      custom: manual
    }));
    if (saveToBank) {
      puzzles.forEach((puzzle) => addPuzzleToBank(puzzle));
      refresh();
    }
    const puzzle = puzzles[0];
    setActivePuzzle(puzzle ?? null);
    setView("play");
    navigate(childPath(current.id, "play"));
  };

  const saveActivePuzzle = () => {
    if (!activePuzzle || !child) return;
    addPuzzleToBank({ ...activePuzzle, parentId: child.parentId, childId: child.id });
    refresh();
  };

  const openPrint = (items: SudokuPuzzleItem[], includeAnswers = true) => {
    const current = getActiveChild();
    setPrintItems(items);
    setPrintAnswers(includeAnswers);
    setView("print");
    if (current) navigate(childPath(current.id, "print"));
  };

  const startAdventureStage = (stage: AdventureStage) => {
    const current = getActiveChild();
    if (!current || !stage.unlocked) return;
    const puzzle = {
      ...generatePuzzleForChild({ ...current, currentLevel: stage.level }),
      mode: "adventure" as const,
      source: "stage" as const,
      stageIndex: stage.stageIndex
    };
    setActivePuzzle(puzzle);
    setView("play");
    navigate(childPath(current.id, "play"));
  };

  if (!child || view === "selector") {
    return (
      <ChildSelector
        parent={parent}
        onChanged={refresh}
        onEnter={enterChild}
        onLogout={refresh}
      />
    );
  }

  return (
    <div className={`app-shell child-shell ${view === "home" ? "home-shell" : ""} ${view === "play" ? "practice-shell" : ""} ${view === "practice" ? "free-practice-shell" : ""} ${view === "adventure" ? "adventure-shell" : ""} ${view === "growth" ? "growth-shell" : ""}`}>
      <header className="app-header compact-hero explorer-top-nav explorer-topbar no-print">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">数</span>
          <div>
            <p className="eyebrow">儿童数独分级训练</p>
            <h1>数独探险家</h1>
            <p>{child.name} · {gradeLabels[child.gradeLevel]} · 能力等级：{getDifficultyLevel(child.currentLevel).label}</p>
          </div>
        </div>
        <nav className="top-actions">
          <button className={view === "home" ? "active" : ""} onClick={() => goChild("home")}>首页</button>
          <button className={view === "adventure" ? "active" : ""} onClick={() => goChild("adventure")}>闯关</button>
          <button className={view === "practice" ? "active" : ""} onClick={() => goChild("practice")}>自由练习</button>
          <button className={view === "growth" ? "active" : ""} onClick={() => goChild("growth")}>成长</button>
        </nav>
        <nav className="utility-actions" aria-label="辅助工具">
          <button onClick={() => goChild("settings")}>设置</button>
          <button onClick={() => { setActiveChild(null); setView("selector"); navigate(ROUTES.CHILDREN); }}>切换孩子</button>
          <button onClick={() => { logoutParent(); setActivePuzzle(null); setView("selector"); navigate(ROUTES.PARENT_LOGIN); }}>退出登录</button>
        </nav>
      </header>

      {view === "home" && (
        <ChildDashboard
          child={child}
          onOpenPractice={() => goChild("practice")}
          onOpenCurve={() => goChild("growth")}
          onOpenAdventure={() => goChild("adventure")}
        />
      )}

      {view === "play" && activePuzzle && (
        <SudokuBoard
          child={child}
          puzzle={activePuzzle}
          onBack={() => {
            refresh();
            goChild("home");
          }}
          onNext={() => startPuzzle()}
          onSave={saveActivePuzzle}
          onPrint={(includeAnswer) => openPrint([activePuzzle], includeAnswer)}
          onBackToMap={() => goChild("adventure")}
          onBackToPractice={() => goChild("practice")}
          onChildChanged={refresh}
        />
      )}

      {view === "play" && !activePuzzle && (
        <section className="panel empty-play-panel">
          <h2>请选择一道题</h2>
          <p>可以从闯关地图开始挑战，也可以去练习选择生成新题。</p>
          <div className="section-actions">
            <button className="primary" onClick={() => goChild("adventure")}>去闯关</button>
            <button onClick={() => goChild("practice")}>去练习选择</button>
          </div>
        </section>
      )}

      {view === "adventure" && (
        <AdventureMap
          child={child}
          parentName={parent.displayName}
          onHome={() => goChild("home")}
          onOpenAdventure={() => goChild("adventure")}
          onOpenPractice={() => goChild("practice")}
          onOpenGrowth={() => goChild("growth")}
          onSwitchChild={() => { setActiveChild(null); setView("selector"); navigate(ROUTES.CHILDREN); }}
          onStartStage={startAdventureStage}
        />
      )}

      {view === "growth" && <LearningCurve child={child} />}

      {view === "practice" && (
        <PracticeWorkspace
          child={child}
          activeTab={practiceTab}
          onTabChange={setPracticeTab}
          manual={manual}
          onManualChange={setManual}
          onQuickPractice={startPracticeBySource}
          onGenerateCustom={generateCustomPractice}
          onChanged={refresh}
          onPractice={(puzzle) => startPuzzle(puzzle, "practice", undefined, "bank")}
          onPrint={(items, includeAnswers) => openPrint(items, includeAnswers)}
        />
      )}

      {view === "print" && (
        <PrintPreview
          child={child}
          puzzles={printItems}
          includeAnswers={printAnswers}
          onIncludeAnswers={setPrintAnswers}
          onBack={() => goChild("practice")}
        />
      )}

      {view === "settings" && (
        <section className="panel child-settings-page">
          <h2>设置</h2>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={child.settings.immediateErrorFeedback}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, immediateErrorFeedback: event.target.checked } });
                refresh();
              }}
            />
            即时错误反馈
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={child.settings.showTimer}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, showTimer: event.target.checked } });
                refresh();
              }}
            />
            显示计时器
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={child.settings.soundEnabled}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, soundEnabled: event.target.checked } });
                refresh();
              }}
            />
            声音提示
          </label>
          <label>
            练习模式
            <select
              value={child.settings.practiceMode}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, practiceMode: event.target.value as PracticeMode } });
                refresh();
              }}
            >
              <option value="practice">练习：不限时，只记录用时</option>
              <option value="adventure">闯关：显示建议完成时间</option>
              <option value="challenge">挑战：显示挑战时间</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={child.settings.successAnimationEnabled}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, successAnimationEnabled: event.target.checked } });
                refresh();
              }}
            />
            成功动画
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={child.settings.reducedMotion}
              onChange={(event) => {
                updateChild(parent.id, child.id, { settings: { ...child.settings, reducedMotion: event.target.checked } });
                refresh();
              }}
            />
            减少动画模式
          </label>
          <div className="child-form">
            <h3>修改家长登录密码</h3>
            <form
              className="password-settings-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (newPassword !== confirmPassword) {
                  setSettingsMessage("两次密码不一致。");
                  return;
                }
                try {
                  await updateCurrentParentPassword(currentPassword, newPassword);
                  setSettingsMessage("家长密码已修改。");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                } catch (error) {
                  setSettingsMessage(error instanceof Error ? error.message : "修改失败");
                }
              }}
            >
              <PasswordField label="当前密码" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
              <PasswordField label="新密码" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
              <PasswordField label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              <button className="primary" type="submit">修改密码</button>
            </form>
            {settingsMessage && <p className="result-note">{settingsMessage}</p>}
          </div>
        </section>
      )}

      <footer className="app-footer no-print">
        {isCloudAccountEnabled() ? "账号与学习数据已启用跨设备同步，当前浏览器保留本地缓存。" : "当前为本地测试模式，数据保存在当前浏览器。"}{child.name} · {getDifficultyLevel(child.currentLevel).label} · {sizeLabels[getDifficultyLevel(child.currentLevel).size]} · {difficultyLabels[getDifficultyLevel(child.currentLevel).difficulty]}
      </footer>
    </div>
  );
}
