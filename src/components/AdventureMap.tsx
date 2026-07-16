import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, gradeLabels, sizeLabels } from "../constants/gradeLabels";
import { getAdventureDisplayContext, getAdventureMap, getAdventureStats } from "../lib/adventure";
import { adventureMapAsset, getAdventurePresentation, stageDisplayName, type AdventureChapterPresentation } from "./adventurePresentation";
import type { AdventureStage, ChildProfile } from "../types";

interface AdventureMapProps {
  child: ChildProfile;
  parentName?: string;
  detailLevel?: number;
  onHome?: () => void;
  onOpenAdventure?: () => void;
  onOpenPractice?: () => void;
  onOpenGrowth?: () => void;
  onSwitchChild?: () => void;
  onOpenChapter?: (level: number) => void;
  onBackToMap?: () => void;
  onStartStage: (stage: AdventureStage) => void;
}

type ChapterStatus = "completed" | "recommended" | "available" | "locked";

const scrollStorageKey = (childId: string) => `kids-sudoku-adventure-map-scroll:${childId}`;

const stageStars = (stars: number): string => `${"★".repeat(stars)}${"☆".repeat(Math.max(0, 3 - stars))}`;

const chapterStatus = (stages: AdventureStage[]): { key: ChapterStatus; label: string } => {
  if (stages.every((stage) => stage.completed)) return { key: "completed", label: "已完成" };
  if (stages.some((stage) => stage.recommended)) return { key: "recommended", label: "当前挑战" };
  if (stages.some((stage) => stage.unlocked)) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

const stageStatus = (stage: AdventureStage) => {
  if (stage.completed) return { key: "completed", label: "已完成" };
  if (stage.recommended) return { key: "recommended", label: "进行中" };
  if (stage.unlocked) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

const useTouchAdventureLayout = () => {
  const getMatch = () => typeof window === "undefined" || !window.matchMedia
    ? true
    : window.matchMedia("(max-width: 1035px)").matches;
  const [isTouchLayout, setIsTouchLayout] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(max-width: 1035px)");
    const update = () => setIsTouchLayout(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return isTouchLayout;
};

export function AdventureMap({
  child,
  parentName = "测试家长",
  detailLevel,
  onHome,
  onOpenChapter,
  onBackToMap,
  onStartStage
}: AdventureMapProps) {
  const stages = useMemo(() => getAdventureMap(child), [child]);
  const stats = useMemo(() => getAdventureStats(child), [child]);
  const displayContext = useMemo(() => getAdventureDisplayContext(child), [child]);
  const [notice, setNotice] = useState("");
  const isTouchLayout = useTouchAdventureLayout();
  const preferredStage = stats.recommendedStage ?? stages.find((stage) => stage.unlocked) ?? stages[0];
  const mapRef = useRef<HTMLElement | null>(null);

  const chapters = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const level = index + 1;
    const chapterStages = stages.filter((stage) => stage.level === level);
    const presentation = getAdventurePresentation(level);
    return {
      ...presentation,
      stages: chapterStages,
      status: chapterStatus(chapterStages),
      completedCount: chapterStages.filter((stage) => stage.completed).length,
      stars: chapterStages.reduce((sum, stage) => sum + stage.bestStars, 0)
    };
  }), [stages]);

  const selectedChapter = chapters.find((chapter) => chapter.level === detailLevel) ?? chapters.find((chapter) => chapter.level === preferredStage?.level) ?? chapters[0];
  const selectedRecommended = selectedChapter.stages.find((stage) => stage.recommended);
  const nextStage = selectedRecommended
    ?? selectedChapter.stages.find((stage) => stage.unlocked && !stage.completed)
    ?? selectedChapter.stages.find((stage) => stage.unlocked)
    ?? selectedChapter.stages[0];
  const selectedConfig = getDifficultyLevel(selectedChapter.level);
  const completedChapters = chapters.filter((chapter) => chapter.status.key === "completed").length;

  useEffect(() => {
    setNotice("");
  }, [child.id, detailLevel]);

  useEffect(() => {
    if (detailLevel || !isTouchLayout || typeof window === "undefined") return;
    if (/jsdom/i.test(window.navigator.userAgent)) return;
    const savedPosition = Number(window.sessionStorage.getItem(scrollStorageKey(child.id)) ?? "");
    const currentNode = mapRef.current?.querySelector<HTMLButtonElement>("[data-current-chapter='true']");
    const targetTop = Number.isFinite(savedPosition) && savedPosition > 0
      ? savedPosition
      : Math.max(0, (currentNode?.getBoundingClientRect().top ?? 0) + window.scrollY - 180);
    window.requestAnimationFrame(() => window.scrollTo({ top: targetTop, behavior: "auto" }));
  }, [child.id, detailLevel, isTouchLayout, preferredStage?.level]);

  const rememberMapPosition = () => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(scrollStorageKey(child.id), String(window.scrollY));
  };

  const selectChapter = (chapter: typeof chapters[number]) => {
    if (chapter.status.key === "locked") {
      setNotice("先完成前面的关卡，就能来到这里啦！");
      return;
    }
    rememberMapPosition();
    onOpenChapter?.(chapter.level);
  };

  const startStage = (stage: AdventureStage) => {
    if (!stage.unlocked) {
      setNotice("先完成前一小关，就能解锁这一关啦！");
      return;
    }
    onStartStage(stage);
  };

  return (
    <main className={`adventure-map-page map-shell ${detailLevel ? "adventure-detail-open" : "adventure-map-open"}`}>
      {isTouchLayout ? <section className="adventure-touch-view" aria-label="触控端冒险地图">
        {detailLevel ? (
          <TouchChapterDetail
            chapter={selectedChapter}
            nextStage={nextStage}
            selectedConfig={selectedConfig}
            notice={notice}
            onBack={() => onBackToMap?.()}
            onStartStage={startStage}
          />
        ) : (
          <TouchAdventureMap
            mapRef={mapRef}
            chapters={chapters}
            displayContext={displayContext}
            totalStars={stats.totalStars}
            completedChapters={completedChapters}
            notice={notice}
            onSelectChapter={selectChapter}
          />
        )}
      </section> : <section className="adventure-desktop-view" aria-label="桌面端冒险地图">
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

        {!detailLevel ? (
          <section className="explorer-card adventure-map-panel vertical-adventure-panel" aria-label="冒险地图">
            <div className="section-title">
              <div>
                <p className="eyebrow">{parentName} · {gradeLabels[child.gradeLevel]}</p>
                <h2>等级路线</h2>
                <p>沿着竖向路线前进。点击等级站点后，再进入该站的 5 个挑战。</p>
              </div>
              <button type="button" onClick={onHome}>返回首页</button>
            </div>
            {notice && <p className="map-notice" role="status">{notice}</p>}
            <div className="vertical-adventure-map" aria-label="11 大关竖向地图">
              <div className="vertical-route-line" aria-hidden="true" />
              <div className="adventure-station-list">
                {chapters.map((chapter) => (
                  <div className={`adventure-station-stop station-${chapter.level % 2 === 0 ? "right" : "left"}`} key={chapter.level}>
                    <span className={`station-route-node ${chapter.status.key}`} aria-hidden="true">
                      {chapter.status.key === "completed" ? "✓" : chapter.status.key === "locked" ? "锁" : chapter.level}
                    </span>
                    <button
                      type="button"
                      data-testid="adventure-chapter-card"
                      className={["chapter-island-card", "adventure-chapter-card", "adventure-station-card", chapter.status.key].join(" ")}
                      onClick={() => selectChapter(chapter)}
                    >
                      {chapter.status.key === "recommended" && <span className="you-are-here">你在这里</span>}
                      <span className="chapter-level">L{chapter.level}</span>
                      <strong>{chapter.name}</strong>
                      <span className="chapter-subtitle">{chapter.subtitle}</span>
                      <span className="chapter-progress-line">{chapter.completedCount}/5 小关 · {chapter.stars}/15★</span>
                      <em>{chapter.status.label}</em>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <DesktopChapterDetail chapter={selectedChapter} nextStage={nextStage} selectedConfig={selectedConfig} notice={notice} onBack={onBackToMap} onStartStage={startStage} />
        )}
      </section>
      }
    </main>
  );
}

type Chapter = AdventureChapterPresentation & {
  stages: AdventureStage[];
  status: { key: ChapterStatus; label: string };
  completedCount: number;
  stars: number;
};

interface TouchMapProps {
  mapRef: RefObject<HTMLElement>;
  chapters: Chapter[];
  displayContext: ReturnType<typeof getAdventureDisplayContext>;
  totalStars: number;
  completedChapters: number;
  notice: string;
  onSelectChapter: (chapter: Chapter) => void;
}

function TouchAdventureMap({ mapRef, chapters, displayContext, totalStars, completedChapters, notice, onSelectChapter }: TouchMapProps) {
  return (
    <>
      <section className="touch-map-intro explorer-card">
        <div>
          <p className="eyebrow">冒险地图</p>
          <h2>11 大关探索之旅</h2>
          <p>沿着路线前进，一关一关点亮星星，成为数独王者！</p>
          {displayContext.gapMessage && <p className="touch-map-context">{displayContext.gapMessage}</p>}
        </div>
        <div className="touch-chest-counter" aria-label={`探索宝箱 ${completedChapters}/11`}><span aria-hidden="true">🧰</span><strong>探索宝箱</strong><small>{completedChapters}/11</small></div>
      </section>
      <section ref={mapRef} className="touch-adventure-map" aria-label="11 大关纵向冒险地图" style={{ backgroundImage: `url(${adventureMapAsset})` }}>
        <div className="touch-map-skywash" aria-hidden="true" />
        <div className="touch-map-summary">
          <span><strong>{totalStars}</strong>累计星星</span>
          <span><strong>{displayContext.abilityLabel}</strong>能力等级</span>
          <span><strong>{displayContext.progressLabel}</strong>闯关进度</span>
        </div>
        {notice && <p className="touch-map-notice" role="status">{notice}</p>}
        {chapters.map((chapter) => (
          <button
            type="button"
            key={chapter.level}
            data-testid="adventure-chapter-card"
            data-current-chapter={chapter.status.key === "recommended" ? "true" : undefined}
            className={`touch-map-station ${chapter.status.key}`}
            style={{ top: `${chapter.mapPosition.top}%`, left: `${chapter.mapPosition.left}%` }}
            onClick={() => onSelectChapter(chapter)}
            aria-label={`L${chapter.level} ${chapter.name}，${chapter.status.label}`}
          >
            <span className="touch-station-number" aria-hidden="true">{chapter.status.key === "completed" ? "✓" : chapter.status.key === "locked" ? "🔒" : chapter.level}</span>
            <span className="touch-station-card">
              <strong>L{chapter.level} {chapter.name}</strong>
              <small>{chapter.subtitle}</small>
              <em>{stageStars(chapter.stars)}</em>
              {chapter.status.key === "recommended" && <b>当前挑战</b>}
            </span>
          </button>
        ))}
      </section>
    </>
  );
}

interface DetailProps {
  chapter: Chapter;
  nextStage: AdventureStage;
  selectedConfig: ReturnType<typeof getDifficultyLevel>;
  notice: string;
  onBack?: () => void;
  onStartStage: (stage: AdventureStage) => void;
}

function TouchChapterDetail({ chapter, nextStage, selectedConfig, notice, onBack, onStartStage }: DetailProps) {
  return (
    <section className="touch-chapter-detail" aria-label="等级挑战二级页面">
      <header className="touch-detail-topbar">
        <button type="button" onClick={onBack}>‹ 返回地图</button>
        <h2>L{chapter.level} {chapter.name}</h2>
        <span aria-hidden="true" />
      </header>
      <section className="touch-chapter-hero">
        <img src={chapter.heroAsset} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        <div className="touch-chapter-copy">
          <div><h3>{chapter.name}</h3><span>{chapter.status.key === "locked" ? "未解锁" : "已解锁 🔓"}</span></div>
          <p>{chapter.description}</p>
        </div>
      </section>
      <section className="touch-stage-list" aria-label={`${chapter.name}的小关挑战`}>
        <h3>关卡挑战 <span>({chapter.completedCount}/5)</span></h3>
        {chapter.stages.map((stage) => <StageRow key={`${stage.level}-${stage.stageIndex}`} stage={stage} chapter={chapter} onStartStage={onStartStage} />)}
      </section>
      {notice && <p className="touch-map-notice" role="status">{notice}</p>}
      <section className="touch-reward-preview" aria-label="通关奖励预告">
        <h3>通关奖励</h3>
        <div>
          <span><b>★</b>星星 <strong>+15</strong></span>
          <span><b>●</b>金币 <strong>+100</strong></span>
          <span><b>🧰</b>宝箱 <strong>可领取</strong></span>
        </div>
      </section>
      <button className="touch-continue-button" type="button" onClick={() => onStartStage(nextStage)}>继续挑战 L{nextStage.level}-{nextStage.stageIndex} {stageDisplayName(chapter, nextStage.stageIndex)}</button>
      <p className="touch-adventure-tip">💡 小提示：仔细观察行列和宫格，善用排除法！</p>
    </section>
  );
}

function StageRow({ stage, chapter, onStartStage }: { stage: AdventureStage; chapter: Chapter; onStartStage: (stage: AdventureStage) => void }) {
  const status = stageStatus(stage);
  const config = getDifficultyLevel(stage.level);
  return (
    <button type="button" data-testid="adventure-stage-card" className={`touch-stage-row ${status.key}`} onClick={() => onStartStage(stage)}>
      <span className="touch-stage-number">{stage.stageIndex}</span>
      <span className="touch-stage-title"><strong>{stageDisplayName(chapter, stage.stageIndex)}</strong><small>{sizeLabels[config.size]} <i>{difficultyLabels[config.difficulty]}</i></small></span>
      <span className="touch-stage-stars">{stage.unlocked ? stageStars(stage.bestStars) : "☆☆☆"}</span>
      <em>{status.label}</em>
    </button>
  );
}

function DesktopChapterDetail({ chapter, nextStage, selectedConfig, notice, onBack, onStartStage }: DetailProps) {
  return (
    <section className="adventure-level-detail-screen" aria-label="等级挑战二级页面">
      <aside className="adventure-task-board adventure-detail-panel explorer-card" aria-label="当前大关详情">
        <div className="adventure-detail-heading">
          <button className="adventure-back-map" type="button" onClick={onBack}>返回等级地图</button>
          <div><p className="eyebrow">L{chapter.level} 站点任务</p><h2>当前大关：L{chapter.level} {chapter.name}</h2></div>
        </div>
        <p>{chapter.description}</p>
        <p className="recommend-pill">推荐挑战：L{nextStage.level}-{nextStage.stageIndex}</p>
        <p className="chapter-meta">{sizeLabels[selectedConfig.size]} · {difficultyLabels[selectedConfig.difficulty]} · {chapter.completedCount}/5 小关 · {chapter.stars}/15★</p>
        {notice && <p className="map-notice" role="status">{notice}</p>}
        <div className="stage-card-grid">
          {chapter.stages.map((stage) => {
            const status = stageStatus(stage);
            return <button type="button" data-testid="adventure-stage-card" key={`${stage.level}-${stage.stageIndex}`} className={["stage-node-card", "adventure-stage-card", status.key].join(" ")} onClick={() => onStartStage(stage)}><span>L{stage.level}-{stage.stageIndex}</span><strong>{stage.unlocked ? stageStars(stage.bestStars) : "锁"}</strong><em>{status.label}</em></button>;
          })}
        </div>
        <button className="adventure-primary-action" type="button" onClick={() => onStartStage(nextStage)}>开始挑战 L{nextStage.level}-{nextStage.stageIndex}</button>
        <section className="adventure-reward-panel"><h3>探索奖励</h3><div><span><strong>坚持练习星</strong>每日坚持练习</span><span><strong>细心观察星</strong>细心观察不遗漏</span><span><strong>解锁提示</strong>完成前一小关会解锁下一小关</span></div></section>
      </aside>
    </section>
  );
}
