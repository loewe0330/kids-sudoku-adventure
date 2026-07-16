import { useEffect, useMemo, useRef, useState } from "react";
import { getDifficultyLevel } from "../../constants/difficultyLevels";
import { difficultyLabels, sizeLabels } from "../../constants/gradeLabels";
import { SudokuBoard } from "../../components/SudokuBoard";
import {
  applyFastPassAttempt,
  createFastPassAttempt,
  generateFastPassChallenge,
  getFastPassNextAction,
  getFastPassQuestionSummary,
  getFastPassRecommendation,
  isFastPassQuestionPassed,
  type FastPassChallenge
} from "../../lib/fastPass";
import { getPracticeRecordsByChild, updateChild } from "../../lib/storage";
import type { ChildProfile, FastPassAttempt, FastPassQuestionResult, PracticeRecord } from "../../types";

interface FastPassFlowProps {
  child: ChildProfile;
  onBackToMap: () => void;
  onOpenLevel: (level: number) => void;
  onChildChanged: () => void;
}

type FastPassPhase = "intro" | "playing" | "question-result" | "challenge-result";

export function FastPassFlow({ child, onBackToMap, onOpenLevel, onChildChanged }: FastPassFlowProps) {
  const practiceRecords = getPracticeRecordsByChild(child.parentId, child.id);
  const recommendation = useMemo(
    () => getFastPassRecommendation(child, practiceRecords),
    [child, practiceRecords]
  );
  const [phase, setPhase] = useState<FastPassPhase>("intro");
  const [selectedTarget, setSelectedTarget] = useState(recommendation.targetLevel);
  const [challenge, setChallenge] = useState<FastPassChallenge | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [results, setResults] = useState<FastPassQuestionResult[]>([]);
  const [currentResult, setCurrentResult] = useState<FastPassQuestionResult | null>(null);
  const [finalAttempt, setFinalAttempt] = useState<FastPassAttempt | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const advancingRef = useRef(false);
  const recordedQuestionIndexesRef = useRef(new Set<number>());

  useEffect(() => {
    if (phase === "intro") setSelectedTarget(recommendation.targetLevel);
  }, [child.id, phase, recommendation.targetLevel]);

  useEffect(() => {
    advancingRef.current = false;
    setIsAdvancing(false);
  }, [phase, questionIndex]);

  useEffect(() => {
    if (!detailsOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailsOpen]);

  const startChallenge = (targetLevel = selectedTarget) => {
    setSelectedTarget(targetLevel);
    setChallenge(generateFastPassChallenge(child, targetLevel));
    setQuestionIndex(0);
    setResults([]);
    setCurrentResult(null);
    setFinalAttempt(null);
    setIsAdvancing(false);
    advancingRef.current = false;
    recordedQuestionIndexesRef.current.clear();
    setPhase("playing");
  };

  const recordQuestionResult = (record: PracticeRecord) => {
    const resultQuestionIndex = questionIndex + 1;
    if (!challenge || currentResult || recordedQuestionIndexesRef.current.has(resultQuestionIndex)) return;
    recordedQuestionIndexesRef.current.add(resultQuestionIndex);
    const unfinished = {
      questionIndex: resultQuestionIndex,
      level: record.level,
      size: record.size,
      difficulty: record.difficulty,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt ?? new Date().toISOString(),
      errors: record.mistakeCount,
      hintsUsed: record.hintCount,
      elapsedSeconds: record.durationSeconds,
      completed: record.completed && !record.gaveUp,
      gaveUp: record.gaveUp,
      viewedAnswer: record.viewedAnswer ?? record.gaveUp
    };
    const result: FastPassQuestionResult = { ...unfinished, passed: isFastPassQuestionPassed(unfinished) };
    setCurrentResult(result);
    setResults((current) => [...current.filter((item) => item.questionIndex !== result.questionIndex), result]);
    setPhase("question-result");
  };

  const continueChallenge = () => {
    if (!challenge || !currentResult || advancingRef.current) return;
    const completedResults = [...results.filter((item) => item.questionIndex !== currentResult.questionIndex), currentResult]
      .sort((a, b) => a.questionIndex - b.questionIndex);
    const nextAction = getFastPassNextAction({
      currentQuestionIndex: questionIndex,
      completedQuestionCount: completedResults.length,
      totalQuestionCount: challenge.puzzles.length
    });
    if (!nextAction) return;

    advancingRef.current = true;
    setIsAdvancing(true);
    if (nextAction.action === "next-question") {
      setQuestionIndex(questionIndex + 1);
      setCurrentResult(null);
      setPhase("playing");
      return;
    }

    const hasCompleteResultSequence = completedResults.length === challenge.puzzles.length
      && completedResults.every((result, index) => result.questionIndex === index + 1);
    if (!hasCompleteResultSequence) {
      advancingRef.current = false;
      setIsAdvancing(false);
      return;
    }

    const attempt = createFastPassAttempt({ challenge, results: completedResults });
    const changes = applyFastPassAttempt(child, attempt);
    updateChild(child.parentId, child.id, changes);
    setFinalAttempt(attempt);
    setPhase("challenge-result");
    onChildChanged();
  };

  if ((phase === "playing" || phase === "question-result") && challenge) {
    const puzzle = challenge.puzzles[questionIndex];
    const completedQuestionCount = results.length;
    const nextAction = currentResult ? getFastPassNextAction({
      currentQuestionIndex: questionIndex,
      completedQuestionCount,
      totalQuestionCount: challenge.puzzles.length
    }) : null;
    const nextLabel = nextAction?.label ?? "完成后才能继续";
    const managedResultFeedback = {
      title: questionIndex === 2 ? "3 题挑战完成" : `第 ${questionIndex + 1} 题完成`,
      progress: `挑战进度：${questionIndex + 1} / ${challenge.puzzles.length}`,
      message: questionIndex === 0
        ? "还剩 2 题，继续完成即可进行秘籍验证。"
        : questionIndex === 1
          ? "还剩最后 1 题。"
          : "现在可以查看秘籍验证结果。"
    };
    const progressMessage = currentResult
      ? questionIndex === 0
        ? "第 1 题完成，还剩 2 题"
        : questionIndex === 1
          ? "第 2 题完成，还剩最后 1 题"
          : "3 道挑战题已全部完成"
      : questionIndex === 2
        ? `最后一题，通过验证即可解锁 L${challenge.targetLevel}-1`
        : `完成三题并通过验证，即可解锁 L${challenge.targetLevel}-1`;
    return (
      <div className="fast-pass-page fast-pass-challenge-page">
        <section className="fast-pass-progress" aria-label="快速通关挑战进度">
          <button type="button" onClick={onBackToMap}>退出挑战</button>
          <div>
            <p className="eyebrow">闯关秘籍 · 挑战 L{challenge.targetLevel}</p>
            <h2>第 {questionIndex + 1} / 3 题</h2>
            <p className="fast-pass-progress-message">{progressMessage}</p>
          </div>
          {currentResult
            ? <button className="primary" type="button" onClick={continueChallenge} disabled={isAdvancing}>{nextLabel}</button>
            : <span>完成后才能继续</span>}
        </section>
        <SudokuBoard
          child={child}
          puzzle={puzzle}
          onBack={onBackToMap}
          onNext={continueChallenge}
          onSave={() => undefined}
          onPrint={() => undefined}
          onBackToMap={onBackToMap}
          onBackToPractice={onBackToMap}
          onChildChanged={() => undefined}
          onManagedResult={recordQuestionResult}
          backLabel="退出挑战"
          nextLabel={nextLabel}
          nextDisabled={isAdvancing}
          managedResultFeedback={managedResultFeedback}
        />
      </div>
    );
  }

  if (phase === "challenge-result" && finalAttempt) {
    const passedCount = finalAttempt.results.filter((result) => result.passed).length;
    return (
      <main className="fast-pass-page fast-pass-result-page">
        <section className={`fast-pass-result-panel ${finalAttempt.passed ? "passed" : "failed"}`}>
          <p className="eyebrow">3 题挑战完成</p>
          <h2>{finalAttempt.passed ? "秘籍验证通过" : "这次还差一点"}</h2>
          <p>{finalAttempt.passed
            ? `已解锁 L${finalAttempt.targetLevel}-1，前面的关卡已标记为“秘籍已验证”，以后仍可回来补星星。`
            : "目标关卡暂未解锁。继续练习后，可以再来挑战。"}</p>
          <div className="fast-pass-result-summary" aria-label="快速通关结果摘要">
            <span><strong>{passedCount}/3</strong>达标题目</span>
            <span><strong>{finalAttempt.results[2]?.passed ? "达标" : "未达标"}</strong>代表题</span>
            <span><strong>{finalAttempt.passed ? `L${finalAttempt.targetLevel}-1` : "无变化"}</strong>闯关起点</span>
          </div>
          {finalAttempt.passed ? (
            <div className="form-actions">
              <button className="primary" type="button" onClick={() => onOpenLevel(finalAttempt.targetLevel)}>前往 L{finalAttempt.targetLevel}</button>
              <button type="button" onClick={onBackToMap}>返回探险地图</button>
            </div>
          ) : (
            <div className="form-actions">
              <button className="primary" type="button" onClick={() => startChallenge(finalAttempt.targetLevel)}>再次挑战</button>
              <button type="button" onClick={onBackToMap}>返回探险地图</button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const targetConfig = getDifficultyLevel(selectedTarget);
  const questionSummary = getFastPassQuestionSummary(selectedTarget);
  return (
    <main className="fast-pass-page fast-pass-intro-page">
      <section className="fast-pass-intro-panel">
        <header className="fast-pass-intro-header">
          <button className="back-button fast-pass-back-button" type="button" onClick={onBackToMap}>← 返回探险地图</button>
          <h2>用 3 道挑战题验证闯关起点</h2>
        </header>
        <div className="fast-pass-recommendation">
          <div className="fast-pass-level-mark"><span>系统建议</span><strong>L{recommendation.targetLevel}</strong></div>
          <div className="fast-pass-recommendation-copy">
            <span>推荐验证起点</span>
            <p>{recommendation.reason}</p>
          </div>
        </div>
        <section className="fast-pass-custom-target" aria-labelledby="fast-pass-custom-target-title">
          <div className="fast-pass-custom-copy">
            <h3 id="fast-pass-custom-target-title">选择挑战等级</h3>
          </div>
          <div className="fast-pass-target-picker" role="group" aria-label="快速通关目标等级">
            <button
              className={selectedTarget === recommendation.targetLevel ? "active" : ""}
              type="button"
              aria-pressed={selectedTarget === recommendation.targetLevel}
              onClick={() => setSelectedTarget(recommendation.targetLevel)}
            >
              L{recommendation.targetLevel} 推荐
            </button>
            {recommendation.higherTargetLevel && (
              <button
                className={selectedTarget === recommendation.higherTargetLevel ? "active" : ""}
                type="button"
                aria-pressed={selectedTarget === recommendation.higherTargetLevel}
                onClick={() => setSelectedTarget(recommendation.higherTargetLevel!)}
              >
                L{recommendation.higherTargetLevel} 进阶
              </button>
            )}
          </div>
        </section>
        <section className="fast-pass-route-preview" aria-label="当前挑战摘要">
          <div className="fast-pass-target-facts">
            <div><span>目标题型</span><strong>{sizeLabels[targetConfig.size]} · {difficultyLabels[targetConfig.difficulty]}</strong></div>
            <div><span>通过后前往</span><strong>L{selectedTarget}-1</strong></div>
          </div>
        </section>
        <footer className="fast-pass-intro-actions">
          <button className="fast-pass-details-button" type="button" onClick={() => setDetailsOpen(true)}>挑战说明</button>
          <button className="primary fast-pass-start-button" type="button" onClick={() => startChallenge()}>开始 3 题挑战</button>
        </footer>
      </section>
      {detailsOpen && (
        <div className="fast-pass-details-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailsOpen(false);
        }}>
          <section className="fast-pass-details-dialog" role="dialog" aria-modal="true" aria-labelledby="fast-pass-details-title">
            <button className="fast-pass-rules-close" type="button" aria-label="关闭挑战说明" onClick={() => setDetailsOpen(false)}>×</button>
            <p className="eyebrow">闯关秘籍</p>
            <h2 id="fast-pass-details-title">挑战说明</h2>
            <ol className="fast-pass-question-list">
              {questionSummary.map((item, index) => {
                const [stepLabel, puzzleLabel] = item.label.split(" · ");
                return (
                  <li key={`${item.level}-${index}`}>
                    <span>{index + 1}</span>
                    <div><small>{stepLabel}</small><strong>{puzzleLabel}</strong></div>
                  </li>
                );
              })}
            </ol>
            <p className="fast-pass-pass-rule">3 题全部完成 · 至少 2 题达标 · 第 3 题必须达标</p>
            <p className="fast-pass-assurance">通过后只解锁闯关起点，不改变能力等级，也不会赠送完成记录或星星。</p>
            <button className="primary" type="button" onClick={() => setDetailsOpen(false)}>知道了</button>
          </section>
        </div>
      )}
    </main>
  );
}
