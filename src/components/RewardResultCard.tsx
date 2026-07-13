import { useState } from "react";
import { formatDuration } from "../lib/time";
import type { Badge, ChildProfile, PracticeMode } from "../types";

interface RewardResultCardProps {
  settings: ChildProfile["settings"];
  completed: boolean;
  mode: PracticeMode;
  duration: number;
  mistakes: number;
  hints: number;
  stars: number;
  currentTitle: string;
  adaptiveMessage: string;
  nextSuggestion: string;
  unlockMessage: string;
  badges: Badge[];
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

const modeLabels: Record<PracticeMode, string> = {
  practice: "练习",
  adventure: "闯关",
  challenge: "挑战"
};

const starText = (stars: number): string => "★".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));

export function RewardResultCard({
  settings,
  completed,
  mode,
  duration,
  mistakes,
  hints,
  stars,
  currentTitle,
  adaptiveMessage,
  nextSuggestion,
  unlockMessage,
  badges,
  onPrimaryAction,
  onSecondaryAction
}: RewardResultCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showAnimation = completed && stars > 0 && settings.successAnimationEnabled && !settings.reducedMotion;
  const title = !completed
    ? "本题结束"
    : mode === "adventure"
      ? "恭喜完成！"
      : mode === "practice"
        ? "完成啦！"
        : "挑战完成！";
  const encouragement = stars >= 3
    ? "又快又准，获得 3 颗星！"
    : stars === 2
      ? "完成得不错，继续保持！"
      : stars === 1
        ? "坚持完成了，这就是进步！"
        : "这题有点难，下次可以先用提示试试。";
  const primaryLabel = mode === "adventure" ? "继续下一关" : mode === "practice" ? "再练一题" : "生成下一题";
  const secondaryLabel = mode === "adventure" ? "回到地图" : mode === "practice" ? "回到自由练习" : "返回";

  return (
    <div className="reward-dialog-backdrop">
      <section className={`result-card reward-result-card stars-${stars}`} role="dialog" aria-modal="true" aria-labelledby="reward-result-title">
        {showAnimation && (
          <div className={`success-animation reward-animation-${stars}`} data-testid="success-animation" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
        <p className="reward-kicker">本题奖励</p>
        <h3 id="reward-result-title">{title}</h3>
        <div className="reward-stars" aria-label={`获得 ${stars} 颗星`}>{starText(stars)}</div>
        <p className="reward-encouragement">{encouragement}</p>
        <div className="reward-quick-stats" aria-label="本题表现">
          <span><small>用时</small><strong>{formatDuration(duration)}</strong></span>
          <span><small>错误</small><strong>{mistakes}</strong></span>
          <span><small>提示</small><strong>{hints}</strong></span>
        </div>
        <div className="reward-primary-actions">
          <button type="button" className="primary" onClick={onPrimaryAction}>{primaryLabel}</button>
          <button type="button" className="secondary" onClick={onSecondaryAction}>{secondaryLabel}</button>
        </div>
        <button type="button" className="reward-details-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}>
          {detailsOpen ? "收起详情" : "查看详情"}
        </button>
        {detailsOpen && (
          <div className="reward-details" data-testid="reward-details">
            <p><strong>本题模式：</strong>{modeLabels[mode]}</p>
            <p><strong>当前称号：</strong>{currentTitle}</p>
            <p><strong>智能难度：</strong>{adaptiveMessage}</p>
            <p><strong>下一步：</strong>{nextSuggestion.replace(/^下一题建议：/, "")}</p>
            {unlockMessage && <p><strong>闯关进度：</strong>{unlockMessage}</p>}
            {badges.length > 0 && <p><strong>获得徽章：</strong>{badges.map((badge) => badge.name).join("、")}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
