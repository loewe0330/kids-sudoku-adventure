import { useState } from "react";
import { difficultyLabels, sizeLabels } from "../constants/gradeLabels";
import { getAbilityDisplayModel } from "../lib/ability";
import { getAdventureDisplayContext, getAdventureStats } from "../lib/adventure";
import { getDailyPracticeRecommendation } from "../lib/dailyPracticeRecommendation";
import { getTotalEarnedStars } from "../lib/gamification";
import { getPracticeRecordsByChild } from "../lib/storage";
import { getChildSummary } from "../lib/stats";
import type { ChildProfile } from "../types";
import { sudokuAdventureAssets } from "../ui/assets/sudokuAdventureAssets";
import { MiniGamePanel } from "./MiniGamePanel";
import { AssetImage } from "./ui/AssetImage";
import { FeatureEntryCard } from "./ui/AdventurePrimitives";

interface ChildDashboardProps {
  child: ChildProfile;
  onOpenPractice: () => void;
  onOpenCurve: () => void;
  onOpenAdventure: () => void;
  onOpenFastPass: () => void;
}

export function ExplorerHomePage({ child, onOpenPractice, onOpenCurve, onOpenAdventure, onOpenFastPass }: ChildDashboardProps) {
  const [miniGameOpen, setMiniGameOpen] = useState(false);
  const records = getPracticeRecordsByChild(child.parentId, child.id);
  const ability = getAbilityDisplayModel(child, records);
  const summary = getChildSummary(child.parentId, child.id);
  const adventureStats = getAdventureStats(child);
  const adventureContext = getAdventureDisplayContext(child);
  const dailyRecommendation = getDailyPracticeRecommendation({ child, practiceRecords: records });
  const totalStars = getTotalEarnedStars(records);
  const completionRate = records.length === 0 ? "待探索" : `${Math.round(summary.recentCompletionRate * 100)}%`;
  const recommendedStage = adventureContext.recommendedStage;
  const adventureLabel = recommendedStage ? `L${recommendedStage.level}-${recommendedStage.stageIndex}` : adventureContext.progressLabel;

  return (
    <main className="explorer-page forest-home-page map-shell" aria-label="孩子首页">
      <button type="button" className="forest-today-task" onClick={onOpenPractice}>
        <AssetImage src={sudokuAdventureAssets.common.woodenSign} alt="今日任务木质路牌" className="forest-today-sign" loading="eager" />
        <span className="forest-today-copy">
          <small>今天先做什么</small>
          <strong>今日任务</strong>
          <em>{dailyRecommendation.title} · {sizeLabels[dailyRecommendation.size]} {difficultyLabels[dailyRecommendation.difficulty]}</em>
        </span>
        <span className="forest-round-arrow" aria-hidden="true">›</span>
      </button>

      <button type="button" className="forest-map-card" onClick={onOpenAdventure}>
        <AssetImage src={sudokuAdventureAssets.home.adventureMap} alt="森林河流闯关地图" className="forest-map-art" loading="eager" objectFit="cover" />
        <span className="forest-map-copy">
          <small>当前进度 {adventureLabel}</small>
          <strong>闯关地图</strong>
          <em>继续闯关 <span aria-hidden="true">▶</span></em>
        </span>
        <span className="forest-map-stats"><b>{adventureStats.completedStageCount}</b> 已完成 · <b>{totalStars}</b> 星星</span>
      </button>

      <section className="forest-home-entries" aria-label="核心功能入口">
        <FeatureEntryCard
          title="自由练习"
          description={`${sizeLabels[ability.recommendedConfig.size]} · ${difficultyLabels[ability.recommendedConfig.difficulty]}`}
          image={sudokuAdventureAssets.home.sudokuBoard}
          imageAlt="带铅笔的数独棋盘"
          tone="sky"
          onClick={onOpenPractice}
        />
        <FeatureEntryCard
          title="成长报告"
          description={`${totalStars} 颗星 · 最近完成率 ${completionRate}`}
          image={sudokuAdventureAssets.home.growthTrophy}
          imageAlt="金色星星奖杯"
          tone="purple"
          onClick={onOpenCurve}
        />
        <FeatureEntryCard
          title="闯关秘籍"
          description="完成 3 道验证题，找到合适起点"
          image={sudokuAdventureAssets.home.secretBookChest}
          imageAlt="秘籍书本和宝箱"
          tone="gold"
          onClick={onOpenFastPass}
        />
      </section>

      {miniGameOpen && <div className="disclosure-backdrop" data-testid="home-disclosure-backdrop" role="presentation" onMouseDown={() => setMiniGameOpen(false)} />}
      <details className="home-mini-game-disclosure" open={miniGameOpen}>
        <summary onClick={(event) => { event.preventDefault(); setMiniGameOpen((value) => !value); }}>探险休息站 · 数独小游戏 <span aria-hidden="true">⌄</span></summary>
        <MiniGamePanel />
      </details>
    </main>
  );
}

export function ChildDashboard(props: ChildDashboardProps) {
  return <ExplorerHomePage {...props} />;
}
