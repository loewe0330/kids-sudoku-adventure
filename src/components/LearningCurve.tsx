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
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [activeInsight, setActiveInsight] = useState<"recent" | "adventure" | "methods" | null>(null);
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
      <p className="growth-learning-comment">{growthConclusion}</p>
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
    <main className="learning-page growth-report-page map-shell explorer-journal">
      <section className="growth-report-hero explorer-card" aria-labelledby="growth-report-title">
        <div className="growth-conclusion-copy">
          <p className="eyebrow">探险成长档案 · {gradeLabels[child.gradeLevel]}</p>
          <h2 id="growth-report-title">{child.name}的成长报告</h2>
          <p>看清现在的水平、最近表现和下一步练习方向。</p>
          <div className="growth-conclusion-lines">
            <p className="growth-evaluation-line"><span aria-hidden="true">★</span><strong>成长评价：</strong>{growthConclusion}</p>
            <p className="growth-next-step-line"><span aria-hidden="true">芽</span><strong>下一步建议：</strong>{nextSuggestion}</p>
          </div>
        </div>
        <div className="growth-context-chips">
          <span className="growth-level-chip">能力等级：{ability.title}</span>
          <span className="growth-progress-chip">闯关进度：{adventureContext.progressLabel}</span>
        </div>
        <div className="growth-hero-scene" aria-hidden="true">
          <span className="growth-scene-cloud" />
          <span className="growth-scene-mountain" />
          <span className="growth-scene-tree" />
          <span className="growth-scene-route" />
          <span className="growth-scene-chest" />
        </div>
      </section>

      <section className="growth-section growth-overview-card explorer-card" aria-labelledby="growth-overview-title">
        <div className="growth-section-heading">
          <div><h3 id="growth-overview-title">核心数据</h3></div>
        </div>
        <div className="growth-core-metrics">
          <article><i aria-hidden="true">★</i><span><small>累计星星</small><strong>{totalStars}</strong></span></article>
          <article><i aria-hidden="true">✓</i><span><small>已完成小关</small><strong>{adventureStats.completedStageCount}</strong></span></article>
          <article><i aria-hidden="true">▥</i><span><small>最近完成率</small><strong>{recent.length === 0 ? "暂无" : `${recentCompletionRate}%`}</strong></span></article>
          <article><i aria-hidden="true">◷</i><span><small>平均用时</small><strong>{recent.length === 0 ? "暂无" : formatDuration(recentAverageDuration)}</strong></span></article>
        </div>
      </section>

      <section className="growth-section growth-insights-panel explorer-card" aria-labelledby="growth-insights-title">
        <div className="growth-section-heading growth-insights-heading">
          <div><h3 id="growth-insights-title">{activeInsight ? "洞察详情" : "成长洞察"}</h3></div>
          {activeInsight && (
            <button type="button" className="secondary growth-insight-back" onClick={() => setActiveInsight(null)}>
              返回成长洞察
            </button>
          )}
        </div>
        {activeInsight ? (
          <div className="growth-insight-detail" data-testid="growth-insight-detail">
            {activeInsight === "recent" && recentPerformanceCard}
            {activeInsight === "adventure" && adventureProgressCard}
            {activeInsight === "methods" && methodMasteryCard}
          </div>
        ) : (
          <div className="growth-insight-entry-grid">
            <button type="button" className="growth-insight-entry recent" onClick={() => setActiveInsight("recent")}>
              <span aria-hidden="true">↗</span><strong>最近表现</strong><small>{recent.length === 0 ? "完成练习后查看分析" : `完成率 ${recentCompletionRate}%`}</small><em>查看详情</em>
            </button>
            <button type="button" className="growth-insight-entry adventure" onClick={() => setActiveInsight("adventure")}>
              <span aria-hidden="true">⚑</span><strong>闯关进度</strong><small>推荐 {recommendedLabel}</small><em>查看详情</em>
            </button>
            <button type="button" className="growth-insight-entry methods" onClick={() => setActiveInsight("methods")}>
              <span aria-hidden="true">●</span><strong>方法掌握</strong><small>继续练 {suggestedMethod?.shortTitle ?? "观察法"}</small><em>查看详情</em>
            </button>
          </div>
        )}
      </section>

      <section className="growth-section growth-record-log explorer-card" aria-labelledby="growth-record-title">
        <div className="growth-section-heading">
          <div><h3 id="growth-record-title">练习日志</h3></div>
          <button
            className="secondary growth-record-toggle"
            aria-expanded={recordsOpen}
            onClick={() => {
              setRecordsOpen((value) => !value);
              setShowAllRecords(false);
            }}
          >
            {recordsOpen ? "收起练习日志" : "展开练习日志"}
          </button>
        </div>
        {recordsOpen && (
          visibleRecords.length > 0 ? (
            <>
              <CompactRecordTable records={visibleRecords} expanded={showAllRecords} />
              {recent.length > 3 && (
                <button className="secondary growth-record-more-toggle" onClick={() => setShowAllRecords((value) => !value)}>
                  {showAllRecords ? "只看最近 3 条" : "查看全部记录"}
                </button>
              )}
            </>
          ) : (
            <div className="growth-empty-log"><span aria-hidden="true">⌕</span><p>暂无练习记录，完成一题后这里会留下新的探险足迹。</p></div>
          )
        )}
      </section>
    </main>
  );
}
