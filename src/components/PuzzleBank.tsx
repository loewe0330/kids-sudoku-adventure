import { useEffect, useMemo, useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import {
  addPuzzleToBank,
  clearChildPuzzleBank,
  deletePuzzle,
  getPuzzlesByChild
} from "../lib/storage";
import { generatePracticePuzzle, getAllowedCustomDifficulties, getCustomPracticeValidity } from "../lib/practiceRules";
import { formatDateTime } from "../lib/time";
import type { ChildProfile, SudokuDifficulty, SudokuPuzzleItem, SudokuSize } from "../types";
import type { PracticeTab } from "../app/routes";

interface PuzzleBankProps {
  child: ChildProfile;
  activeTab: Extract<PracticeTab, "bank" | "batch" | "print">;
  onSelectPractice: () => void;
  onChanged: () => void;
  onPractice: (puzzle: SudokuPuzzleItem) => void;
  onPrint: (puzzles: SudokuPuzzleItem[], includeAnswers: boolean) => void;
}

export function PuzzleBank({ child, activeTab, onSelectPractice, onChanged, onPractice, onPrint }: PuzzleBankProps) {
  const [count, setCount] = useState(6);
  const [batchSize, setBatchSize] = useState<SudokuSize>(4);
  const [batchDifficulty, setBatchDifficulty] = useState<SudokuDifficulty>("starter");
  const [batchOpen, setBatchOpen] = useState(false);
  const puzzles = useMemo(() => getPuzzlesByChild(child.parentId, child.id), [child.parentId, child.id, onChanged]);
  const allowedDifficulties = getAllowedCustomDifficulties(batchSize);
  const batchValidity = getCustomPracticeValidity(batchSize, batchDifficulty);

  const generateBatch = () => {
    const safeCount = Math.max(1, Math.min(30, count));
    for (let index = 0; index < safeCount; index += 1) {
      const item = generatePracticePuzzle({
        parentId: child.parentId,
        childId: child.id,
        gradeLevel: child.gradeLevel,
        currentLevel: child.currentLevel,
        source: "custom",
        custom: { size: batchSize, difficulty: batchDifficulty }
      });
      addPuzzleToBank(item);
    }
    onChanged();
    setBatchOpen(false);
  };

  useEffect(() => {
    if (!batchOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBatchOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [batchOpen]);

  const renderBank = () => (
    <section className="bank-tab-panel explorer-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">{gradeLabels[child.gradeLevel]}</p>
          <h2>我的练习收藏</h2>
          <p>只显示{child.name}收藏的练习题，当前共 {puzzles.length} 题。</p>
        </div>
        {puzzles.length > 0 && (
          <div className="section-actions">
            <button
              className="danger"
              onClick={() => {
                if (window.confirm("确定清空当前孩子题库吗？")) {
                  clearChildPuzzleBank(child.parentId, child.id);
                  onChanged();
                }
              }}
            >
              清空题库
            </button>
          </div>
        )}
      </div>
      <section className="puzzle-list collection-card-grid">
        {puzzles.map((puzzle) => (
          <article className="puzzle-card island-card" key={puzzle.id}>
            <h3>{getDifficultyLevel(puzzle.level).label}</h3>
            <p>{sizeLabels[puzzle.size]} · {difficultyLabels[puzzle.difficulty]} · 空格 {puzzle.emptyCount}</p>
            <p>创建于 {formatDateTime(puzzle.createdAt)}</p>
            <div className="card-actions">
              <button className="primary" onClick={() => onPractice(puzzle)}>打开题目练习</button>
              <button onClick={() => onPrint([puzzle], true)}>打印</button>
              <button
                className="danger"
                onClick={() => {
                  deletePuzzle(child.parentId, child.id, puzzle.id);
                  onChanged();
                }}
              >
                删除
              </button>
            </div>
          </article>
        ))}
        {puzzles.length === 0 && (
          <div className="practice-empty-state">
            <span className="empty-state-board" aria-hidden="true">4</span>
            <h3>暂无保存的题目</h3>
            <p>完成练习后可以把喜欢的题保存到题库。</p>
            <button className="primary" type="button" onClick={onSelectPractice}>去练一题</button>
          </div>
        )}
      </section>
    </section>
  );

  const renderBatch = () => (
    <section className="batch-tab-panel explorer-card">
      <article className="practice-utility-entry batch-launch-card">
        <span className="utility-entry-illustration batch" aria-hidden="true">6</span>
        <div>
          <p className="eyebrow">练习卷工坊</p>
          <h2>批量出题</h2>
          <p>一次生成多道练习题，适合打印或集中练习。</p>
          <strong>{sizeLabels[batchSize]}｜{difficultyLabels[batchDifficulty]}｜{count}题</strong>
          <button className="primary" type="button" onClick={() => setBatchOpen(true)}>开始批量出题</button>
        </div>
      </article>
    </section>
  );

  const renderPrint = () => (
    <section className="print-tab-panel explorer-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">当前孩子：{child.name}</p>
          <h2>打印练习卷</h2>
          <p>选择今天需要的纸面练习内容。</p>
        </div>
      </div>
      <div className="print-choice-grid print-entry-grid">
        <article className="print-choice-card print-entry-card">
          <span className="print-entry-icon" aria-hidden="true">题</span>
          <h3>打印题目</h3>
          <p>打印收藏题目，不附答案页。</p>
          <button className="primary" type="button" onClick={() => onPrint(puzzles, false)} disabled={puzzles.length === 0}>进入题目预览</button>
        </article>
        <article className="print-choice-card print-entry-card">
          <span className="print-entry-icon answer" aria-hidden="true">答</span>
          <h3>打印答案</h3>
          <p>打印题目并附上答案页。</p>
          <button type="button" onClick={() => onPrint(puzzles, true)} disabled={puzzles.length === 0}>进入答案预览</button>
        </article>
        <article className="print-choice-card print-entry-card">
          <span className="print-entry-icon method" aria-hidden="true">法</span>
          <h3>打印方法说明</h3>
          <p>在预览中保留规则和练习方法。</p>
          <button type="button" onClick={() => onPrint(puzzles, false)} disabled={puzzles.length === 0}>进入方法预览</button>
        </article>
      </div>
      {puzzles.length === 0 && <p className="print-empty-note">题库暂时为空，先完成或生成练习题后再打印。</p>}
    </section>
  );

  return (
    <>
      <main className="bank-page practice-bank-camp">
        {activeTab === "bank" && renderBank()}
        {activeTab === "batch" && renderBatch()}
        {activeTab === "print" && renderPrint()}
      </main>

      {batchOpen && (
        <div
          className="practice-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBatchOpen(false);
          }}
        >
          <aside className="practice-settings-drawer" role="dialog" aria-modal="true" aria-labelledby="batch-settings-title">
            <header className="practice-drawer-header">
              <div>
                <p className="eyebrow">练习卷工坊</p>
                <h2 id="batch-settings-title">批量出题设置</h2>
                <p>选择练习卷的题型、难度和题目数量。</p>
              </div>
              <button className="drawer-close-button" type="button" aria-label="关闭批量出题设置" onClick={() => setBatchOpen(false)}>×</button>
            </header>
            <form className="practice-settings-form" onSubmit={(event) => { event.preventDefault(); generateBatch(); }}>
              <fieldset className="practice-settings-group">
                <legend>练习卷设置</legend>
                <label>
                  题型
                  <select
                    value={batchSize}
                    onChange={(event) => {
                      const nextSize = Number(event.target.value) as SudokuSize;
                      const nextDifficulties = getAllowedCustomDifficulties(nextSize);
                      setBatchSize(nextSize);
                      setBatchDifficulty(nextDifficulties.includes(batchDifficulty) ? batchDifficulty : nextDifficulties[0]);
                    }}
                  >
                    {[4, 6, 9].map((size) => <option key={size} value={size}>{sizeLabels[size as SudokuSize]}</option>)}
                  </select>
                </label>
                <label>
                  难度
                  <select value={batchDifficulty} onChange={(event) => setBatchDifficulty(event.target.value as SudokuDifficulty)}>
                    {allowedDifficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficultyLabels[difficulty]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  题目数量
                  <input type="number" min={1} max={30} value={count} onChange={(event) => setCount(Number(event.target.value))} />
                </label>
              </fieldset>
              {!batchValidity.valid && <p className="result-note">{batchValidity.message}</p>}
              <footer className="practice-drawer-actions">
                <button className="primary" type="submit" disabled={!batchValidity.valid}>生成并保存到题库</button>
                <button type="button" onClick={() => setBatchOpen(false)}>取消</button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
