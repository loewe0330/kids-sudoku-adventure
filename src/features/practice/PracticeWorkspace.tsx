import { useEffect, useMemo, useState } from "react";
import { getDifficultyLevel } from "../../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../../constants/gradeLabels";
import { getCustomPracticeValidity, getPracticeLevelForSource, getAllowedCustomDifficulties } from "../../lib/practiceRules";
import type { ChildProfile, PracticeSource, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../../types";
import { PuzzleBank } from "../../components/PuzzleBank";
import type { PracticeTab } from "../../app/routes";

interface PracticeWorkspaceProps {
  child: ChildProfile;
  activeTab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
  manual: { size: SudokuSize; difficulty: SudokuDifficulty };
  onManualChange: (value: { size: SudokuSize; difficulty: SudokuDifficulty }) => void;
  onQuickPractice: (source: Exclude<PracticeSource, "custom" | "bank" | "stage">) => void;
  onGenerateCustom: (saveToBank: boolean, count: number) => void;
  onChanged: () => void;
  onPractice: (puzzle: SudokuPuzzleItem) => void;
  onPrint: (puzzles: SudokuPuzzleItem[], includeAnswers: boolean) => void;
}

export function PracticeWorkspace({
  child,
  activeTab,
  onTabChange,
  manual,
  onManualChange,
  onQuickPractice,
  onGenerateCustom,
  onChanged,
  onPractice,
  onPrint
}: PracticeWorkspaceProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [recommendedMode, setRecommendedMode] = useState<Exclude<PracticeSource, "custom" | "bank" | "stage">>("smart");
  const [customCount, setCustomCount] = useState(1);
  const [saveToBank, setSaveToBank] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [useSuggestedTime, setUseSuggestedTime] = useState(true);
  const allowedDifficulties = getAllowedCustomDifficulties(manual.size);
  const customValidity = getCustomPracticeValidity(manual.size, manual.difficulty);
  const quickOptions: Array<{
    source: Exclude<PracticeSource, "custom" | "bank" | "stage">;
    title: string;
    subtitle: string;
    description: string;
    button: string;
  }> = [
    { source: "smart", title: "今日推荐", subtitle: "推荐", description: "按当前能力等级推荐一题，适合今天的第一站。", button: "开始今日练习" },
    { source: "review", title: "巩固练习", subtitle: "巩固", description: "练一道稍简单的题，把基础练得更稳。", button: "开始巩固" },
    { source: "challenge", title: "挑战练习", subtitle: "挑战", description: "试试下一等级的题，看看能不能点亮新区域。", button: "开始挑战" }
  ];
  const selectedOption = quickOptions.find((option) => option.source === recommendedMode) ?? quickOptions[0];
  const selectedLevel = getPracticeLevelForSource(child.currentLevel, selectedOption.source);
  const selectedConfig = getDifficultyLevel(selectedLevel);
  const customDifficultyOptions = useMemo(
    () => allowedDifficulties.map((difficulty) => ({ value: difficulty, label: difficultyLabels[difficulty] })),
    [allowedDifficulties]
  );
  const customSummary = `${sizeLabels[manual.size]}｜${difficultyLabels[manual.difficulty]}｜${customCount}题`;

  useEffect(() => {
    if (!customOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCustomOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [customOpen]);

  const startCustomPractice = () => {
    if (!customValidity.valid) return;
    setCustomOpen(false);
    onGenerateCustom(saveToBank, customCount);
  };

  const renderPracticeSelection = () => (
    <div className="practice-choice-content">
      <div className="practice-intro practice-selection-copy camp-heading">
        <p className="eyebrow">任务选择营地</p>
        <h3>选择今天的探索任务</h3>
        <p>根据当前能力等级推荐题目，也可以选择今天想练的题型和难度。</p>
      </div>

      <div className="practice-choice-stack">
        <article className="quest-card recommended-practice-card">
          <div className="recommended-card-heading">
            <div>
              <p className="eyebrow">今日推荐</p>
              <h3>今日推荐练习</h3>
              <p>系统根据你的当前水平，为你准备了一道适合今天的题。</p>
            </div>
            <div className="practice-mode-switcher" role="group" aria-label="推荐练习模式">
              {quickOptions.map((option) => (
                <button
                  key={option.source}
                  type="button"
                  className={recommendedMode === option.source ? "active" : ""}
                  aria-pressed={recommendedMode === option.source}
                  onClick={() => setRecommendedMode(option.source)}
                >
                  {option.subtitle}
                </button>
              ))}
            </div>
          </div>
          <div className="recommendation-content">
            <div>
              <h4>{selectedOption.title}</h4>
              <p>{selectedOption.description}</p>
              <div className="quest-meta-row">
                <span>L{selectedLevel}</span>
                <span>{sizeLabels[selectedConfig.size]}</span>
                <span>{difficultyLabels[selectedConfig.difficulty]}</span>
              </div>
            </div>
            <button type="button" className="primary" onClick={() => onQuickPractice(selectedOption.source)}>{selectedOption.button}</button>
          </div>
        </article>

        <article className="quest-card custom-practice-card compact-custom-practice-card">
          <div>
            <p className="eyebrow">自由选择</p>
            <h3>自己选一题</h3>
            <p>自己选择题型、难度和题目数量。</p>
            <strong className="custom-config-summary">{customSummary}</strong>
          </div>
          <button type="button" onClick={() => setCustomOpen(true)}>设置并开始</button>
        </article>
      </div>

      <section className="practice-garden-decor" aria-hidden="true">
        <div className="garden-cloud garden-cloud-one" />
        <div className="garden-cloud garden-cloud-two" />
        <div className="garden-ground" />
        <div className="garden-path" />
        <div className="garden-sign"><span>练习营地</span></div>
        <div className="garden-sudoku-board">
          {Array.from({ length: 9 }, (_, index) => <span key={index}>{[4, "", 1, "", 3, "", 2, "", 4][index]}</span>)}
        </div>
        <div className="garden-pencil" />
        <div className="garden-flower flower-one" />
        <div className="garden-flower flower-two" />
        <div className="garden-flower flower-three" />
        <div className="garden-mushroom mushroom-one" />
        <div className="garden-mushroom mushroom-two" />
        <div className="garden-butterfly" />
        <div className="garden-firefly firefly-one" />
        <div className="garden-firefly firefly-two" />
        <div className="garden-chest" />
      </section>
    </div>
  );

  return (
    <main className="free-practice-page practice-workspace map-shell">
      <section className="free-practice-hero practice-title-strip explorer-card">
        <p className="eyebrow">{gradeLabels[child.gradeLevel]}</p>
        <h2>自由练习</h2>
        <p>不受闯关限制，选择适合今天的练习方式。</p>
      </section>

      <section className="practice-panel practice-hub-panel task-camp-card explorer-card">
        <nav className="practice-tabs" aria-label="自由练习分区">
          <button className={activeTab === "select" ? "active" : ""} type="button" onClick={() => onTabChange("select")}>练习选择</button>
          <button className={activeTab === "bank" ? "active" : ""} type="button" onClick={() => onTabChange("bank")}>我的题库</button>
          <button className={activeTab === "batch" ? "active" : ""} type="button" onClick={() => onTabChange("batch")}>批量出题</button>
          <button className={activeTab === "print" ? "active" : ""} type="button" onClick={() => onTabChange("print")}>打印练习</button>
        </nav>

        {activeTab === "select" && renderPracticeSelection()}
        {activeTab !== "select" && (
          <PuzzleBank
            child={child}
            activeTab={activeTab}
            onSelectPractice={() => onTabChange("select")}
            onChanged={onChanged}
            onPractice={onPractice}
            onPrint={onPrint}
          />
        )}
      </section>

      {customOpen && (
        <div
          className="practice-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCustomOpen(false);
          }}
        >
          <aside className="custom-practice-drawer custom-practice-modal custom-practice-bottom-sheet practice-settings-drawer" role="dialog" aria-modal="true" aria-labelledby="custom-practice-title">
            <header className="practice-drawer-header">
              <div>
                <p className="eyebrow">练习营地</p>
                <h2 id="custom-practice-title">自选练习设置</h2>
                <p>选择今天想练的题型、难度和题目数量。</p>
              </div>
              <button className="drawer-close-button" type="button" aria-label="关闭自选练习设置" onClick={() => setCustomOpen(false)}>×</button>
            </header>

            <form className="practice-settings-form" onSubmit={(event) => { event.preventDefault(); startCustomPractice(); }}>
              <fieldset className="practice-settings-group">
                <legend>题目设置</legend>
                <label>
                  题型
                  <select
                    value={manual.size}
                    onChange={(event) => {
                      const size = Number(event.target.value) as SudokuSize;
                      const nextDifficulties = getAllowedCustomDifficulties(size);
                      onManualChange({
                        size,
                        difficulty: nextDifficulties.includes(manual.difficulty) ? manual.difficulty : nextDifficulties[0]
                      });
                    }}
                  >
                    {[4, 6, 9].map((size) => <option key={size} value={size}>{sizeLabels[size as SudokuSize]}</option>)}
                  </select>
                </label>
                <label>
                  难度
                  <select value={manual.difficulty} onChange={(event) => onManualChange({ ...manual, difficulty: event.target.value as SudokuDifficulty })}>
                    {customDifficultyOptions.map((difficulty) => (
                      <option key={difficulty.value} value={difficulty.value}>{difficulty.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  题目数量
                  <select value={customCount} onChange={(event) => setCustomCount(Number(event.target.value))}>
                    {[1, 5, 10].map((count) => <option key={count} value={count}>{count} 题</option>)}
                  </select>
                </label>
              </fieldset>

              <fieldset className="practice-settings-group">
                <legend>练习辅助</legend>
                <label className="toggle-row">
                  <input type="checkbox" checked={showCandidates} onChange={(event) => setShowCandidates(event.target.checked)} />
                  显示候选数
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={useSuggestedTime} onChange={(event) => setUseSuggestedTime(event.target.checked)} />
                  开启建议时间
                </label>
              </fieldset>

              <fieldset className="practice-settings-group">
                <legend>题库设置</legend>
                <label className="toggle-row">
                  <input type="checkbox" checked={saveToBank} onChange={(event) => setSaveToBank(event.target.checked)} />
                  保存到题库
                </label>
              </fieldset>

              {!customValidity.valid && <p className="result-note">{customValidity.message}</p>}
              <footer className="practice-drawer-actions">
                <button className="primary" type="submit" disabled={!customValidity.valid}>开始自选练习</button>
                <button type="button" onClick={() => setCustomOpen(false)}>取消</button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
