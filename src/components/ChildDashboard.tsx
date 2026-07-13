import { getDifficultyLevel } from "../constants/difficultyLevels";
import { sizeLabels } from "../constants/gradeLabels";
import { getAdventureDisplayContext, getAdventureMap, getAdventureStats } from "../lib/adventure";
import { getTotalEarnedStars } from "../lib/gamification";
import { getPracticeRecordsByChild } from "../lib/storage";
import { getChildSummary } from "../lib/stats";
import type { AdventureStage, ChildProfile, PracticeRecord } from "../types";
import { MiniGamePanel } from "./MiniGamePanel";

interface ChildDashboardProps {
  child: ChildProfile;
  onOpenPractice: () => void;
  onOpenCurve: () => void;
  onOpenAdventure: () => void;
}

const sameDay = (isoTime: string | undefined, dayKey: string): boolean => {
  if (!isoTime) return false;
  return new Date(isoTime).toDateString() === dayKey;
};

const getStageState = (stage: AdventureStage): { className: string; label: string; value: string } => {
  if (stage.completed) return { className: "completed", label: "已完成", value: "✓" };
  if (stage.recommended) return { className: "current", label: "当前推荐", value: String(stage.stageIndex) };
  if (!stage.unlocked) return { className: "locked", label: "未解锁", value: "锁" };
  return { className: "available", label: "可挑战", value: String(stage.stageIndex) };
};

function TodayTaskCard({
  child,
  stages,
  progressLabel,
  gapMessage,
  todayCompleted,
  completedCount,
  accuracyLabel,
  onOpenAdventure
}: {
  child: ChildProfile;
  stages: AdventureStage[];
  progressLabel: string;
  gapMessage: string;
  todayCompleted: number;
  completedCount: number;
  accuracyLabel: string;
  onOpenAdventure: () => void;
}) {
  const recommended = stages.find((stage) => stage.recommended) ?? stages.find((stage) => stage.unlocked && !stage.completed) ?? stages[0];
  const taskLabel = recommended ? `L${recommended.level}-${recommended.stageIndex} ${recommended.levelName}` : progressLabel;

  return (
    <article className="today-task-card" aria-label="今日任务">
      <div className="today-task-sign" aria-hidden="true"><span>今日任务</span></div>
      <section className="today-task-copy">
        <p className="eyebrow">今天最适合做什么？</p>
        <h2>欢迎回来，{child.name}！</h2>
        <h3>继续挑战 {taskLabel}</h3>
        <p>沿着地图前进，一关一关点亮星星。</p>
        <dl className="today-task-context">
          <div><dt>能力等级</dt><dd>{getDifficultyLevel(child.currentLevel).label}</dd></div>
          <div><dt>闯关进度</dt><dd>{progressLabel}</dd></div>
        </dl>
        <p className="today-task-note">{gapMessage}</p>
      </section>

      <section className="today-route-map" aria-label="当前大关小关路径">
        <span className="today-route-path" aria-hidden="true" />
        {stages.slice(0, 5).map((stage) => {
          const state = getStageState(stage);
          return (
            <span
              key={`${stage.level}-${stage.stageIndex}`}
              className={`today-route-node ${state.className}`}
              aria-label={`L${stage.level}-${stage.stageIndex}，${state.label}`}
            >
              <strong>{state.value}</strong>
              <small>{stage.stageIndex}</small>
            </span>
          );
        })}
        <span className="today-route-tree tree-one" aria-hidden="true" />
        <span className="today-route-tree tree-two" aria-hidden="true" />
        <span className="today-route-treasure" aria-hidden="true" />
      </section>

      <aside className="today-task-actions">
        <div className="today-task-stats" aria-label="今日任务数据">
          <span><i className="complete" aria-hidden="true" /><strong>{todayCompleted}</strong><small>今日完成</small></span>
          <span><i className="progress" aria-hidden="true" /><strong>{completedCount}/5</strong><small>当前进度</small></span>
          <span><i className="accuracy" aria-hidden="true" /><strong>{accuracyLabel}</strong><small>最近正确率</small></span>
        </div>
        <button className="primary today-primary-action" onClick={onOpenAdventure}>继续闯关</button>
      </aside>
    </article>
  );
}

function PracticeEntryCard({ child, onOpenPractice }: { child: ChildProfile; onOpenPractice: () => void }) {
  const config = getDifficultyLevel(child.currentLevel);
  return (
    <article className="home-support-card practice-support-card" aria-label="自由练习入口">
      <div className="support-card-icon practice" aria-hidden="true"><span>4</span></div>
      <div className="support-card-copy">
        <p className="eyebrow">辅助入口</p>
        <h2>自由练习</h2>
        <p>不受闯关限制，自由选择题型和难度。</p>
        <p className="support-card-meta"><strong>推荐题型：</strong>{sizeLabels[config.size]} · 练习选择 / 我的题库 / 批量出题 / 打印练习</p>
        <button onClick={onOpenPractice}>进入自由练习</button>
      </div>
    </article>
  );
}

function GrowthEntryCard({
  totalStars,
  completedStages,
  recentCompletionRate,
  onOpenCurve
}: {
  totalStars: number;
  completedStages: number;
  recentCompletionRate: string;
  onOpenCurve: () => void;
}) {
  return (
    <article className="home-support-card growth-support-card" aria-label="成长报告入口">
      <div className="support-card-icon growth" aria-hidden="true">★</div>
      <div className="support-card-copy">
        <p className="eyebrow">成长摘要</p>
        <h2>成长报告</h2>
        <p>查看最近表现、星星、徽章和下一步建议。</p>
        <div className="support-growth-stats">
          <span><strong>{totalStars}</strong><small>累计星星</small></span>
          <span><strong>{completedStages}</strong><small>已完成小关</small></span>
          <span><strong>{recentCompletionRate}</strong><small>最近完成率</small></span>
        </div>
        <button onClick={onOpenCurve}>查看成长</button>
      </div>
    </article>
  );
}

function BottomTrailAnimation() {
  return (
    <div className="bottom-trail-animation" aria-hidden="true">
      <span className="trail-cloud cloud-one" />
      <span className="trail-cloud cloud-two" />
      <span className="trail-hill hill-one" />
      <span className="trail-hill hill-two" />
      <span className="trail-path" />
      <span className="trail-dot dot-one" />
      <span className="trail-dot dot-two" />
      <span className="trail-dot dot-three" />
      <span className="trail-dot dot-four" />
      <span className="trail-star">★</span>
      <span className="trail-tree tree-one" />
      <span className="trail-tree tree-two" />
      <span className="trail-tree tree-three" />
      <span className="trail-chest" />
    </div>
  );
}

export function ExplorerHomePage({ child, onOpenPractice, onOpenCurve, onOpenAdventure }: ChildDashboardProps) {
  const records = getPracticeRecordsByChild(child.parentId, child.id);
  const summary = getChildSummary(child.parentId, child.id);
  const adventureStats = getAdventureStats(child);
  const adventureContext = getAdventureDisplayContext(child);
  const adventureMap = getAdventureMap(child);
  const recommendedLevel = adventureContext.recommendedStage?.level ?? 1;
  const currentStages = adventureMap.filter((stage) => stage.level === recommendedLevel).slice(0, 5);
  const completedInCurrent = currentStages.filter((stage) => stage.completed).length;
  const todayKey = new Date().toDateString();
  const todayCompleted = records.filter((record) => record.completed && !record.gaveUp && sameDay(record.finishedAt ?? record.startedAt, todayKey)).length;
  const recentCompletionRate = records.length === 0 ? "暂无" : `${Math.round(summary.recentCompletionRate * 100)}%`;

  return (
    <main className="explorer-page simplified-home-page map-shell" aria-label="孩子首页">
      <section className="home-dashboard-grid">
        <TodayTaskCard
          child={child}
          stages={currentStages}
          progressLabel={adventureContext.progressLabel}
          gapMessage={adventureContext.gapMessage}
          todayCompleted={todayCompleted}
          completedCount={completedInCurrent}
          accuracyLabel="暂无"
          onOpenAdventure={onOpenAdventure}
        />
        <aside className="home-side-panel" aria-label="辅助入口与探索风景">
          <section className="home-support-grid" aria-label="辅助入口">
            <PracticeEntryCard child={child} onOpenPractice={onOpenPractice} />
            <GrowthEntryCard
              totalStars={getTotalEarnedStars(records)}
              completedStages={adventureStats.completedStageCount}
              recentCompletionRate={recentCompletionRate}
              onOpenCurve={onOpenCurve}
            />
          </section>
          <BottomTrailAnimation />
        </aside>
      </section>
      <MiniGamePanel />
    </main>
  );
}

export function ChildDashboard(props: ChildDashboardProps) {
  return <ExplorerHomePage {...props} />;
}
