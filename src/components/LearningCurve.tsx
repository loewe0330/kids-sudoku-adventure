import { useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { getAbilityDisplayModel } from "../lib/ability";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { getAdventureDisplayContext, getAdventureMap, getAdventureStats } from "../lib/adventure";
import { getTotalEarnedStars } from "../lib/gamification";
import { getGradeMethods, getLevelMethods, sudokuMethods } from "../lib/methodGuide";
import {
  getAverageDuration,
  getAverageHints,
  getAverageMistakes,
  getCompletionRate,
  getHighestPracticeLevel,
  getRecentRecords
} from "../lib/stats";
import { formatDateTime, formatDuration } from "../lib/time";
import type { ChildProfile, PracticeRecord } from "../types";
import { sudokuAdventureAssets } from "../ui/assets/sudokuAdventureAssets";
import { AssetImage } from "./ui/AssetImage";
import { AdventureAccordion, SummaryMetricCard } from "./ui/AdventurePrimitives";

interface LearningCurveProps {
  child: ChildProfile;
}

const modeLabel = (record: PracticeRecord): string =>
  record.mode === "adventure" ? "闯关" : record.mode === "challenge" ? "挑战" : "练习";

const sourceLabel = (record: PracticeRecord): string => {
  if (record.mode === "adventure") return "闯关记录";
  if (record.source === "custom") return "自选练习";
  if (record.source === "review") return "巩固练习";
  if (record.source === "challenge") return "挑战练习";
  if (record.source === "bank") return "我的题库";
  return "智能推荐";
};

const resultLabel = (record: PracticeRecord): string =>
  record.gaveUp ? "稍后再试" : record.completed ? "已完成" : "进行中";

function CompactRecordTable({ records, expanded }: { records: PracticeRecord[]; expanded: boolean }) {
  return (
    <>
      <div className="growth-record-table table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>模式</th>
              <th>{expanded ? "等级" : "关卡 / 等级"}</th>
              <th>结果</th>
              <th>星星</th>
              <th>用时</th>
              {expanded && <th>题型</th>}
              {expanded && <th>难度</th>}
              {expanded && <th>错误</th>}
              {expanded && <th>提示</th>}
              {expanded && <th>来源</th>}
              {expanded && <th>完成</th>}
              {expanded && <th>放弃</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{formatDateTime(record.finishedAt ?? record.startedAt)}</td>
                <td>{modeLabel(record)}</td>
                <td>{record.mode === "adventure" && record.stageIndex ? `L${record.level}-${record.stageIndex}` : getDifficultyLevel(record.level).label}</td>
                <td>{resultLabel(record)}</td>
                <td>{record.stars}</td>
                <td>{formatDuration(record.durationSeconds)}</td>
                {expanded && <td>{sizeLabels[record.size]}</td>}
                {expanded && <td>{difficultyLabels[record.difficulty]}</td>}
                {expanded && <td>{record.mistakeCount}</td>}
                {expanded && <td>{record.hintCount}</td>}
                {expanded && <td>{sourceLabel(record)}</td>}
                {expanded && <td>{record.completed ? "是" : "否"}</td>}
                {expanded && <td>{record.gaveUp ? "是" : "否"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="growth-record-cards" aria-label="最近练习卡片">
        {records.map((record) => (
          <article key={record.id} className="growth-record-card">
            <div>
              <strong>{record.mode === "adventure" && record.stageIndex ? `L${record.level}-${record.stageIndex}` : `L${record.level} ${sizeLabels[record.size]}`}</strong>
              <span>{formatDateTime(record.finishedAt ?? record.startedAt)}</span>
            </div>
            <dl>
              <div><dt>模式</dt><dd>{modeLabel(record)}</dd></div>
              <div><dt>结果</dt><dd>{resultLabel(record)}</dd></div>
              <div><dt>星星</dt><dd>{"★".repeat(record.stars) || "暂无"}</dd></div>
              <div><dt>用时</dt><dd>{formatDuration(record.durationSeconds)}</dd></div>
              {expanded && <div><dt>错误 / 提示</dt><dd>{record.mistakeCount} / {record.hintCount}</dd></div>}
              {expanded && <div><dt>来源</dt><dd>{sourceLabel(record)}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

export function LearningCurve({ child }: LearningCurveProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const recent = getRecentRecords(child.parentId, child.id, 20);
  const ability = getAbilityDisplayModel(child, recent);
  const recent10 = recent.slice(0, 10);
  const visibleRecords = showAllRecords ? recent : recent.slice(0, 3);
  const adventureStats = getAdventureStats(child);
  const adventureContext = getAdventureDisplayContext(child);
  const adventureMap = getAdventureMap(child);
  const recommended = adventureStats.recommendedStage;
  const currentAdventureLevel = recommended?.level ?? child.currentLevel;
  const currentStages = adventureMap.filter((stage) => stage.level === currentAdventureLevel).slice(0, 5);
  const totalStars = getTotalEarnedStars(recent);
  const highestPracticeLevel = getHighestPracticeLevel(recent, child.currentLevel);
  const gradeMethods = getGradeMethods(child.gradeLevel);
  const methodLevel = recent.length === 0 ? currentAdventureLevel : highestPracticeLevel;
  const touchedMethods = getLevelMethods(methodLevel);
  const suggestedMethod = touchedMethods[touchedMethods.length - 1] ?? gradeMethods[0];
  const suggestedIndex = Math.max(0, sudokuMethods.findIndex((method) => method.id === suggestedMethod?.id));
  const nextMethod = sudokuMethods[Math.min(sudokuMethods.length - 1, suggestedIndex + 1)] ?? suggestedMethod;
  const completedCurrentStages = currentStages.filter((stage) => stage.completed).length;
  const recentCompletionRate = Math.round(getCompletionRate(recent10) * 100);
  const recentAverageDuration = getAverageDuration(recent10);
  const recentAverageHints = getAverageHints(recent10);
  const recentAverageMistakes = getAverageMistakes(recent10);
  const recommendedLabel = recommended ? `L${recommended.level}-${recommended.stageIndex}` : "暂无";
  const growthConclusion = recent.length === 0
    ? "刚开始探索，先从第一关稳稳练起。"
    : recentAverageHints > 2
      ? "最近提示使用较多，建议先巩固当前关卡。"
      : recentCompletionRate >= 80 && recentAverageMistakes <= 1.5 && recentAverageHints <= 1
        ? "完成又快又准，可以尝试更高一级。"
        : recentCompletionRate >= 60
          ? "最近表现稳定，可以继续挑战下一关。"
          : "正在积累经验，坚持完成当前关卡就是进步。";
  const nextSuggestion = recommended
    ? `继续完成 L${recommended.level}-${recommended.stageIndex}，熟悉${touchedMethods.map((method) => method.shortTitle).join("和")}。`
    : "完成一题后，这里会给出下一步练习建议。";
  const toggleSection = (id: string) => {
    setOpenSections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    if (id === "records") setShowAllRecords(false);
  };

  const recentPerformanceCard = (
    <section className="growth-section recent-performance-card explorer-card" aria-labelledby="recent-performance-title">
      <div className="growth-section-heading">
        <div><h3 id="recent-performance-title"><span aria-hidden="true">↗</span>最近表现</h3></div>
      </div>
      <div className="recent-performance-metrics">
        <span><strong>{recent.length === 0 ? "暂无" : `${recentCompletionRate}%`}</strong><small>最近完成率</small></span>
        <span><strong>{recent.length === 0 ? "暂无" : formatDuration(recentAverageDuration)}</strong><small>平均用时</small></span>
        <span><strong>{recent.length === 0 ? "暂无" : recentAverageHints.toFixed(1)}</strong><small>平均提示</small></span>
      </div>
    </section>
  );

  const adventureProgressCard = (
    <section className="growth-section adventure-progress-card explorer-card" aria-labelledby="adventure-progress-title">
      <div className="growth-section-heading">
        <div><h3 id="adventure-progress-title"><span aria-hidden="true">⚑</span>闯关进度</h3></div>
        <span className="recommended-stage-chip">推荐 {recommendedLabel}</span>
      </div>
      <div className="adventure-progress-summary">
        <span><strong>L{currentAdventureLevel}</strong><small>当前大关</small></span>
        <span><strong>{recommendedLabel}</strong><small>推荐关卡</small></span>
        <span><strong>{completedCurrentStages}</strong><small>已完成小关</small></span>
        <span><strong>{adventureStats.threeStarStageCount}</strong><small>3 星小关</small></span>
      </div>
      <div className="growth-stage-route" aria-label={`L${currentAdventureLevel} 小关路径`}>
        {currentStages.map((stage) => (
          <span key={`${stage.level}-${stage.stageIndex}`} className={stage.completed ? "completed" : stage.recommended ? "current" : stage.unlocked ? "available" : "locked"}>
            <strong>L{stage.level}-{stage.stageIndex}</strong>
            <small>{stage.completed ? `${"★".repeat(stage.bestStars)}${"☆".repeat(3 - stage.bestStars)}` : stage.recommended ? "待挑战" : stage.unlocked ? "可挑战" : "未解锁"}</small>
          </span>
        ))}
      </div>
    </section>
  );

  const methodMasteryCard = (
    <section className="growth-section method-mastery-card explorer-card" aria-labelledby="method-mastery-title">
      <div className="growth-section-heading">
        <div><h3 id="method-mastery-title"><span aria-hidden="true">●</span>方法掌握</h3></div>
      </div>
      <div className="method-mastery-groups">
        <div><small>已接触方法</small><p>{touchedMethods.map((method) => <span key={method.id}>{method.shortTitle}</span>)}</p></div>
        <div><small>建议继续练</small><p><span className="suggested">{suggestedMethod?.shortTitle ?? "观察法"}</span></p></div>
        <div><small>下一步方法</small><p><span className="next">{nextMethod?.shortTitle ?? "排除法"}</span></p></div>
      </div>
    </section>
  );

  return (
    <main className="learning-page forest-growth-page map-shell" aria-labelledby="growth-report-title">
      <section className="forest-growth-hero">
        <AssetImage src={sudokuAdventureAssets.growth.hero} alt="森林与挥手探险员成长插画" className="forest-growth-hero-art" loading="eager" objectFit="cover" />
        <div><p>{gradeLabels[child.gradeLevel]} · {child.name}</p><h2 id="growth-report-title">成长报告</h2><span>{growthConclusion}</span></div>
      </section>

      <section className="forest-growth-metrics" aria-label="成长摘要">
        <SummaryMetricCard label="当前称号" value={ability.title} image={sudokuAdventureAssets.growth.currentTitleBadge} imageAlt="绿色皇冠称号徽章" />
        <SummaryMetricCard label="累计星星" value={totalStars} image={sudokuAdventureAssets.growth.starTrophy} imageAlt="金色星星奖杯" />
        <SummaryMetricCard label="最近完成率" value={recent.length === 0 ? "暂无" : `${recentCompletionRate}%`} image={sudokuAdventureAssets.growth.completionTarget} imageAlt="绿色完成率靶心" />
        <SummaryMetricCard label="当前进度" value={adventureContext.progressLabel} image={sudokuAdventureAssets.growth.progressMap} imageAlt="带旗帜的探险地图" />
      </section>

      <section className="forest-growth-accordions" aria-label="成长详情">
        <AdventureAccordion id="recent" title="最近表现" summary={recent.length === 0 ? "完成练习后查看分析" : `最近完成率 ${recentCompletionRate}%`} image={sudokuAdventureAssets.growth.recentPerformanceSun} imageAlt="微笑太阳" open={openSections.includes("recent")} onToggle={() => toggleSection("recent")}>{recentPerformanceCard}</AdventureAccordion>
        <AdventureAccordion id="methods" title="方法掌握" summary={`继续练习 ${suggestedMethod?.shortTitle ?? "观察法"}`} image={sudokuAdventureAssets.growth.methodLightbulb} imageAlt="发光灯泡" open={openSections.includes("methods")} onToggle={() => toggleSection("methods")}>{methodMasteryCard}</AdventureAccordion>
        <AdventureAccordion id="adventure-progress" title="闯关进度" summary={`当前推荐 ${recommendedLabel}`} image={sudokuAdventureAssets.growth.progressMap} imageAlt="带旗帜的探险地图" open={openSections.includes("adventure")} onToggle={() => toggleSection("adventure")}>{adventureProgressCard}</AdventureAccordion>
        <AdventureAccordion id="records" title="练习记录" summary={recent.length === 0 ? "还没有练习足迹" : `最近记录 ${recent.length} 条`} image={sudokuAdventureAssets.growth.practiceRecordNotebook} imageAlt="带铅笔的练习记录本" open={openSections.includes("records")} onToggle={() => toggleSection("records")}>
          {visibleRecords.length > 0 ? <><CompactRecordTable records={visibleRecords} expanded={showAllRecords} />{recent.length > 3 && <button className="secondary growth-record-more-toggle" onClick={() => setShowAllRecords((value) => !value)}>{showAllRecords ? "只看最近 3 条" : "查看全部记录"}</button>}</> : <div className="growth-empty-log"><p>暂无练习记录，完成一题后这里会留下新的探险足迹。</p></div>}
        </AdventureAccordion>
      </section>

      <aside className="forest-growth-suggestion"><strong>下一步</strong><span>{nextSuggestion}</span></aside>
    </main>
  );
}
