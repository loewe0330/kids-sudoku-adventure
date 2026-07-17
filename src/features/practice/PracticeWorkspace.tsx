import { useEffect, useMemo, useState } from "react";
import { getDifficultyLevel } from "../../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../../constants/gradeLabels";
import { getDailyPracticeRecommendation, type DailyPracticeRecommendation } from "../../lib/dailyPracticeRecommendation";
import { getCustomPracticeValidity, getPracticeLevelForSource, getAllowedCustomDifficulties } from "../../lib/practiceRules";
import { getPracticeRecordsByChild } from "../../lib/storage";
import type { ChildProfile, PracticeSource, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../../types";
import { PuzzleBank } from "../../components/PuzzleBank";
import type { PracticeTab } from "../../app/routes";

interface PracticeWorkspaceProps {
  child: ChildProfile;
  activeTab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
  manual: { size: SudokuSize; difficulty: SudokuDifficulty };
  onManualChange: (value: { size: SudokuSize; difficulty: SudokuDifficulty }) => void;
  onQuickPractice: (
    source: Exclude<PracticeSource, "custom" | "bank" | "stage">,
    recommendation?: DailyPracticeRecommendation
  ) => void;
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
  const practiceRecords = getPracticeRecordsByChild(child.parentId, child.id);
  const dailyRecommendation = getDailyPracticeRecommendation({ child, practiceRecords });
  const quickOptions: Array<{
    source: Exclude<PracticeSource, "custom" | "bank" | "stage">;
    title: string;
    subtitle: string;
    hint: string;
    description: string;
    button: string;
  }> = [
    { source: "smart", title: "今日推荐", subtitle: "推荐", hint: "适合现在", description: "", button: "开始今日推荐" },
    { source: "review", title: "巩固练习", subtitle: "巩固", hint: "打稳基础", description: "练一道稍简单的题，把基础练得更稳。", button: "开始巩固" },
    { source: "challenge", title: "挑战练习", subtitle: "挑战", hint: "试试进阶", description: "试试下一等级的题，看看能不能点亮新区域。", button: "开始挑战" }
  ];
  const selectedOption = quickOptions.find((option) => option.source === recommendedMode) ?? quickOptions[0];
  const selectedLevel = getPracticeLevelForSource(child.currentLevel, selectedOption.source);
  const selectedConfig = selectedOption.source === "smart" ? dailyRecommendation : getDifficultyLevel(selectedLevel);
  const selectedTitle = selectedOption.source === "smart" ? dailyRecommendation.title : selectedOption.title;
  const selectedDescription = selectedOption.source === "smart" ? dailyRecommendation.reason : selectedOption.description;
  const selectedBadge = selectedOption.source === "smart" ? dailyRecommendation.badge : `L${selectedLevel}`;
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
    <div className="practice-choice-content practice-overview">
      <header className="practice-overview-heading">
        <div>
          <p className="eyebrow">今日练习</p>
          <h3>今天想怎么练？</h3>
        </div>
        <span>选一种，马上开始</span>
      </header>

      <div className="practice-mode-picker" role="group" aria-label="推荐练习模式">
        {quickOptions.map((option) => (
          <button
            key={option.source}
            type="button"
            className={recommendedMode === option.source ? "active" : ""}
            aria-pressed={recommendedMode === option.source}
            onClick={() => setRecommendedMode(option.source)}
          >
            <strong>{option.title}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>

      <article className="practice-focus-card" aria-live="polite">
        <div className="practice-focus-copy">
          <div className="practice-focus-title">
            <span>{selectedOption.subtitle}</span>
            <h4>{selectedTitle}</h4>
          </div>
          <p>{selectedDescription}</p>
          <div className="quest-meta-row">
            <span>{selectedBadge}</span>
            <span>{sizeLabels[selectedConfig.size]}</span>
            <span>{difficultyLabels[selectedConfig.difficulty]}</span>
          </div>
        </div>
        <button
          type="button"
          className="primary practice-start-button"
          onClick={() => selectedOption.source === "smart"
            ? onQuickPractice(selectedOption.source, dailyRecommendation)
            : onQuickPractice(selectedOption.source)}
        >
          {selectedOption.button}
        </button>
      </article>

      <article className="practice-custom-entry">
        <div>
          <p className="eyebrow">自由设置</p>
          <h3>自己选练习</h3>
          <strong className="custom-config-summary">{customSummary}</strong>
        </div>
        <button type="button" onClick={() => setCustomOpen(true)}>设置并开始</button>
      </article>
    </div>
  );

  return (
    <main className="free-practice-page practice-workspace map-shell">
      <section className="free-practice-hero practice-title-strip explorer-card">
        <p className="eyebrow">{gradeLabels[child.gradeLevel]}</p>
        <h2>自由练习</h2>
        <p>选一种方式，马上开始。</p>
      </section>

      <section className="practice-panel practice-hub-panel task-camp-card practice-core-panel">
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
