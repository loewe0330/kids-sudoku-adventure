import { useState } from "react";
import { gradeLabels } from "../constants/gradeLabels";
import { getPrintMethodSuggestion } from "../lib/methodGuide";
import { webPrintAdapter } from "../platform/web/webPrintAdapter";
import type { ChildProfile, SudokuPuzzleItem } from "../types";

interface PrintPreviewProps {
  child: ChildProfile;
  puzzles: SudokuPuzzleItem[];
  includeAnswers: boolean;
  onIncludeAnswers: (value: boolean) => void;
  onBack: () => void;
}

function PrintableGrid({ puzzle, answer }: { puzzle: SudokuPuzzleItem; answer?: boolean }) {
  const board = answer ? puzzle.solution : puzzle.puzzle;
  return (
    <div className="print-puzzle">
      <div className="print-grid" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`print-cell ${!answer && puzzle.puzzle[r][c] ? "given" : ""}`}
              style={{
                borderTopWidth: r % puzzle.boxRows === 0 ? 2 : 1,
                borderLeftWidth: c % puzzle.boxCols === 0 ? 2 : 1,
                borderRightWidth: (c + 1) % puzzle.boxCols === 0 ? 2 : 1,
                borderBottomWidth: (r + 1) % puzzle.boxRows === 0 ? 2 : 1
              }}
            >
              {cell || ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PrintPreview({ child, puzzles, includeAnswers, onIncludeAnswers, onBack }: PrintPreviewProps) {
  const [perPage, setPerPage] = useState(2);
  const [includeRules, setIncludeRules] = useState(true);
  const [includeMethodAdvice, setIncludeMethodAdvice] = useState(true);
  const title = `${child.name}的${gradeLabels[child.gradeLevel]}数独练习`;
  const columns = perPage === 4 ? 2 : perPage;
  const pages = Array.from({ length: Math.ceil(puzzles.length / perPage) }, (_, index) =>
    puzzles.slice(index * perPage, index * perPage + perPage)
  );

  return (
    <main className="print-preview quest-print-preview">
      <section className="panel no-print">
        <div className="section-title">
          <div>
            <h2>打印预览</h2>
            <p>{puzzles.length === 0 ? "题库为空，请先生成题目。" : `准备打印 ${puzzles.length} 道题。`}</p>
          </div>
          <div className="section-actions">
            <button onClick={onBack}>返回</button>
            <button className="primary" onClick={() => webPrintAdapter.printPuzzleSet()} disabled={puzzles.length === 0 || !webPrintAdapter.canPrint()}>打印</button>
          </div>
        </div>
        <div className="generator-row">
          <label>
            每页题数
            <select value={perPage} onChange={(event) => setPerPage(Number(event.target.value))}>
              <option value={1}>1 题</option>
              <option value={2}>2 题</option>
              <option value={4}>4 题</option>
            </select>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={includeAnswers} onChange={(event) => onIncludeAnswers(event.target.checked)} />
            附答案页
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={includeRules} onChange={(event) => setIncludeRules(event.target.checked)} />
            打印数独规则
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={includeMethodAdvice} onChange={(event) => setIncludeMethodAdvice(event.target.checked)} />
            打印建议方法
          </label>
        </div>
      </section>

      {(includeRules || includeMethodAdvice) && puzzles.length > 0 && (
        <section className="print-sheet print-guide-sheet">
          <h1>{title}</h1>
          {includeRules && (
            <div className="print-guide-block">
              <h2>数独规则</h2>
              <p>每一行、每一列、每一个小宫格都不能有重复数字。4×4 使用 1-4，6×6 使用 1-6，9×9 使用 1-9。</p>
            </div>
          )}
          {includeMethodAdvice && (
            <div className="print-guide-block">
              <h2>练习建议</h2>
              <p>{getPrintMethodSuggestion(child.gradeLevel)}</p>
            </div>
          )}
        </section>
      )}

      {pages.map((page, pageIndex) => (
        <section className="print-sheet" style={{ ["--per-page" as string]: columns }} key={`page-${pageIndex}`}>
          <h1>{title}</h1>
          <div className="print-grid-list">
            {page.map((puzzle, index) => (
              <div className="print-item" key={puzzle.id}>
                <h2>第 {pageIndex * perPage + index + 1} 题 · L{puzzle.level}</h2>
                <PrintableGrid puzzle={puzzle} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {includeAnswers && puzzles.length > 0 && (
        pages.map((page, pageIndex) => (
          <section className="print-sheet answer-sheet" style={{ ["--per-page" as string]: columns }} key={`answer-${pageIndex}`}>
            <h1>{title}答案</h1>
            <div className="print-grid-list">
              {page.map((puzzle, index) => (
                <div className="print-item" key={`${puzzle.id}-answer`}>
                  <h2>第 {pageIndex * perPage + index + 1} 题答案</h2>
                  <PrintableGrid puzzle={puzzle} answer />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
