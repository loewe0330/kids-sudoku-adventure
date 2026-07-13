import { useEffect, useMemo, useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { adventureLevelNames, getAdventureDisplayContext, getAdventureMap, getAdventureStats } from "../lib/adventure";
import type { AdventureStage, ChildProfile } from "../types";

interface AdventureMapProps {
  child: ChildProfile;
  parentName?: string;
  onHome?: () => void;
  onOpenAdventure?: () => void;
  onOpenPractice?: () => void;
  onOpenGrowth?: () => void;
  onSwitchChild?: () => void;
  onStartStage: (stage: AdventureStage) => void;
}

const chapterSubtitles: Record<number, string> = {
  1: "基础入门",
  2: "观察与排除",
  3: "行列与宫格",
  4: "排除与唯一",
  5: "线索推理",
  6: "综合逻辑",
  7: "高阶宫格",
  8: "高级推理",
  9: "专家挑战",
  10: "极限挑战",
  11: "王者之路"
};

const chapterFocus: Record<number, string> = {
  1: "训练重点：认识数字位置，先从最明显的空格开始。",
  2: "训练重点：先看一行缺哪些数字，再看列和小宫格。",
  3: "训练重点：把行、列、宫格放在一起观察。",
  4: "训练重点：排除不可能的位置，找到唯一答案。",
  5: "训练重点：像侦探一样串联多个线索。",
  6: "训练重点：综合使用观察、排除和唯一数。",
  7: "训练重点：在更大的宫格里保持清晰记录。",
  8: "训练重点：尝试更长链条的推理。",
  9: "训练重点：减少猜测，用证据推进。",
  10: "训练重点：面对困难题时保持节奏。",
  11: "训练重点：综合挑战，稳定完成高阶数独。"
};

const routePoints = "17,14 50,14 83,14 17,39 50,39 83,39 17,64 50,64 83,64 33,89 67,89";

const stageStars = (stars: number): string => `${"★".repeat(stars)}${"☆".repeat(Math.max(0, 3 - stars))}`;

const chapterStatus = (stages: AdventureStage[]) => {
  const completed = stages.every((stage) => stage.completed);
  const recommended = stages.some((stage) => stage.recommended);
  const unlocked = stages.some((stage) => stage.unlocked);
  if (completed) return { key: "completed", label: "已完成" };
  if (recommended) return { key: "recommended", label: "当前推荐" };
  if (unlocked) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

const stageStatus = (stage: AdventureStage) => {
  if (stage.completed) return { key: "completed", label: "已完成" };
  if (stage.recommended) return { key: "recommended", label: "待挑战" };
  if (stage.unlocked) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

export function AdventureMap({
  child,
  parentName = "测试家长",
  onHome,
  onOpenAdventure,
  onOpenPractice,
  onOpenGrowth,
  onSwitchChild,
  onStartStage
}: AdventureMapProps) {
  const stages = useMemo(() => getAdventureMap(child), [child]);
  const stats = useMemo(() => getAdventureStats(child), [child]);
  const displayContext = useMemo(() => getAdventureDisplayContext(child), [child]);
  const recommendedStage = stats.recommendedStage ?? stages.find((stage) => stage.unlocked) ?? stages[0];
  const [selectedLevel, setSelectedLevel] = useState(recommendedStage?.level ?? 1);
  const [notice, setNotice] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    setSelectedLevel(recommendedStage?.level ?? 1);
    setNotice("");
    setMapExpanded(false);
  }, [child.id, recommendedStage?.level]);

  const chapters = Array.from({ length: 11 }, (_, index) => {
    const level = index + 1;
    const chapterStages = stages.filter((stage) => stage.level === level);
    const status = chapterStatus(chapterStages);
    return {
      level,
      name: adventureLevelNames[level] ?? `L${level}`,
      subtitle: chapterSubtitles[level],
      stages: chapterStages,
      completedCount: chapterStages.filter((stage) => stage.completed).length,
      stars: chapterStages.reduce((sum, stage) => sum + stage.bestStars, 0),
      status
    };
  });

  const selectedChapter = chapters.find((chapter) => chapter.level === selectedLevel) ?? chapters[0];
  const selectedRecommended = selectedChapter.stages.find((stage) => stage.recommended);
  const nextStage = selectedRecommended
    ?? selectedChapter.stages.find((stage) => stage.unlocked && !stage.completed)
    ?? selectedChapter.stages.find((stage) => stage.unlocked)
    ?? selectedChapter.stages[0];
  const selectedConfig = getDifficultyLevel(selectedChapter.level);
  const currentConfig = getDifficultyLevel(child.currentLevel);

  const selectChapter = (chapter: typeof chapters[number]) => {
    if (chapter.status.key === "locked") {
      setNotice("先完成前面的关卡，就能来到这里啦！");
      return;
    }
    setSelectedLevel(chapter.level);
    setNotice("");
  };

  const startStage = (stage: AdventureStage) => {
    if (!stage.unlocked) {
      setNotice("先完成前一小关，就能解锁这一关啦！");
      return;
    }
    onStartStage(stage);
  };

  return (
    <main className="adventure-map-page map-shell">
      <section className="map-title-strip explorer-card no-print">
        <div>
          <p className="eyebrow">自然闯关地图</p>
          <h2>冒险地图 · 11 大关探索之旅</h2>
          <p>沿着路线前进，一关一关点亮星星。</p>
          <p className="adventure-context-note">{displayContext.gapMessage}</p>
        </div>
        <div className="adventure-stat-grid">
          <span><strong>{stats.totalStars}</strong>累计星星</span>
          <span><strong>{displayContext.abilityLabel}</strong>能力等级</span>
          <span><strong>{displayContext.progressLabel}</strong>闯关进度</span>
        </div>
      </section>

      <section className="adventure-two-column">
        <section className={`explorer-card adventure-map-panel ${mapExpanded ? "map-expanded" : "map-collapsed"}`} aria-label="冒险地图">
          <div className="section-title">
            <div>
              <p className="eyebrow">{parentName} · {gradeLabels[child.gradeLevel]}</p>
              <h2>探索地图</h2>
              <p>选择一个岛屿大关，再在右侧挑战这一关的 5 个小关。</p>
            </div>
            <button type="button" onClick={onHome}>返回首页</button>
          </div>
          {notice && <p className="map-notice" role="status">{notice}</p>}
          <div className="trail-map chapter-map" aria-label="11 大关地图">
            <svg className="trail-path chapter-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={routePoints} />
            </svg>
            <div className="chapter-map-grid">
              {chapters.map((chapter) => {
                const isSelected = chapter.level === selectedChapter.level;
                return (
                  <button
                    type="button"
                    data-testid="adventure-chapter-card"
                    key={chapter.level}
                    className={[
                      "chapter-island-card",
                      "adventure-chapter-card",
                      chapter.status.key,
                      isSelected ? "selected" : ""
                    ].join(" ")}
                    aria-pressed={isSelected}
                    onClick={() => selectChapter(chapter)}
                  >
                    {chapter.status.key === "completed" && <span className="chapter-check">✓</span>}
                    {chapter.status.key === "recommended" && <span className="you-are-here">你在这里</span>}
                    <span className="chapter-level">L{chapter.level}</span>
                    <strong>{chapter.name}</strong>
                    <span className="chapter-subtitle">{chapter.subtitle}</span>
                    <span className="chapter-progress-line">{chapter.completedCount}/5 小关 · {chapter.stars}/15★</span>
                    <em>{chapter.status.label}</em>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="adventure-task-board adventure-detail-panel explorer-card" aria-label="当前大关详情">
          <p className="eyebrow">当前大关</p>
          <h2>当前大关：L{selectedChapter.level} {selectedChapter.name}</h2>
          <p>{chapterFocus[selectedChapter.level]}</p>
          <p className="recommend-pill">推荐挑战：{selectedRecommended ? `L${selectedRecommended.level}-${selectedRecommended.stageIndex}` : `L${nextStage.level}-${nextStage.stageIndex}`}</p>
          <p className="chapter-meta">{sizeLabels[selectedConfig.size]} · {difficultyLabels[selectedConfig.difficulty]} · {selectedChapter.completedCount}/5 小关 · {selectedChapter.stars}/15★</p>

          <div className="stage-card-grid">
            {selectedChapter.stages.map((stage) => {
              const status = stageStatus(stage);
              return (
                <button
                  type="button"
                  data-testid="adventure-stage-card"
                  key={`${stage.level}-${stage.stageIndex}`}
                  className={["stage-node-card", "adventure-stage-card", status.key].join(" ")}
                  onClick={() => startStage(stage)}
                >
                  <span>L{stage.level}-{stage.stageIndex}</span>
                  <strong>{stage.unlocked ? stageStars(stage.bestStars) : "锁"}</strong>
                  <em>{status.label}</em>
                </button>
              );
            })}
          </div>

          <button className="adventure-primary-action" type="button" onClick={() => startStage(nextStage)}>
            开始挑战 L{nextStage.level}-{nextStage.stageIndex}
          </button>

          <button
            className="adventure-map-toggle"
            type="button"
            aria-expanded={mapExpanded}
            onClick={() => setMapExpanded((value) => !value)}
          >
            {mapExpanded ? "收起全部大关地图" : "查看全部大关地图"}
          </button>

          <section className="adventure-reward-panel">
            <h3>探索奖励</h3>
            <div>
              <span><strong>坚持练习星</strong>每日坚持练习</span>
              <span><strong>细心观察星</strong>细心观察不遗漏</span>
              <span><strong>解锁提示</strong>完成前一小关会解锁下一小关</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
