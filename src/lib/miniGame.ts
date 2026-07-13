export const MINI_GAME_SIZE = 6;

export const MINI_GAME_TILES = ["star", "leaf", "chest", "flag", "grass"] as const;

export type MiniGameTile = (typeof MINI_GAME_TILES)[number];
export type MiniGameBoard = MiniGameTile[][];

export interface MiniGamePosition {
  row: number;
  col: number;
}

export interface MiniGameMoveResult {
  board: MiniGameBoard;
  valid: boolean;
  removed: number;
  score: number;
  stars: number;
}

const keyOf = ({ row, col }: MiniGamePosition): string => `${row}-${col}`;

const copyBoard = (board: MiniGameBoard): MiniGameBoard => board.map((row) => [...row]);

const pickTile = (random: () => number): MiniGameTile => {
  const index = Math.min(MINI_GAME_TILES.length - 1, Math.floor(random() * MINI_GAME_TILES.length));
  return MINI_GAME_TILES[Math.max(0, index)];
};

const createsImmediateMatch = (board: MiniGameBoard, row: number, col: number, tile: MiniGameTile): boolean => {
  const horizontal = col >= 2 && board[row][col - 1] === tile && board[row][col - 2] === tile;
  const vertical = row >= 2 && board[row - 1][col] === tile && board[row - 2][col] === tile;
  return horizontal || vertical;
};

const fallbackBoard = (): MiniGameBoard => [
  ["star", "leaf", "star", "chest", "flag", "grass"],
  ["leaf", "star", "grass", "flag", "chest", "leaf"],
  ["flag", "star", "chest", "grass", "leaf", "flag"],
  ["grass", "chest", "leaf", "star", "flag", "grass"],
  ["chest", "flag", "grass", "leaf", "star", "chest"],
  ["leaf", "grass", "flag", "chest", "leaf", "star"]
];

export const areMiniGamePositionsAdjacent = (first: MiniGamePosition, second: MiniGamePosition): boolean =>
  Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;

export const swapMiniGameTiles = (
  board: MiniGameBoard,
  first: MiniGamePosition,
  second: MiniGamePosition
): MiniGameBoard => {
  const next = copyBoard(board);
  [next[first.row][first.col], next[second.row][second.col]] = [next[second.row][second.col], next[first.row][first.col]];
  return next;
};

export const findMiniGameMatches = (board: MiniGameBoard): Set<string> => {
  const matches = new Set<string>();

  for (let row = 0; row < MINI_GAME_SIZE; row += 1) {
    let start = 0;
    for (let col = 1; col <= MINI_GAME_SIZE; col += 1) {
      if (col < MINI_GAME_SIZE && board[row][col] === board[row][start]) continue;
      if (col - start >= 3) {
        for (let index = start; index < col; index += 1) matches.add(keyOf({ row, col: index }));
      }
      start = col;
    }
  }

  for (let col = 0; col < MINI_GAME_SIZE; col += 1) {
    let start = 0;
    for (let row = 1; row <= MINI_GAME_SIZE; row += 1) {
      if (row < MINI_GAME_SIZE && board[row][col] === board[start][col]) continue;
      if (row - start >= 3) {
        for (let index = start; index < row; index += 1) matches.add(keyOf({ row: index, col }));
      }
      start = row;
    }
  }

  return matches;
};

const collapseMiniGameBoard = (board: MiniGameBoard, matches: Set<string>, random: () => number): MiniGameBoard => {
  const next = Array.from({ length: MINI_GAME_SIZE }, () => Array<MiniGameTile>(MINI_GAME_SIZE));

  for (let col = 0; col < MINI_GAME_SIZE; col += 1) {
    const remaining: MiniGameTile[] = [];
    for (let row = MINI_GAME_SIZE - 1; row >= 0; row -= 1) {
      if (!matches.has(keyOf({ row, col }))) remaining.push(board[row][col]);
    }

    let remainingIndex = 0;
    for (let row = MINI_GAME_SIZE - 1; row >= 0; row -= 1) {
      next[row][col] = remainingIndex < remaining.length ? remaining[remainingIndex++] : pickTile(random);
    }
  }

  return next;
};

export const miniGameBoardHasPossibleMove = (board: MiniGameBoard): boolean => {
  for (let row = 0; row < MINI_GAME_SIZE; row += 1) {
    for (let col = 0; col < MINI_GAME_SIZE; col += 1) {
      const current = { row, col };
      const candidates = [{ row, col: col + 1 }, { row: row + 1, col }];
      for (const candidate of candidates) {
        if (candidate.row >= MINI_GAME_SIZE || candidate.col >= MINI_GAME_SIZE) continue;
        if (findMiniGameMatches(swapMiniGameTiles(board, current, candidate)).size > 0) return true;
      }
    }
  }
  return false;
};

export const createMiniGameBoard = (random: () => number = Math.random): MiniGameBoard => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const board: MiniGameBoard = [];
    for (let row = 0; row < MINI_GAME_SIZE; row += 1) {
      board[row] = [];
      for (let col = 0; col < MINI_GAME_SIZE; col += 1) {
        const preferred = Math.floor(random() * MINI_GAME_TILES.length);
        let selected = MINI_GAME_TILES[preferred];
        for (let offset = 0; offset < MINI_GAME_TILES.length; offset += 1) {
          const candidate = MINI_GAME_TILES[(preferred + offset) % MINI_GAME_TILES.length];
          if (!createsImmediateMatch(board, row, col, candidate)) {
            selected = candidate;
            break;
          }
        }
        board[row][col] = selected;
      }
    }
    if (miniGameBoardHasPossibleMove(board)) return board;
  }

  return fallbackBoard();
};

export const resolveMiniGameSwap = (
  board: MiniGameBoard,
  first: MiniGamePosition,
  second: MiniGamePosition,
  random: () => number = Math.random
): MiniGameMoveResult => {
  if (!areMiniGamePositionsAdjacent(first, second)) {
    return { board: copyBoard(board), valid: false, removed: 0, score: 0, stars: 0 };
  }

  let next = swapMiniGameTiles(board, first, second);
  let matches = findMiniGameMatches(next);
  if (matches.size === 0) {
    return { board: copyBoard(board), valid: false, removed: 0, score: 0, stars: 0 };
  }

  let removed = 0;
  let stars = 0;
  let cascades = 0;
  while (matches.size > 0 && cascades < 20) {
    removed += matches.size;
    matches.forEach((key) => {
      const [row, col] = key.split("-").map(Number);
      if (next[row][col] === "star") stars += 1;
    });
    next = collapseMiniGameBoard(next, matches, random);
    matches = findMiniGameMatches(next);
    cascades += 1;
  }

  if (!miniGameBoardHasPossibleMove(next)) next = createMiniGameBoard(random);
  return { board: next, valid: true, removed, score: removed * 10, stars };
};
