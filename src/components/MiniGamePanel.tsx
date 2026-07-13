import { useCallback, useEffect, useRef, useState } from "react";
import {
  areMiniGamePositionsAdjacent,
  createMiniGameBoard,
  findMiniGameMatches,
  resolveMiniGameSwap,
  swapMiniGameTiles,
  type MiniGameBoard,
  type MiniGamePosition,
  type MiniGameTile
} from "../lib/miniGame";

const tileIcons: Record<MiniGameTile, string> = {
  star: "⭐",
  leaf: "🍃",
  chest: "🎁",
  flag: "🚩",
  grass: "🌱"
};

const tileLabels: Record<MiniGameTile, string> = {
  star: "星星",
  leaf: "叶子",
  chest: "宝箱",
  flag: "旗帜",
  grass: "嫩芽"
};

interface MiniGameResult {
  score: number;
  stars: number;
  badgeShards: number;
}

interface MiniGameModalProps {
  onClose: () => void;
  onResult: (result: MiniGameResult) => void;
  durationSeconds?: number;
  initialBoard?: MiniGameBoard;
  random?: () => number;
}

const formatGameTime = (seconds: number): string => `00:${String(Math.max(0, seconds)).padStart(2, "0")}`;
const positionKey = ({ row, col }: MiniGamePosition): string => `${row}-${col}`;

export function MiniGameModal({
  onClose,
  onResult,
  durationSeconds = 30,
  initialBoard,
  random = Math.random
}: MiniGameModalProps) {
  const makeBoard = useCallback(() => initialBoard?.map((row) => [...row]) ?? createMiniGameBoard(random), [initialBoard, random]);
  const [board, setBoard] = useState<MiniGameBoard>(makeBoard);
  const [selected, setSelected] = useState<MiniGamePosition | null>(null);
  const [matchedCells, setMatchedCells] = useState<Set<string>>(new Set());
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [status, setStatus] = useState<"playing" | "result">("playing");
  const [resolving, setResolving] = useState(false);
  const scoreRef = useRef(0);
  const starsRef = useRef(0);
  const finishedRef = useRef(false);
  const resolveTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const badgeShards = starsRef.current >= 5 ? 1 : 0;
    setStatus("result");
    setSelected(null);
    setMatchedCells(new Set());
    onResult({ score: scoreRef.current, stars: starsRef.current, badgeShards });
  }, [onResult]);

  useEffect(() => {
    if (status !== "playing") return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          finishGame();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishGame, status]);

  useEffect(() => () => {
    if (resolveTimerRef.current !== null) window.clearTimeout(resolveTimerRef.current);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  const restart = () => {
    if (resolveTimerRef.current !== null) window.clearTimeout(resolveTimerRef.current);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    finishedRef.current = false;
    scoreRef.current = 0;
    starsRef.current = 0;
    setBoard(makeBoard());
    setSelected(null);
    setMatchedCells(new Set());
    setInvalidCells(new Set());
    setScore(0);
    setStars(0);
    setTimeLeft(durationSeconds);
    setResolving(false);
    setStatus("playing");
  };

  const chooseTile = (position: MiniGamePosition) => {
    if (status !== "playing" || resolving) return;
    if (!selected) {
      setSelected(position);
      return;
    }
    if (selected.row === position.row && selected.col === position.col) {
      setSelected(null);
      return;
    }
    if (!areMiniGamePositionsAdjacent(selected, position)) {
      setSelected(position);
      return;
    }

    const swapped = swapMiniGameTiles(board, selected, position);
    const immediateMatches = findMiniGameMatches(swapped);
    if (immediateMatches.size === 0) {
      const invalid = new Set([positionKey(selected), positionKey(position)]);
      setInvalidCells(invalid);
      setSelected(null);
      feedbackTimerRef.current = window.setTimeout(() => setInvalidCells(new Set()), 260);
      return;
    }

    const original = board;
    const first = selected;
    setBoard(swapped);
    setSelected(null);
    setMatchedCells(immediateMatches);
    setResolving(true);
    resolveTimerRef.current = window.setTimeout(() => {
      const result = resolveMiniGameSwap(original, first, position, random);
      scoreRef.current += result.score;
      starsRef.current += result.stars;
      setBoard(result.board);
      setScore(scoreRef.current);
      setStars(starsRef.current);
      setMatchedCells(new Set());
      setResolving(false);
    }, 180);
  };

  return (
    <div className="mini-game-modal-backdrop">
      <section className="mini-game-modal" role="dialog" aria-modal="true" aria-labelledby="mini-game-title">
        <header className="mini-game-modal-header">
          <div>
            <p className="eyebrow">30 秒轻松挑战</p>
            <h2 id="mini-game-title">星星连连消</h2>
          </div>
          <button type="button" className="mini-game-close" aria-label="关闭小游戏" onClick={onClose}>×</button>
        </header>

        {status === "playing" ? (
          <>
            <div className="mini-game-status" aria-label="小游戏状态">
              <span><small>剩余时间</small><strong>{formatGameTime(timeLeft)}</strong></span>
              <span><small>收集星星</small><strong>{Math.min(stars, 5)}/5</strong></span>
              <span><small>分数</small><strong>{score}</strong></span>
            </div>
            <div className="mini-game-board" role="grid" aria-label="星星连连消 6×6 棋盘">
              {board.flatMap((row, rowIndex) => row.map((tile, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const isSelected = selected?.row === rowIndex && selected.col === colIndex;
                return (
                  <button
                    type="button"
                    role="gridcell"
                    className={`mini-game-tile tile-${tile}${isSelected ? " selected" : ""}${matchedCells.has(key) ? " matched" : ""}${invalidCells.has(key) ? " invalid" : ""}`}
                    aria-label={`第 ${rowIndex + 1} 行第 ${colIndex + 1} 列，${tileLabels[tile]}`}
                    aria-pressed={isSelected}
                    onClick={() => chooseTile({ row: rowIndex, col: colIndex })}
                    key={key}
                  >
                    <span aria-hidden="true">{tileIcons[tile]}</span>
                  </button>
                );
              }))}
            </div>
            <footer className="mini-game-modal-footer">
              <p>交换相邻图标，连成 3 个就能消除。</p>
              <button type="button" onClick={finishGame}>结束游戏</button>
            </footer>
          </>
        ) : (
          <div className="mini-game-result">
            <span className="mini-game-result-star" aria-hidden="true">★</span>
            <h3>完成小游戏！</h3>
            <div className="mini-game-result-stats">
              <span><small>本局分数</small><strong>{score}</strong></span>
              <span><small>收集星星</small><strong>{Math.min(stars, 5)}/5</strong></span>
              <span><small>获得奖励</small><strong>{stars >= 5 ? 1 : 0} 个徽章碎片</strong></span>
            </div>
            <p>{stars >= 5 ? "太棒了！你收集了 5 颗星星，获得 1 个徽章碎片！" : "差一点就能打开宝箱啦，再试一次吧！"}</p>
            <div className="mini-game-result-actions">
              <button type="button" onClick={onClose}>回到首页</button>
              <button type="button" className="primary" onClick={restart}>再玩一次</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function MiniGamePanel() {
  const [gameOpen, setGameOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [todayStars, setTodayStars] = useState(0);
  const [badgeShards, setBadgeShards] = useState(0);

  const recordResult = ({ stars, badgeShards: earnedShards }: MiniGameResult) => {
    setTodayStars(Math.min(5, stars));
    if (earnedShards > 0) setBadgeShards((value) => value + earnedShards);
  };

  return (
    <>
      <section className="mini-game-panel" aria-labelledby="mini-game-panel-title">
        <div className="mini-game-panel-copy">
          <p className="eyebrow">轻松一下</p>
          <h2 id="mini-game-panel-title">今日小游戏</h2>
          <h3>星星连连消</h3>
          <p>闯关累了？来玩 30 秒的方块消除小游戏，收集星星吧！</p>
        </div>
        <div className="mini-game-panel-scene" aria-hidden="true">
          <span className="mini-game-scene-star">★</span>
          <span className="mini-game-scene-path" />
          <span className="mini-game-scene-tree tree-a" />
          <span className="mini-game-scene-tree tree-b" />
          <span className="mini-game-scene-chest" />
        </div>
        <div className="mini-game-panel-actions">
          <div className="mini-game-chips" aria-label="小游戏奖励状态">
            <span>已收集：<strong>{todayStars}/5 星星</strong></span>
            <span>剩余时间：<strong>00:30</strong></span>
            <span>奖励：<strong>+1 徽章碎片</strong></span>
            {badgeShards > 0 && <span>今日获得：<strong>{badgeShards} 碎片</strong></span>}
          </div>
          <div className="mini-game-buttons">
            <button type="button" className="primary" onClick={() => setGameOpen(true)}>开始小游戏</button>
            <button type="button" onClick={() => setRulesOpen(true)}>查看规则</button>
          </div>
        </div>
      </section>

      {gameOpen && <MiniGameModal onClose={() => setGameOpen(false)} onResult={recordResult} />}

      {rulesOpen && (
        <div className="mini-game-modal-backdrop">
          <section className="mini-game-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="mini-game-rules-title">
            <p className="eyebrow">玩法说明</p>
            <h2 id="mini-game-rules-title">星星连连消规则</h2>
            <ol>
              <li>先选择一个图标，再选择它旁边的图标进行交换。</li>
              <li>横向或纵向连成 3 个相同图标即可消除。</li>
              <li>每消除一个图标得 10 分，收集 5 颗星星可得 1 个徽章碎片。</li>
              <li>小游戏奖励不会计入数独闯关星星。</li>
            </ol>
            <div className="mini-game-result-actions">
              <button type="button" onClick={() => setRulesOpen(false)}>关闭规则</button>
              <button type="button" className="primary" onClick={() => { setRulesOpen(false); setGameOpen(true); }}>开始小游戏</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
