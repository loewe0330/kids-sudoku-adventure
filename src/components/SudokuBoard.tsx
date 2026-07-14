import { useEffect, useMemo, useRef, useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { evaluateNextLevel } from "../lib/adaptiveDifficulty";
import { updateAdventureProgress } from "../lib/adventure";
import { calculateCandidates, getGuidedHint, type GuidedHint } from "../lib/hintEngine";
import { getLevelMethods, getPracticeMethod } from "../lib/methodGuide";
import { calculateStars } from "../lib/reward";
import { addPracticeRecord, getPracticeRecordsByChild, updateChild } from "../lib/storage";
import { formatDuration } from "../lib/time";
import { webSoundAdapter } from "../platform/web/webSoundAdapter";
import type { ChildProfile, PracticeMode, PracticeRecord, SudokuPuzzleItem } from "../types";

type CheckFeedback = "incomplete" | "try-again" | "success" | "encouragement" | null;

interface SudokuBoardProps {
  child: ChildProfile;
  puzzle: SudokuPuzzleItem;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onPrint: (includeAnswer: boolean) => void;
  onBackToMap: () => void;
  onBackToPractice: () => void;
  onChildChanged: () => void;
}

export function SudokuBoard({ child, puzzle, onBack, onNext, onSave, onPrint, onBackToMap, onBackToPractice, onChildChanged }: SudokuBoardProps) {
  const [board, setBoard] = useState(() => puzzle.puzzle.map((row) => [...row]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(new Date().toISOString());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<string>("");
  const [finished, setFinished] = useState(false);
  const [wrongCheckCount, setWrongCheckCount] = useState(0);
  const [checkFeedback, setCheckFeedback] = useState<CheckFeedback>(null);
  const [guidedHint, setGuidedHint] = useState<GuidedHint | null>(null);
  const [hintTarget, setHintTarget] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [showCandidates, setShowCandidates] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [showBoardCelebration, setShowBoardCelebration] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const errorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (errorTimerRef.current !== null) window.clearTimeout(errorTimerRef.current);
    setBoard(puzzle.puzzle.map((row) => [...row]));
    setSelected(null);
    setMistakes(0);
    setHints(0);
    setElapsed(0);
    setStartedAt(new Date().toISOString());
    setErrors(new Set());
    setResult("");
    setFinished(false);
    setWrongCheckCount(0);
    setCheckFeedback(null);
    setGuidedHint(null);
    setHintTarget(null);
    setHintLevel(1);
    setShowCandidates(false);
    setMethodOpen(false);
    setShowBoardCelebration(false);
    setMoreActionsOpen(false);
  }, [puzzle.id, puzzle.puzzle]);

  useEffect(() => () => {
    if (errorTimerRef.current !== null) window.clearTimeout(errorTimerRef.current);
  }, []);

  useEffect(() => {
    if (!showBoardCelebration) return;
    const timer = window.setTimeout(() => setShowBoardCelebration(false), 2400);
    return () => window.clearTimeout(timer);
  }, [showBoardCelebration]);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  const givens = useMemo(() => new Set(puzzle.puzzle.flatMap((row, r) => row.map((cell, c) => (cell ? `${r}-${c}` : ""))).filter(Boolean)), [puzzle.puzzle]);
  const selectedValue = selected ? board[selected[0]][selected[1]] : 0;
  const practiceMethod = getPracticeMethod(puzzle.level);
  const levelMethods = getLevelMethods(puzzle.level);
  const levelConfig = getDifficultyLevel(puzzle.level);
  const mode = puzzle.mode ?? child.settings.practiceMode;

  const commitRecord = (completed: boolean, gaveUp: boolean, duration = elapsed, mistakeCount = mistakes, hintCount = hints) => {
    if (finished) return;
    const record: PracticeRecord = {
      id: crypto.randomUUID(),
      parentId: child.parentId,
      childId: child.id,
      puzzleId: puzzle.id,
      gradeLevel: child.gradeLevel,
      level: puzzle.level,
      size: puzzle.size,
      difficulty: puzzle.difficulty,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationSeconds: duration,
      mistakeCount,
      hintCount,
      completed,
      gaveUp,
      stars: 0,
      mode,
      source: puzzle.source ?? (mode === "practice" ? "smart" : "challenge"),
      stageIndex: puzzle.stageIndex
    };
    record.stars = calculateStars(record, levelConfig);
    addPracticeRecord(record);
    const records = getPracticeRecordsByChild(child.parentId, child.id);
    const evaluation = evaluateNextLevel(records, child.currentLevel, child.smartDifficultyEnabled);
    const updatedProgress = mode === "adventure" && puzzle.stageIndex
      ? updateAdventureProgress(child.adventureProgress, {
        parentId: child.parentId,
        childId: child.id,
        level: puzzle.level,
        stageIndex: puzzle.stageIndex,
        stars: record.stars,
        completedAt: record.finishedAt ?? new Date().toISOString()
      })
      : child.adventureProgress;
    if (evaluation.nextLevel !== child.currentLevel || updatedProgress !== child.adventureProgress) {
      updateChild(child.parentId, child.id, { currentLevel: evaluation.nextLevel, adventureProgress: updatedProgress });
    }
    setFinished(true);
    const soundKind = evaluation.action === "up" ? "levelUp" : record.stars >= 3 ? "threeStar" : "success";
    webSoundAdapter.setEnabled(child.settings.soundEnabled);
    if (soundKind === "levelUp") webSoundAdapter.playLevelUp();
    else if (soundKind === "threeStar") webSoundAdapter.playThreeStars();
    else webSoundAdapter.playCelebration();
    setShowBoardCelebration(completed && child.settings.successAnimationEnabled && !child.settings.reducedMotion);
    setResult(`${completed ? "本题完成" : "本题已结束"} · ${evaluation.reason}`);
    onChildChanged();
  };

  const highlightErrorsTemporarily = (nextErrors: Set<string>) => {
    if (errorTimerRef.current !== null) window.clearTimeout(errorTimerRef.current);
    setErrors(nextErrors);
    errorTimerRef.current = window.setTimeout(() => {
      setErrors(new Set());
      errorTimerRef.current = null;
    }, 1800);
  };

  const setCell = (value: number) => {
    if (!selected || finished) return;
    const [row, col] = selected;
    if (givens.has(`${row}-${col}`) || value > puzzle.size) return;
    setBoard((current) => current.map((line, r) => line.map((cell, c) => (r === row && c === col ? value : cell))));
    setErrors((current) => {
      const next = new Set(current);
      next.delete(`${row}-${col}`);
      return next;
    });
    setGuidedHint(null);
  };

  const deleteCell = () => setCell(0);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key >= "1" && event.key <= "9") setCell(Number(event.key));
      if (event.key === "Backspace" || event.key === "Delete") deleteCell();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const checkAnswer = () => {
    const nextErrors = new Set<string>();
    let hasEmpty = false;
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (board[row][col] === 0) hasEmpty = true;
        if (board[row][col] !== 0 && board[row][col] !== puzzle.solution[row][col]) nextErrors.add(`${row}-${col}`);
      }
    }
    if (hasEmpty) {
      setResult("还有空格没有填完哦");
      setCheckFeedback("incomplete");
      return;
    }
    if (nextErrors.size > 0) {
      setMistakes((value) => value + nextErrors.size);
      highlightErrorsTemporarily(nextErrors);
      const nextCount = wrongCheckCount + 1;
      setWrongCheckCount(nextCount);
      setResult(nextCount === 1 ? "再想一想，修改后可以再检查。" : "下次努力，也可以换一题重新开始。");
      setCheckFeedback(nextCount === 1 ? "try-again" : "encouragement");
      if (nextCount >= 2) setFinished(true);
      return;
    }
    commitRecord(true, false);
    setCheckFeedback("success");
  };

  const hint = (excludeCurrent = false) => {
    const selectedKey = selected ? `${selected[0]}-${selected[1]}` : null;
    const excludedCells = excludeCurrent && hintTarget ? [hintTarget] : [];
    const selectedIsHintable = selected ? !excludedCells.includes(selectedKey!) && !givens.has(selectedKey!) && board[selected[0]][selected[1]] === 0 : false;
    const nextLevel: 1 | 2 | 3 = selectedIsHintable && selectedKey === hintTarget ? (Math.min(3, hintLevel + 1) as 1 | 2 | 3) : 1;
    const nextHint = getGuidedHint({
      board,
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
      size: puzzle.size,
      boxRows: puzzle.boxRows,
      boxCols: puzzle.boxCols,
      selectedCell: selectedIsHintable ? selected : null,
      hintLevel: nextLevel,
      excludedCells
    });
    const nextKey = `${nextHint.targetRow}-${nextHint.targetCol}`;
    setSelected([nextHint.targetRow, nextHint.targetCol]);
    setGuidedHint(nextHint);
    setHintTarget(nextKey);
    setHintLevel(nextKey === hintTarget ? nextLevel : 1);
    setHints((value) => value + 1);
  };

  const reveal = () => {
    setBoard(puzzle.solution.map((row) => [...row]));
    commitRecord(false, true);
  };

  const reset = () => {
    setBoard(puzzle.puzzle.map((row) => [...row]));
    setErrors(new Set());
    setResult("");
    setFinished(false);
    setWrongCheckCount(0);
    setCheckFeedback(null);
    setMistakes(0);
    setHints(0);
    setElapsed(0);
    setGuidedHint(null);
    setHintTarget(null);
    setHintLevel(1);
    setShowBoardCelebration(false);
  };

  const closeFeedback = () => setCheckFeedback(null);

  const sameBox = (row: number, col: number) => {
    if (!selected) return false;
    return Math.floor(row / puzzle.boxRows) === Math.floor(selected[0] / puzzle.boxRows) && Math.floor(col / puzzle.boxCols) === Math.floor(selected[1] / puzzle.boxCols);
  };

  const selectedNote = selected
    ? `当前选中：第 ${selected[0] + 1} 行，第 ${selected[1] + 1} 列${selectedValue ? `，数字 ${selectedValue}` : "，请选择数字"}`
    : "先点选棋盘上的空格，再选择数字。";

  return (
    <main className={`practice-layout quest-practice play-size-${puzzle.size}`}>
      <aside className="practice-info no-print">
        <button className="back-button" onClick={onBack}>返回首页</button>
        <div className="practice-title-block">
          <p className="eyebrow">当前题目</p>
          <h2>{getDifficultyLevel(puzzle.level).label}</h2>
          <p>{gradeLabels[child.gradeLevel]} · {sizeLabels[puzzle.size]} · {difficultyLabels[puzzle.difficulty]}</p>
        </div>
        <div className="status-row play-stat-grid">
          <span>{mode === "practice" ? "练习模式" : mode === "adventure" ? "闯关模式" : "挑战模式"}</span>
          {child.settings.showTimer && <span>用时 {formatDuration(elapsed)}</span>}
          {mode === "adventure" && <span>建议 {formatDuration(levelConfig.recommendedTimeSeconds)}</span>}
          {mode === "challenge" && <span>挑战 {formatDuration(levelConfig.recommendedTimeSeconds)}</span>}
          <span>错误 {mistakes}</span>
          <span>提示 {hints}</span>
        </div>
        <div className="method-card">
          <button type="button" className="method-toggle" onClick={() => setMethodOpen((value) => !value)}>
            今天试试：{practiceMethod.shortTitle}
          </button>
          {methodOpen && (
            <div className="method-details">
              <h3>{practiceMethod.title}</h3>
              <ul>
                {practiceMethod.content.map((line) => <li key={line}>{line}</li>)}
              </ul>
              <p>这一关还适合：{levelMethods.map((method) => method.shortTitle).join("、")}</p>
            </div>
          )}
        </div>
        <label className="toggle-row candidate-toggle">
          <input type="checkbox" checked={showCandidates} onChange={(event) => setShowCandidates(event.target.checked)} />
          显示候选数
        </label>
        {result && <p className="result-note">{result}</p>}
      </aside>

      <section className="board-panel">
        <div className="sudoku-board-wrap">
          <div
            className="sudoku-board"
            role="grid"
            aria-label={`${puzzle.size}×${puzzle.size} 数独棋盘`}
            style={{
              gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))`
            }}
          >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r}-${c}`;
              const isSelected = selected?.[0] === r && selected?.[1] === c;
              const isRelated = selected ? selected[0] === r || selected[1] === c || sameBox(r, c) : false;
              const isSame = selectedValue > 0 && cell === selectedValue;
              return (
                <button
                  key={key}
                  role="gridcell"
                  aria-label={`第 ${r + 1} 行，第 ${c + 1} 列${cell ? `，数字 ${cell}` : "，空格"}`}
                  className={[
                    "cell",
                    givens.has(key) ? "given" : "",
                    isSelected ? "selected" : "",
                    isRelated ? "related" : "",
                    isSame ? "same-number" : "",
                    errors.has(key) ? "error" : ""
                  ].join(" ")}
                  style={{
                    borderTopWidth: r % puzzle.boxRows === 0 ? 3 : 1,
                    borderLeftWidth: c % puzzle.boxCols === 0 ? 3 : 1,
                    borderRightWidth: (c + 1) % puzzle.boxCols === 0 ? 3 : 1,
                    borderBottomWidth: (r + 1) % puzzle.boxRows === 0 ? 3 : 1
                  }}
                  onClick={() => setSelected([r, c])}
                >
                  {cell || (showCandidates && !givens.has(key) ? (
                    <span className="candidate-list">{calculateCandidates(board, r, c, puzzle.size, puzzle.boxRows, puzzle.boxCols).join(" ")}</span>
                  ) : "")}
                </button>
              );
            })
          )}
          </div>
          {showBoardCelebration && (
            <div className="board-celebration" role="status" aria-live="polite" data-testid="board-celebration">
              <div className="celebration-burst" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
              </div>
              <div className="celebration-message">
                <span aria-hidden="true">★ ★ ★</span>
                <strong>太棒了！</strong>
                <small>全部答对啦</small>
              </div>
            </div>
          )}
        </div>
        <p className="selected-cell-note">{selectedNote}</p>
      </section>

      <aside className="play-action-panel no-print" aria-label="做题操作面板">
        <section className="action-section number-section">
          <h3>选择数字</h3>
          <div className="number-pad">
            {Array.from({ length: puzzle.size }, (_, index) => index + 1).map((num) => (
              <button
                key={num}
                className={selectedValue === num ? "active-number" : ""}
                onClick={() => setCell(num)}
              >
                {num}
              </button>
            ))}
            <button className="delete-key" onClick={deleteCell}>删除</button>
          </div>
        </section>

        <section className="action-section primary-action-section">
          <h3>做题操作</h3>
          <div className="action-button-grid">
            <button className="primary check-action" onClick={checkAnswer} disabled={finished}>检查答案</button>
            <button className="hint-action" onClick={() => hint()} disabled={finished}>引导提示</button>
            <button className="quiet-action desktop-reveal-action" onClick={reveal}>显示答案</button>
          </div>
        </section>

        {guidedHint && (
          <section className="hint-panel guided-hint-panel">
            <p className="eyebrow">{guidedHint.method}</p>
            <h3>{guidedHint.title}</h3>
            <p>{guidedHint.message}</p>
            {guidedHint.eliminatedNumbers && guidedHint.eliminatedNumbers.length > 0 && (
              <p>可以先排除：{guidedHint.eliminatedNumbers.join("、")}</p>
            )}
            {guidedHint.candidates && guidedHint.candidates.length > 0 && (
              <p>当前候选数：{guidedHint.candidates.join("、")}</p>
            )}
            <div className="card-actions">
              <button onClick={() => setGuidedHint(null)}>我再想想</button>
              <button onClick={() => hint(true)}>换一个提示格</button>
              <button className="quiet-action" onClick={reveal}>显示答案并结束本题</button>
            </div>
          </section>
        )}

        <button
          className="mobile-more-toggle"
          type="button"
          aria-expanded={moreActionsOpen}
          onClick={() => setMoreActionsOpen((value) => !value)}
        >
          {moreActionsOpen ? "收起更多操作" : "更多操作"}
        </button>

        <div className={`play-more-actions ${moreActionsOpen ? "open" : ""}`}>
          <section className="action-section mobile-reveal-section">
            <button className="quiet-action" aria-label="手机端显示答案" onClick={reveal}>显示答案</button>
          </section>

          <section className="action-section continue-action-section">
            <h3>继续练习</h3>
            <div className="action-button-grid">
              <button className="retry-action" onClick={reset}>重做本题</button>
              <button className="primary next-action" onClick={onNext}>生成下一题</button>
              <button className="quiet-action" onClick={onSave}>保存到题库</button>
            </div>
          </section>

          <section className="action-section print-action-section">
            <h3>打印</h3>
            <div className="action-button-grid two-actions">
              <button className="quiet-action" onClick={() => onPrint(false)}>打印当前题</button>
              <button className="quiet-action" onClick={() => onPrint(true)}>打印答案</button>
            </div>
          </section>
        </div>
      </aside>
      {checkFeedback && (
        <div className="play-feedback-backdrop" role="presentation">
          <section className={`play-feedback-dialog feedback-${checkFeedback}`} role="dialog" aria-modal="true" aria-labelledby="play-feedback-title">
            {checkFeedback === "incomplete" && <><span className="feedback-symbol">?</span><h3 id="play-feedback-title">还有空格没有填完哦</h3><p>先把数独完成，再来检查答案吧。</p><button className="primary" onClick={closeFeedback}>继续做题</button></>}
            {checkFeedback === "try-again" && <><span className="feedback-symbol">!</span><h3 id="play-feedback-title">再想一想</h3><p>你已经完成大部分内容了，修改后可以再检查。</p><button className="primary" onClick={closeFeedback}>继续修改</button></>}
            {checkFeedback === "success" && <><span className="feedback-symbol">★</span><h3 id="play-feedback-title">太棒了！</h3><p>全部答对啦，继续保持！</p><div className="feedback-actions"><button className="primary" onClick={onNext}>再来一题</button><button onClick={onBackToPractice}>回到练习</button></div></>}
            {checkFeedback === "encouragement" && <><span className="feedback-symbol">✦</span><h3 id="play-feedback-title">下次努力</h3><p>这题有点难，已经很接近了。休息一下，再换一题试试吧。</p><div className="feedback-actions"><button className="primary" onClick={onNext}>再来一题</button><button onClick={closeFeedback}>继续看看</button></div></>}
          </section>
        </div>
      )}
    </main>
  );
}
