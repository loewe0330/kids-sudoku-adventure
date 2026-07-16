import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { difficultyLabels, sizeLabels } from "../constants/gradeLabels";
import { getAdventureDisplayContext, getAdventureMap, getAdventureStats } from "../lib/adventure";
import { getFastPassRecommendation } from "../lib/fastPass";
import { getPracticeRecordsByChild } from "../lib/storage";
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
  onOpenFastPass?: () => void;
}

type ChapterStatus = "completed" | "recommended" | "fast-pass-validated" | "available" | "locked";

const scrollStorageKey = (childId: string) => `kids-sudoku-adventure-map-scroll:${childId}`;

const stageStars = (stars: number): string => `${"★".repeat(stars)}${"☆".repeat(Math.max(0, 3 - stars))}`;

const chapterStatus = (stages: AdventureStage[], fastPassValidated: boolean): { key: ChapterStatus; label: string } => {
  if (stages.some((stage) => stage.recommended)) return { key: "recommended", label: "当前挑战" };
  if (stages.every((stage) => stage.completed)) return { key: "completed", label: "已完成" };
  if (fastPassValidated) return { key: "fast-pass-validated", label: "已通过秘籍" };
  if (stages.some((stage) => stage.unlocked)) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

const stageStatus = (stage: AdventureStage) => {
  if (stage.completed) return { key: "completed", label: "已完成" };
  if (stage.recommended) return { key: "recommended", label: "进行中" };
  if (stage.unlocked) return { key: "available", label: "可挑战" };
  return { key: "locked", label: "未解锁" };
};

export function AdventureMap({
  child,
  detailLevel,
  onOpenChapter,
  onBackToMap,
  onStartStage,
  onOpenFastPass
}: AdventureMapProps) {
  const stages = useMemo(() => getAdventureMap(child), [child]);
  const stats = useMemo(() => getAdventureStats(child), [child]);
  const displayContext = useMemo(() => getAdventureDisplayContext(child), [child]);
  const [notice, setNotice] = useState("");
  const [fastPassRulesOpen, setFastPassRulesOpen] = useState(false);
  const preferredStage = stats.recommendedStage ?? stages.find((stage) => stage.unlocked) ?? stages[0];
  const mapRef = useRef<HTMLElement | null>(null);

  const chapters = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const level = index + 1;
    const chapterStages = stages.filter((stage) => stage.level === level);
    const presentation = getAdventurePresentation(level);
    return {
      ...presentation,
      stages: chapterStages,
      status: chapterStatus(chapterStages, child.fastPass?.validatedSkipLevels?.includes(level) ?? false),
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
  const fastPassTarget = useMemo(
    () => getFastPassRecommendation(child, getPracticeRecordsByChild(child.parentId, child.id)).targetLevel,
    [child]
  );

  useEffect(() => {
    setNotice("");
    setFastPassRulesOpen(false);
  }, [child.id, detailLevel]);

  useEffect(() => {
    if (!fastPassRulesOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFastPassRulesOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [fastPassRulesOpen]);

  useEffect(() => {
    if (detailLevel || typeof window === "undefined") return;
    if (/jsdom/i.test(window.navigator.userAgent)) return;
    const savedPosition = Number(window.sessionStorage.getItem(scrollStorageKey(child.id)) ?? "");
    const currentNode = mapRef.current?.querySelector<HTMLButtonElement>("[data-current-chapter='true']");
    const targetTop = Number.isFinite(savedPosition) && savedPosition > 0
      ? savedPosition
      : Math.max(0, (currentNode?.getBoundingClientRect().top ?? 0) + window.scrollY - 180);
    window.requestAnimationFrame(() => window.scrollTo({ top: targetTop, behavior: "auto" }));
  }, [child.id, detailLevel, preferredStage?.level]);

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
      <section className="adventure-touch-view" aria-label="统一冒险地图">
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
            onOpenFastPass={onOpenFastPass ? () => setFastPassRulesOpen(true) : undefined}
          />
        )}
      </section>
      {fastPassRulesOpen && onOpenFastPass && (
        <div className="fast-pass-rules-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFastPassRulesOpen(false);
        }}>
          <section className="fast-pass-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="fast-pass-rules-title">
            <button className="fast-pass-rules-close" type="button" aria-label="关闭闯关秘籍规则" onClick={() => setFastPassRulesOpen(false)}>×</button>
            <p className="eyebrow">闯关秘籍</p>
            <h2 id="fast-pass-rules-title">开启闯关秘籍</h2>
            <p className="fast-pass-rules-lead">完成 <strong>3</strong> 道挑战题，<br />通过后就能快速前往 <b>L{fastPassTarget}-1</b>！</p>
            <div className="fast-pass-rules-summary">
              <span>3 题都要完成</span>
              <span>至少 2 题达标</span>
              <span>最后一题必须通过</span>
            </div>
            <p className="fast-pass-rules-note">没通过也没关系，不会影响现在的闯关进度。</p>
            <div className="fast-pass-rules-actions">
              <button type="button" onClick={() => setFastPassRulesOpen(false)}>稍后再试</button>
              <button className="primary" type="button" onClick={onOpenFastPass}>开始 3 题挑战</button>
            </div>
          </section>
        </div>
      )}
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
  onOpenFastPass?: () => void;
}

function TouchAdventureMap({ mapRef, chapters, displayContext, totalStars, completedChapters, notice, onSelectChapter, onOpenFastPass }: TouchMapProps) {
  return (
    <>
      <section className="touch-map-intro explorer-card">
        <div className="touch-map-heading">
          <h2>11 大关探索之旅</h2>
        </div>
        <div className="touch-map-actions">
          {onOpenFastPass && (
            <button className="fast-pass-map-entry" type="button" aria-label="开启秘籍" onClick={onOpenFastPass}>
              <span className="touch-map-action-icon" aria-hidden="true">秘</span>
              <strong>闯关秘籍</strong>
            </button>
          )}
          <div className="touch-chest-counter" aria-label={`探索宝箱 ${completedChapters}/11`}>
            <span aria-hidden="true">★</span>
            <strong>{completedChapters}/11</strong>
            <small>宝箱</small>
          </div>
        </div>
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
            <span className="touch-station-number" aria-hidden="true">{chapter.status.key === "completed" ? "✓" : chapter.status.key === "fast-pass-validated" ? "秘" : chapter.status.key === "locked" ? "🔒" : chapter.level}</span>
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
          <div><h3>{chapter.name}</h3><span>{chapter.status.key === "locked" ? "未解锁" : chapter.status.key === "fast-pass-validated" ? "已通过秘籍 · 可补星" : "已解锁 🔓"}</span></div>
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
