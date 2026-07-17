import { useEffect, useMemo, useState } from "react";
import { difficultyLabels, gradeLabels, sizeLabels } from "../../constants/gradeLabels";
import { getDailyPracticeRecommendation, type DailyPracticeRecommendation } from "../../lib/dailyPracticeRecommendation";
import { getCustomPracticeValidity, getAllowedCustomDifficulties } from "../../lib/practiceRules";
import { getPracticeRecordsByChild } from "../../lib/storage";
import type { ChildProfile, PracticeSource, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../../types";
import { PuzzleBank } from "../../components/PuzzleBank";
import { AssetImage } from "../../components/ui/AssetImage";
import { FeatureEntryCard } from "../../components/ui/AdventurePrimitives";
import { sudokuAdventureAssets } from "../../ui/assets/sudokuAdventureAssets";
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
  const [customCount, setCustomCount] = useState(1);
  const [saveToBank, setSaveToBank] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [useSuggestedTime, setUseSuggestedTime] = useState(true);
  const allowedDifficulties = getAllowedCustomDifficulties(manual.size);
  const customValidity = getCustomPracticeValidity(manual.size, manual.difficulty);
  const practiceRecords = getPracticeRecordsByChild(child.parentId, child.id);
  const dailyRecommendation = getDailyPracticeRecommendation({ child, practiceRecords });
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
    <div className="practice-choice-content forest-practice-overview">
      <article className="forest-recommendation-strip" aria-live="polite">
        <AssetImage src={sudokuAdventureAssets.practice.recommendationMedal} alt="金色星星推荐奖章" className="recommendation-medal" loading="eager" />
        <div><small>{dailyRecommendation.badge}</small><strong>推荐：{sizeLabels[dailyRecommendation.size]} / {difficultyLabels[dailyRecommendation.difficulty]}</strong><p>{dailyRecommendation.reason}</p></div>
        <button type="button" className="primary" onClick={() => onQuickPractice("smart", dailyRecommendation)}><span aria-hidden="true">▶</span>开始今日推荐</button>
      </article>

      <section className="forest-practice-entry-grid" aria-label="练习功能入口">
        <FeatureEntryCard title="今日推荐" description="每日精选，提升更高效" image={sudokuAdventureAssets.practice.recommendationCalendar} imageAlt="带星星的推荐日历" tone="gold" badge="最推荐" onClick={() => onQuickPractice("smart", dailyRecommendation)} />
        <FeatureEntryCard title="自选练习" description={customSummary} image={sudokuAdventureAssets.practice.customPractice} imageAlt="带铅笔的数独练习板" tone="cream" onClick={() => setCustomOpen(true)} />
        <FeatureEntryCard title="我的题库" description="查看收藏，管理题目" image={sudokuAdventureAssets.practice.questionBank} imageAlt="绿色数独题库书本" tone="green" onClick={() => onTabChange("bank")} />
        <FeatureEntryCard title="打印练习" description="生成题目，打印练习" image={sudokuAdventureAssets.practice.printer} imageAlt="正在打印数独题目的打印机" tone="sky" onClick={() => onTabChange("print")} />
      </section>

      <details className="practice-more-modes">
        <summary>更多练习工具 <span aria-hidden="true">⌄</span></summary>
        <div><button type="button" onClick={() => onQuickPractice("review")}>巩固练习</button><button type="button" onClick={() => onQuickPractice("challenge")}>挑战练习</button><button type="button" onClick={() => onTabChange("batch")}>批量出题</button></div>
      </details>
    </div>
  );

  return (
    <main className="free-practice-page forest-practice-page practice-workspace map-shell">
      <section className="forest-practice-hero">
        <AssetImage src={sudokuAdventureAssets.practice.header} alt="带木牌和花草的自由练习页头" className="forest-practice-hero-art" loading="eager" objectFit="cover" />
        <div><p>{gradeLabels[child.gradeLevel]} · 练习营地</p><h2>自由练习</h2><span>自由选择题目，随时练习提升</span></div>
      </section>

      <section className="practice-panel forest-practice-panel practice-core-panel">
        {activeTab !== "select" && <header className="forest-secondary-toolbar"><button type="button" onClick={() => onTabChange("select")}>‹ 返回练习入口</button><strong>{activeTab === "bank" ? "我的题库" : activeTab === "batch" ? "批量出题" : "打印练习"}</strong></header>}
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

      {activeTab === "select" && <aside className="forest-practice-tip"><AssetImage src={sudokuAdventureAssets.practice.tipBanner} alt="森林练习小提示" /><p><strong>小提示</strong>每天坚持一点点，逻辑思维会越来越强！</p></aside>}

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
