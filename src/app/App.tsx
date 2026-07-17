import { useEffect, useMemo, useRef, useState } from "react";
import { ROUTES, childAdventurePath, childPath, matchChildRoute, type ChildRouteSection, type PracticeTab } from "./routes";
import { AdminDashboard, AdminLogin } from "../features/admin";
import { AdventureMap, FastPassFlow } from "../features/adventure";
import { ParentLogin } from "../features/auth";
import { ChildSelector } from "../features/children";
import { LearningCurve } from "../features/growth";
import { ChildDashboard } from "../features/home";
import { SudokuBoard } from "../features/play";
import { PracticeWorkspace } from "../features/practice";
import { PrintPreview } from "../features/print";
import { SettingsPage } from "../features/settings";
import { AdventureAppShell } from "../components/ui/AdventureAppShell";
import {
  addPuzzleToBank,
  getActiveChild,
  getAppStorage,
  getCurrentParent,
  getCurrentSession,
  getPracticeRecordsByChild,
  getPuzzlesByChild,
  initDefaultAdminIfNeeded,
  getStorageSyncState,
  logoutParent,
  setActiveChild,
  subscribeStorageSyncState,
  synchronizeAppStorage,
  updateChild
} from "../lib/storage";
import { getAbilityDisplayModel } from "../lib/ability";
import { getAdventureMap } from "../lib/adventure";
import { getDailyPracticeRecommendation, type DailyPracticeRecommendation } from "../lib/dailyPracticeRecommendation";
import { generatePracticePuzzle, generateReplacementPuzzle } from "../lib/practiceRules";
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
  const [syncState, setSyncState] = useState(getStorageSyncState);
  const pendingPracticeTab = useRef<PracticeTab | null>(null);

  const session = useMemo(() => getCurrentSession(), [version]);
  const parent = useMemo(() => getCurrentParent(), [version]);
  const child = useMemo(() => getActiveChild(), [version]);
  const ability = useMemo(
    () => child ? getAbilityDisplayModel(child, getPracticeRecordsByChild(child.parentId, child.id)) : null,
    [child, version]
  );
  const adventureLevel = useMemo(() => {
    const matched = matchChildRoute(path);
    return matched?.section === "adventure" ? matched.adventureLevel : undefined;
  }, [path]);

  useEffect(() => {
    void initDefaultAdminIfNeeded();
    const onPop = () => setPath(getWebAppPathname());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => subscribeStorageSyncState((nextState) => {
    setSyncState(nextState);
    if (nextState.status === "synced") setVersion((item) => item + 1);
  }), []);

  useEffect(() => {
    if (!parent || !isCloudAccountEnabled()) return;
    let active = true;
    void synchronizeAppStorage()
      .then(() => {
        if (active) setVersion((item) => item + 1);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [parent?.id]);

  useEffect(() => {
    if (!parent || !isCloudAccountEnabled()) return;
    const syncAndRefresh = () => {
      void synchronizeAppStorage().then(() => setVersion((item) => item + 1)).catch(() => undefined);
    };
    window.addEventListener("focus", syncAndRefresh);
    window.addEventListener("online", syncAndRefresh);
    return () => {
      window.removeEventListener("focus", syncAndRefresh);
      window.removeEventListener("online", syncAndRefresh);
    };
  }, [parent?.id]);

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

  const handleLogout = () => {
    logoutParent();
    setActivePuzzle(null);
    setView("selector");
    navigate(ROUTES.PARENT_LOGIN);
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

  const replaceActivePuzzle = () => {
    if (!activePuzzle) return;
    setActivePuzzle(generateReplacementPuzzle(activePuzzle));
  };

  const startPracticeBySource = (
    source: Exclude<PracticeSource, "custom" | "bank" | "stage">,
    recommendation?: DailyPracticeRecommendation
  ) => {
    const current = getActiveChild();
    if (!current) return;
    const dailyRecommendation = source === "smart"
      ? recommendation ?? getDailyPracticeRecommendation({
        child: current,
        practiceRecords: getPracticeRecordsByChild(current.parentId, current.id)
      })
      : undefined;
    startPuzzle(generatePracticePuzzle({
      parentId: current.parentId,
      childId: current.id,
      gradeLevel: current.gradeLevel,
      currentLevel: dailyRecommendation?.level ?? current.currentLevel,
      source,
      recommendedConfig: dailyRecommendation
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

  const startAdventureStageById = (level: number, stageIndex: number) => {
    const current = getActiveChild();
    if (!current) return;
    const stage = getAdventureMap(current).find((item) => item.level === level && item.stageIndex === stageIndex);
    if (stage) startAdventureStage(stage);
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
    <div className={`app-shell child-shell ${view === "home" ? "home-shell" : ""} ${view === "play" || view === "fast-pass" ? "practice-shell" : ""} ${view === "practice" ? "free-practice-shell" : ""} ${view === "adventure" ? "adventure-shell" : ""} ${view === "fast-pass" ? "fast-pass-shell" : ""} ${adventureLevel ? "adventure-detail-route" : ""} ${view === "growth" ? "growth-shell" : ""} ${view === "settings" ? "settings-shell" : ""}`}>
      <AdventureAppShell
        child={child}
        ability={ability}
        view={view}
        onHome={() => goChild("home")}
        onAdventure={() => goChild("adventure")}
        onPractice={() => goChild("practice")}
        onGrowth={() => goChild("growth")}
        onSettings={() => goChild("settings")}
        onSwitchChild={() => { setActiveChild(null); setView("selector"); navigate(ROUTES.CHILDREN); }}
        onLogout={handleLogout}
      >

      {view === "home" && (
        <ChildDashboard
          child={child}
          onOpenPractice={() => goChild("practice")}
          onOpenCurve={() => goChild("growth")}
          onOpenAdventure={() => goChild("adventure")}
          onOpenFastPass={() => goChild("fast-pass")}
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
          onNext={replaceActivePuzzle}
          onRetryAdventureStage={replaceActivePuzzle}
          onSave={saveActivePuzzle}
          onPrint={(includeAnswer) => openPrint([activePuzzle], includeAnswer)}
          onBackToMap={() => goChild("adventure")}
          onBackToChapter={() => {
            if ((activePuzzle.mode ?? child.settings.practiceMode) === "adventure") {
              setView("adventure");
              navigate(childAdventurePath(child.id, activePuzzle.level));
            } else {
              goChild("practice");
            }
          }}
          onStartAdventureStage={startAdventureStageById}
          onOpenAdventureLevel={(level) => {
            setView("adventure");
            navigate(childAdventurePath(child.id, level));
          }}
          onOpenGrowth={() => goChild("growth")}
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
          detailLevel={adventureLevel}
          onOpenChapter={(level) => navigate(childAdventurePath(child.id, level))}
          onBackToMap={() => navigate(childAdventurePath(child.id))}
          onStartStage={startAdventureStage}
          onOpenFastPass={() => goChild("fast-pass")}
        />
      )}

      {view === "fast-pass" && (
        <FastPassFlow
          child={child}
          onBackToMap={() => goChild("adventure")}
          onOpenLevel={(level) => {
            setView("adventure");
            navigate(childAdventurePath(child.id, level));
          }}
          onChildChanged={refresh}
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
        <SettingsPage
          child={child}
          syncState={syncState}
          cloudEnabled={isCloudAccountEnabled()}
          onSync={() => synchronizeAppStorage().then(() => refresh())}
          onSettingsChange={(settings) => {
            updateChild(parent.id, child.id, { settings });
            refresh();
          }}
          onLogout={handleLogout}
        />
      )}
      </AdventureAppShell>
    </div>
  );
}
