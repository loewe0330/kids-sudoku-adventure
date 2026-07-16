import { useEffect, useMemo, useRef, useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { evaluateNextLevel } from "../lib/adaptiveDifficulty";
import { updateAdventureProgress } from "../lib/adventure";
import { createUuid } from "../lib/browserCrypto";
import {
  getAdventureFailureActionModel,
  getCompletionActionModel,
  type AdventureFailureAction,
  type AdventureFailureActionModel,
  type CompletionAction,
  type CompletionActionModel
} from "../lib/completionActions";
import { calculateCandidates, getGuidedHint, type GuidedHint } from "../lib/hintEngine";
import { getGuidanceStatus } from "../lib/guidance";
import { getLevelMethods, getPracticeMethod } from "../lib/methodGuide";
import { calculateStars } from "../lib/reward";
import { addPracticeRecord, consumeGuidance, getPracticeRecordsByChild, updateChild } from "../lib/storage";
import { formatDuration } from "../lib/time";
import { webSoundAdapter } from "../platform/web/webSoundAdapter";
import type { ChildProfile, GuidanceSource, PracticeMode, PracticeRecord, SudokuPuzzleItem } from "../types";

type CheckFeedback = "incomplete" | "try-again" | "guide-choice" | "success" | "encouragement" | null;
type SubmissionState = "editing" | "incorrect-editable" | "solved" | "failed-final" | "abandoned";

interface SudokuBoardProps {
  child: ChildProfile;
  puzzle: SudokuPuzzleItem;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onPrint: (includeAnswer: boolean) => void;
  onBackToMap: () => void;
  onBackToChapter?: () => void;
  onStartAdventureStage?: (level: number, stageIndex: number) => void;
  onOpenAdventureLevel?: (level: number) => void;
  onOpenGrowth?: () => void;
  onRetryAdventureStage?: () => void;
  onBackToPractice: () => void;
  onChildChanged: () => void;
  onManagedResult?: (record: PracticeRecord) => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  managedResultFeedback?: {
    title: string;
    progress: string;
    message: string;
  };
}

export function SudokuBoard({
  child,
  puzzle,
  onBack,
  onNext,
  onSave,
  onPrint,
  onBackToMap,
  onBackToChapter,
  onStartAdventureStage,
  onOpenAdventureLevel,
  onOpenGrowth,
  onRetryAdventureStage,
  onBackToPractice,
  onChildChanged,
  onManagedResult,
  backLabel = "返回首页",
  nextLabel = "生成下一题",
  nextDisabled = false,
  managedResultFeedback
}: SudokuBoardProps) {
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
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [completionModel, setCompletionModel] = useState<CompletionActionModel | null>(null);
  const [failureModel, setFailureModel] = useState<AdventureFailureActionModel | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("editing");
  const [showBoardCelebration, setShowBoardCelebration] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [guidanceSource, setGuidanceSource] = useState<GuidanceSource | null>(null);
  const [guidanceSubmitting, setGuidanceSubmitting] = useState(false);
  const [guidanceError, setGuidanceError] = useState("");
  const errorTimerRef = useRef<number | null>(null);
  const resultRecordedRef = useRef(false);
  const guidanceSubmittingRef = useRef(false);
  const pendingGuidanceOperationRef = useRef<string | null>(null);

  useEffect(() => {
    if (errorTimerRef.current !== null) window.clearTimeout(errorTimerRef.current);
    setBoard(puzzle.puzzle.map((row) => [...row]));
    setSelected(null);
    setMistakes(0);
    const restoredGuidance = (puzzle.mode ?? child.settings.practiceMode) === "adventure"
      ? child.guidanceOperations?.find((operation) => operation.puzzleId === puzzle.id)
      : undefined;
    setHints(restoredGuidance ? 1 : 0);
    setGuidanceSource(restoredGuidance?.source ?? null);
    setGuidanceSubmitting(false);
    setGuidanceError("");
    guidanceSubmittingRef.current = false;
    pendingGuidanceOperationRef.current = null;
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
    setMethodDialogOpen(false);
    setCompletionModel(null);
    setFailureModel(null);
    setSubmissionState("editing");
    resultRecordedRef.current = false;
    setShowBoardCelebration(false);
    setMoreActionsOpen(false);
  }, [puzzle.id, puzzle.puzzle]);

  useEffect(() => () => {
    if (errorTimerRef.current !== null) window.clearTimeout(errorTimerRef.current);
  }, []);

  useEffect(() => {
    if ((!checkFeedback && !guidedHint && !methodDialogOpen) || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [checkFeedback, guidedHint, methodDialogOpen]);

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
  const guidanceStatus = getGuidanceStatus(child);

  const commitRecord = (
    completed: boolean,
    gaveUp: boolean,
    duration = elapsed,
    mistakeCount = mistakes,
    hintCount = hints,
    options: { skipAdaptive?: boolean } = {}
  ) => {
    if (finished || resultRecordedRef.current) return;
    resultRecordedRef.current = true;
    const record: PracticeRecord = {
      id: createUuid(),
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
      guidanceUsed: hintCount > 0,
      guidanceSource: hintCount > 0 ? guidanceSource : null,
      guidanceOperationId: hintCount > 0
        ? child.guidanceOperations?.find((operation) => operation.puzzleId === puzzle.id)?.id
          ?? pendingGuidanceOperationRef.current
          ?? undefined
        : undefined,
      submissionCount: mode === "adventure" && completed ? Math.min(2, wrongCheckCount + 1) : undefined,
      completed,
      gaveUp,
      viewedAnswer: gaveUp,
      stars: 0,
      mode,
      source: puzzle.source ?? (mode === "practice" ? "smart" : "challenge"),
      stageIndex: puzzle.stageIndex
    };
    record.stars = calculateStars(record, levelConfig);
    if (onManagedResult) {
      setCompletionModel(getCompletionActionModel({
        child,
        mode,
        level: puzzle.level,
        stageIndex: puzzle.stageIndex,
        stars: record.stars,
        updatedProgress: child.adventureProgress,
        fastPass: managedResultFeedback ? { ...managedResultFeedback, nextLabel } : undefined
      }));
      setFinished(true);
      setResult(`${completed ? "本题完成" : "本题已结束"} · 挑战结果已记录`);
      onManagedResult(record);
      return;
    }
    addPracticeRecord(record);
    const records = getPracticeRecordsByChild(child.parentId, child.id);
    const evaluation = options.skipAdaptive ? null : evaluateNextLevel(records, child.currentLevel, child.smartDifficultyEnabled);
    const updatedProgress = completed && mode === "adventure" && puzzle.stageIndex
      ? updateAdventureProgress(child.adventureProgress, {
        parentId: child.parentId,
        childId: child.id,
        level: puzzle.level,
        stageIndex: puzzle.stageIndex,
        stars: record.stars,
        completedAt: record.finishedAt ?? new Date().toISOString()
      })
      : child.adventureProgress;
    if (evaluation && (evaluation.nextLevel !== child.currentLevel || updatedProgress !== child.adventureProgress)) {
      updateChild(child.parentId, child.id, { currentLevel: evaluation.nextLevel, adventureProgress: updatedProgress });
    }
    if (completed) {
      setCompletionModel(getCompletionActionModel({
        child,
        mode,
        level: puzzle.level,
        stageIndex: puzzle.stageIndex,
        stars: record.stars,
        updatedProgress
      }));
    }
    setFinished(true);
    const soundKind = evaluation?.action === "up" ? "levelUp" : record.stars >= 3 ? "threeStar" : "success";
    if (completed) {
      webSoundAdapter.setEnabled(child.settings.soundEnabled);
      if (soundKind === "levelUp") webSoundAdapter.playLevelUp();
      else if (soundKind === "threeStar") webSoundAdapter.playThreeStars();
      else webSoundAdapter.playCelebration();
    }
    setShowBoardCelebration(completed && child.settings.successAnimationEnabled && !child.settings.reducedMotion);
    setResult(`${completed ? "本题完成" : "本题已结束"} · ${evaluation?.reason ?? "挑战记录已保存"}`);
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
    if (!selected || finished || submissionState === "failed-final" || submissionState === "abandoned") return;
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
      if (mode !== "adventure") highlightErrorsTemporarily(nextErrors);
      const nextCount = wrongCheckCount + 1;
      setWrongCheckCount(nextCount);
      setSubmissionState(nextCount === 1 ? "incorrect-editable" : "failed-final");
      setResult(nextCount === 1
        ? "再想一想，修改后可以再检查。"
        : mode === "adventure" ? "本关暂未通过。" : "下次努力，也可以换一题重新开始。");
      setCheckFeedback(nextCount === 1 ? "try-again" : "encouragement");
      if (nextCount >= 2) {
        if (onManagedResult) commitRecord(false, false, elapsed, mistakes + nextErrors.size, hints);
        else if (mode === "adventure" && puzzle.stageIndex) {
          setFailureModel(getAdventureFailureActionModel({
            level: puzzle.level,
            stageIndex: puzzle.stageIndex,
            previousStars: child.adventureProgress.find((stage) => stage.level === puzzle.level && stage.stageIndex === puzzle.stageIndex)?.bestStars ?? 0,
            guidanceUsed: hints > 0,
            submitAttemptCount: nextCount
          }));
          commitRecord(false, false, elapsed, mistakes + nextErrors.size, hints, { skipAdaptive: true });
        } else setFinished(true);
      }
      return;
    }
    setSubmissionState("solved");
    commitRecord(true, false);
    setCheckFeedback("success");
  };

  const hint = (excludeCurrent = false, countUsage = true) => {
    if (mode === "adventure" && (wrongCheckCount === 0 || hints >= 1)) return;
    const hintBoard = mode === "adventure" ? puzzle.puzzle : board;
    const selectedKey = selected ? `${selected[0]}-${selected[1]}` : null;
    const excludedCells = excludeCurrent && hintTarget ? [hintTarget] : [];
    const selectedIsHintable = mode !== "adventure" && selected
      ? !excludedCells.includes(selectedKey!) && !givens.has(selectedKey!) && hintBoard[selected[0]][selected[1]] === 0
      : false;
    const nextLevel: 1 | 2 | 3 = selectedIsHintable && selectedKey === hintTarget ? (Math.min(3, hintLevel + 1) as 1 | 2 | 3) : 1;
    const nextHint = getGuidedHint({
      board: hintBoard,
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
    if (countUsage) setHints((value) => value + 1);
  };

  const closeGuidanceChoice = () => {
    setGuidanceError("");
    pendingGuidanceOperationRef.current = null;
    closeFeedback();
  };

  const confirmGuidance = async () => {
    if (guidanceSubmittingRef.current || hints >= 1 || finished) return;
    const operationId = pendingGuidanceOperationRef.current ?? createUuid();
    pendingGuidanceOperationRef.current = operationId;
    guidanceSubmittingRef.current = true;
    setGuidanceSubmitting(true);
    setGuidanceError("");
    try {
      const consumed = await consumeGuidance({
        parentId: child.parentId,
        childId: child.id,
        puzzleId: puzzle.id,
        operationId
      });
      if (consumed.status === "already-used") throw new Error("本题已经使用过解题引导。");
      if (consumed.status === "no-stars") throw new Error("当前没有足够的可用星星。");
      if (consumed.status === "daily-limit") throw new Error("今天的兑换次数已经用完。");
      setGuidanceSource(consumed.guidanceSource ?? null);
      setHints(1);
      hint(false, false);
      setCheckFeedback(null);
      onChildChanged();
    } catch (error) {
      setGuidanceError(error instanceof Error ? error.message : "引导数据保存失败，请重试。");
    } finally {
      guidanceSubmittingRef.current = false;
      setGuidanceSubmitting(false);
    }
  };

  const reveal = () => {
    setBoard(puzzle.solution.map((row) => [...row]));
    setSubmissionState("abandoned");
    if (mode === "adventure" && puzzle.stageIndex && !onManagedResult) {
      setFailureModel(getAdventureFailureActionModel({
        level: puzzle.level,
        stageIndex: puzzle.stageIndex,
        previousStars: child.adventureProgress.find((stage) => stage.level === puzzle.level && stage.stageIndex === puzzle.stageIndex)?.bestStars ?? 0,
        guidanceUsed: hints > 0,
        submitAttemptCount: wrongCheckCount
      }));
      commitRecord(false, true, elapsed, mistakes, hints, { skipAdaptive: true });
      setCheckFeedback("encouragement");
    } else commitRecord(false, true);
  };

  const reset = () => {
    setBoard(puzzle.puzzle.map((row) => [...row]));
    setErrors(new Set());
    setResult("");
    setFinished(false);
    setWrongCheckCount(0);
    setCheckFeedback(null);
    setMistakes(0);
    const restoredGuidance = mode === "adventure"
      ? child.guidanceOperations?.find((operation) => operation.puzzleId === puzzle.id)
      : undefined;
    setHints(restoredGuidance ? 1 : 0);
    setGuidanceSource(restoredGuidance?.source ?? null);
    setGuidanceSubmitting(false);
    setGuidanceError("");
    guidanceSubmittingRef.current = false;
    pendingGuidanceOperationRef.current = null;
    setElapsed(0);
    setStartedAt(new Date().toISOString());
    setGuidedHint(null);
    setHintTarget(null);
    setHintLevel(1);
    setShowBoardCelebration(false);
    setCheckFeedback(null);
    setMethodDialogOpen(false);
    setCompletionModel(null);
    setFailureModel(null);
    setSubmissionState("editing");
    resultRecordedRef.current = false;
  };

  const closeFeedback = () => setCheckFeedback(null);

  const runCompletionAction = (action: CompletionAction) => {
    if (action.type === "new-practice") onNext();
    else if (action.type === "back-to-practice") onBackToPractice();
    else if (action.type === "fast-pass-next") onNext();
    else if (action.type === "next-adventure-stage") onStartAdventureStage?.(action.level, action.stageIndex);
    else if (action.type === "open-adventure-level") {
      if (onOpenAdventureLevel) onOpenAdventureLevel(action.level);
      else onBackToChapter?.();
    } else if (action.type === "open-adventure-map") onBackToMap();
    else if (action.type === "open-growth") onOpenGrowth?.();
    else if (action.type === "close-result") closeFeedback();
  };

  const runAdventureFailureAction = (action: AdventureFailureAction) => {
    if (action.type === "retry-stage") {
      if (onRetryAdventureStage) onRetryAdventureStage();
      else reset();
    } else if (action.type === "return-level") {
      if (onOpenAdventureLevel) onOpenAdventureLevel(action.level);
      else if (onBackToChapter) onBackToChapter();
      else onBackToMap();
    } else {
      setCheckFeedback(null);
      setMethodDialogOpen(true);
    }
  };

  const sameBox = (row: number, col: number) => {
    if (!selected) return false;
    return Math.floor(row / puzzle.boxRows) === Math.floor(selected[0] / puzzle.boxRows) && Math.floor(col / puzzle.boxCols) === Math.floor(selected[1] / puzzle.boxCols);
  };

  const selectedNote = selected
    ? `当前选中：第 ${selected[0] + 1} 行，第 ${selected[1] + 1} 列${selectedValue ? `，数字 ${selectedValue}` : "，请选择数字"}`
    : "先点选棋盘上的空格，再选择数字。";

  return (
    <main
      className={`practice-layout quest-practice play-size-${puzzle.size} mode-${mode}`}
      data-submission-state={submissionState}
    >
      {guidedHint && (
        <button
          className="guided-hint-backdrop"
          type="button"
          aria-label="关闭提示"
          data-testid="guided-hint-backdrop"
          onClick={() => setGuidedHint(null)}
        />
      )}
      <aside className="practice-info no-print">
        <button className="back-button" onClick={onBack}>{backLabel}</button>
        <div className="practice-title-block">
          <p className="eyebrow">当前题目</p>
          <h2>{getDifficultyLevel(puzzle.level).label}</h2>
          <p>{gradeLabels[child.gradeLevel]} · {sizeLabels[puzzle.size]} · {difficultyLabels[puzzle.difficulty]}</p>
        </div>
        <button className="mobile-puzzle-home-link" type="button" onClick={onBack}>数学探险家 ›</button>
        <div className="status-row play-stat-grid">
          <span className="mode-stat">{mode === "practice" ? "练习模式" : mode === "adventure" ? "闯关模式" : "挑战模式"}</span>
          {child.settings.showTimer && <span className="timer-stat">用时 {formatDuration(elapsed)}</span>}
          {mode === "adventure" && <span className="recommended-time-stat">建议 {formatDuration(levelConfig.recommendedTimeSeconds)}</span>}
          {mode === "challenge" && <span className="recommended-time-stat">挑战 {formatDuration(levelConfig.recommendedTimeSeconds)}</span>}
          <span className="mistake-stat">{mode === "adventure" ? `提交 ${wrongCheckCount}/2` : `错误 ${mistakes}`}</span>
          <span className="hint-stat">提示 {hints}</span>
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
            <button className="quiet-action mobile-delete-action" type="button" onClick={deleteCell}>删除</button>
            <button className="primary check-action" aria-label="提交" onClick={checkAnswer} disabled={finished}>
              <span className="desktop-submit-label" aria-hidden="true">提交</span>
              <span className="mobile-submit-label" aria-hidden="true">提交</span>
            </button>
            <button
              className="hint-action"
              onClick={() => mode === "adventure" ? setCheckFeedback("guide-choice") : hint()}
              disabled={finished || (mode === "adventure" && (wrongCheckCount === 0 || hints >= 1))}
            >{mode === "adventure" && wrongCheckCount > 0 && guidanceStatus.availability === "star" ? "1 星兑换引导" : "引导提示"}</button>
            {mode === "adventure" && wrongCheckCount > 0 && hints < 1 && (
              <small className="guidance-balance-hint">
                {guidanceStatus.availability === "free"
                  ? `今日免费剩余 ${guidanceStatus.remainingFree}/3 次`
                  : `可用星星：${guidanceStatus.availableStars}`}
              </small>
            )}
            <button
              className="mobile-more-toggle"
              type="button"
              aria-expanded={moreActionsOpen}
              onClick={() => setMoreActionsOpen((value) => !value)}
            >
              {moreActionsOpen ? "收起操作" : "更多操作"}
            </button>
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
              {mode !== "adventure" && <button onClick={() => hint(true)}>换一个提示格</button>}
              <button className="quiet-action" onClick={reveal}>显示答案并结束本题</button>
            </div>
          </section>
        )}

        <div className={`play-more-actions ${moreActionsOpen ? "open" : ""}`}>
          <section className="mobile-more-sheet-actions" aria-label="更多操作">
            <button type="button" onClick={reset}>重新开始</button>
            <button type="button" onClick={reveal}>查看答案</button>
            <button type="button" onClick={onBackToPractice}>退出练习</button>
          </section>

          <section className="action-section mobile-reveal-section">
            <button className="quiet-action" aria-label="手机端显示答案" onClick={reveal}>显示答案</button>
          </section>

          {!onManagedResult && (
            <section className="action-section continue-action-section">
              <h3>继续练习</h3>
              <div className="action-button-grid">
                <button className="retry-action" onClick={reset}>重做本题</button>
                <button className="primary next-action" onClick={onNext}>{nextLabel}</button>
                <button className="quiet-action" onClick={onSave}>保存到题库</button>
              </div>
            </section>
          )}

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
          <section className={`play-feedback-dialog feedback-${checkFeedback}${failureModel ? " adventure-failure-dialog" : ""}`} role="dialog" aria-modal="true" aria-labelledby="play-feedback-title">
            {checkFeedback === "incomplete" && <><span className="feedback-symbol">?</span><h3 id="play-feedback-title">还有空格没有填完哦</h3><p>先把数独完成，再来检查答案吧。</p><button className="primary" onClick={closeFeedback}>继续做题</button></>}
            {checkFeedback === "try-again" && <><span className="feedback-symbol">!</span><h3 id="play-feedback-title">再想一想</h3><p>你已经完成大部分内容了，修改后可以再检查。</p><button className="primary" onClick={() => setCheckFeedback("guide-choice")}>继续修改</button></>}
            {checkFeedback === "guide-choice" && mode !== "adventure" && <><span className="feedback-symbol">?</span><h3 id="play-feedback-title">需要解题引导吗？</h3><p>可以先看一个分层提示，答案仍由你完成。</p><div className="feedback-actions"><button className="primary" onClick={() => { hint(); closeFeedback(); }}>使用解题引导</button><button onClick={closeFeedback}>暂不使用</button></div></>}
            {checkFeedback === "guide-choice" && mode === "adventure" && guidanceStatus.availability === "free" && <><span className="feedback-symbol">?</span><h3 id="play-feedback-title">使用免费引导？</h3><p>本次将使用今日 1 次免费引导。</p><p>使用引导后，本关最高获得 1 颗星。</p><p className="guidance-dialog-balance">今日免费剩余 {guidanceStatus.remainingFree}/3 次</p>{guidanceError && <p className="guidance-save-error" role="alert">{guidanceError}</p>}<div className="feedback-actions"><button className="primary" onClick={() => void confirmGuidance()} disabled={guidanceSubmitting}>{guidanceSubmitting ? "正在保存…" : "使用引导"}</button><button onClick={closeGuidanceChoice} disabled={guidanceSubmitting}>暂不使用</button></div></>}
            {checkFeedback === "guide-choice" && mode === "adventure" && guidanceStatus.availability === "star" && <><span className="feedback-symbol">★</span><h3 id="play-feedback-title">兑换解题引导？</h3><p>今日免费引导已用完。使用 1 颗可用星星，可以获得一次解题引导。</p><p>历史累计星星不会减少。使用引导后，本关最高获得 1 颗星。</p><p className="guidance-dialog-balance">可用星星：{guidanceStatus.availableStars}</p>{guidanceError && <p className="guidance-save-error" role="alert">{guidanceError}</p>}<div className="feedback-actions"><button className="primary" onClick={() => void confirmGuidance()} disabled={guidanceSubmitting}>{guidanceSubmitting ? "正在保存…" : "使用 1 星"}</button><button onClick={closeGuidanceChoice} disabled={guidanceSubmitting}>暂不兑换</button></div></>}
            {checkFeedback === "guide-choice" && mode === "adventure" && (guidanceStatus.availability === "no-stars" || guidanceStatus.availability === "daily-limit") && <><span className="feedback-symbol">!</span><h3 id="play-feedback-title">今日免费引导已用完</h3><p>{guidanceStatus.availability === "daily-limit" ? "今天的 3 次星星兑换也已经用完。" : "当前没有足够的可用星星。"}</p><p>可以继续独立完成挑战。</p><button className="primary" onClick={closeGuidanceChoice}>继续答题</button></>}
            {checkFeedback === "success" && completionModel && <><span className="feedback-symbol">{completionModel.context === "fast-pass-question" ? "✓" : "★"}</span><h3 id="play-feedback-title">{completionModel.title}</h3><div className="completion-summary">{completionModel.summary.map((line) => <p key={line}>{line}</p>)}</div>{completionModel.hint && <p className="completion-hint">{completionModel.hint}</p>}<div className="feedback-actions"><button className="primary" onClick={() => runCompletionAction(completionModel.primaryAction.action)} disabled={completionModel.primaryAction.action.type === "fast-pass-next" && nextDisabled}>{completionModel.primaryAction.label}</button><button onClick={() => runCompletionAction(completionModel.secondaryAction.action)}>{completionModel.secondaryAction.label}</button></div></>}
            {checkFeedback === "encouragement" && (onManagedResult && completionModel
              ? <><span className="feedback-symbol">✓</span><h3 id="play-feedback-title">{completionModel.title}</h3><div className="completion-summary">{completionModel.summary.map((line) => <p key={line}>{line}</p>)}</div><div className="feedback-actions"><button className="primary" onClick={() => runCompletionAction(completionModel.primaryAction.action)} disabled={completionModel.primaryAction.action.type === "fast-pass-next" && nextDisabled}>{completionModel.primaryAction.label}</button><button onClick={() => runCompletionAction(completionModel.secondaryAction.action)}>{completionModel.secondaryAction.label}</button></div></>
              : failureModel
                ? <><span className="feedback-symbol">!</span><h3 id="play-feedback-title">{failureModel.title}</h3><div className="adventure-failure-message">{failureModel.message.map((line) => <p key={line}>{line}</p>)}</div><div className="feedback-actions adventure-failure-actions"><button className="primary" onClick={() => runAdventureFailureAction(failureModel.primaryAction.action)}>{failureModel.primaryAction.label}</button><button onClick={() => runAdventureFailureAction(failureModel.secondaryAction.action)}>{failureModel.secondaryAction.label}</button><button className="failure-method-action" onClick={() => runAdventureFailureAction(failureModel.tertiaryAction.action)}>{failureModel.tertiaryAction.label}</button></div></>
                : <><span className="feedback-symbol">✦</span><h3 id="play-feedback-title">下次努力</h3><p>这题有点难，已经很接近了。可以重新挑战，或者先看看解题方法。</p><div className="feedback-actions feedback-failure-actions"><button className="primary" onClick={reset}>重新挑战</button><button onClick={onBackToChapter ?? onBackToMap}>返回当前大关</button><button onClick={() => { setCheckFeedback(null); setMethodDialogOpen(true); }}>查看解题方法</button></div></>)}
          </section>
        </div>
      )}
      {methodDialogOpen && (
        <div className="play-feedback-backdrop" role="presentation">
          <section className="play-feedback-dialog solution-method-dialog" role="dialog" aria-modal="true" aria-labelledby="solution-method-title">
            <span className="feedback-symbol" aria-hidden="true">法</span>
            <h3 id="solution-method-title">{failureModel ? "解题方法" : practiceMethod.title}</h3>
            <ul>{(failureModel ? [
              "先找只缺一个数字的行或列。",
              "再检查列中的排除关系。",
              "观察宫格里的候选数字。",
              "结合行、列、宫格做三重排除。",
              "最后尝试唯一候选法。"
            ] : practiceMethod.content).map((line) => <li key={line}>{line}</li>)}</ul>
            {!failureModel && <p>还可以试试：{levelMethods.map((method) => method.shortTitle).join("、")}</p>}
            {failureModel
              ? <div className="feedback-actions method-failure-actions"><button className="primary" onClick={() => { setMethodDialogOpen(false); setCheckFeedback("encouragement"); }}>我知道了</button><button onClick={() => runAdventureFailureAction(failureModel.primaryAction.action)}>{failureModel.primaryAction.label}</button></div>
              : <div className="feedback-actions"><button className="primary" onClick={reset}>重新挑战</button><button onClick={() => setMethodDialogOpen(false)}>返回本题</button></div>}
          </section>
        </div>
      )}
    </main>
  );
}
