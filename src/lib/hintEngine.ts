export type HintMethod = "rule" | "observation" | "elimination" | "singleCandidate" | "rowUnique" | "boxUnique";

export interface GuidedHint {
  targetRow: number;
  targetCol: number;
  hintLevel: 1 | 2 | 3;
  method: HintMethod;
  title: string;
  message: string;
  candidates?: number[];
  eliminatedNumbers?: number[];
}

interface GuidedHintInput {
  board: number[][];
  puzzle: number[][];
  solution: number[][];
  size: number;
  boxRows: number;
  boxCols: number;
  selectedCell: [number, number] | null;
  hintLevel: 1 | 2 | 3;
  excludedCells?: string[];
}

const range = (size: number) => Array.from({ length: size }, (_, index) => index + 1);

const collectUsedNumbers = (board: number[][], row: number, col: number, boxRows: number, boxCols: number): Set<number> => {
  const used = new Set<number>();
  for (let index = 0; index < board.length; index += 1) {
    if (board[row][index] > 0) used.add(board[row][index]);
    if (board[index][col] > 0) used.add(board[index][col]);
  }
  const startRow = Math.floor(row / boxRows) * boxRows;
  const startCol = Math.floor(col / boxCols) * boxCols;
  for (let r = startRow; r < startRow + boxRows; r += 1) {
    for (let c = startCol; c < startCol + boxCols; c += 1) {
      if (board[r][c] > 0) used.add(board[r][c]);
    }
  }
  return used;
};

export const calculateCandidates = (
  board: number[][],
  row: number,
  col: number,
  size: number,
  boxRows: number,
  boxCols: number
): number[] => {
  if (board[row][col] !== 0) return [];
  const used = collectUsedNumbers(board, row, col, boxRows, boxCols);
  return range(size).filter((value) => !used.has(value));
};

const isGiven = (puzzle: number[][], row: number, col: number): boolean => puzzle[row][col] !== 0;

const chooseTarget = ({ board, puzzle, solution, size, boxRows, boxCols, selectedCell, excludedCells }: GuidedHintInput): [number, number] => {
  const excluded = new Set(excludedCells ?? []);
  if (selectedCell) {
    const [row, col] = selectedCell;
    if (!excluded.has(`${row}-${col}`) && !isGiven(puzzle, row, col) && board[row][col] === 0) return selectedCell;
  }

  const candidates = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isGiven(puzzle, row, col)) continue;
      if (excluded.has(`${row}-${col}`)) continue;
      if (board[row][col] === solution[row][col]) continue;
      if (board[row][col] !== 0) continue;
      candidates.push({ row, col, count: calculateCandidates(board, row, col, size, boxRows, boxCols).length });
    }
  }
  candidates.sort((a, b) => a.count - b.count || a.row - b.row || a.col - b.col);
  return candidates[0] ? [candidates[0].row, candidates[0].col] : [0, 0];
};

export const getGuidedHint = (input: GuidedHintInput): GuidedHint => {
  const [row, col] = chooseTarget(input);
  const candidates = calculateCandidates(input.board, row, col, input.size, input.boxRows, input.boxCols);
  const eliminatedNumbers = range(input.size).filter((value) => !candidates.includes(value));
  const rowNumber = row + 1;
  const colNumber = col + 1;

  if (input.hintLevel === 1) {
    return {
      targetRow: row,
      targetCol: col,
      hintLevel: 1,
      method: "observation",
      title: "第 1 级提示：先观察",
      message: `先看看第 ${rowNumber} 行、第 ${colNumber} 列和它所在的小宫格，哪些数字已经出现了？`
    };
  }

  if (input.hintLevel === 2) {
    return {
      targetRow: row,
      targetCol: col,
      hintLevel: 2,
      method: "elimination",
      title: "第 2 级提示：排除不可能",
      message: `这个格子不能填这些已经出现过的数字。把它们划掉，再看看还剩哪些可能。`,
      candidates: candidates.length > 1 ? candidates : undefined,
      eliminatedNumbers
    };
  }

  return {
    targetRow: row,
    targetCol: col,
    hintLevel: 3,
    method: candidates.length <= 1 ? "singleCandidate" : "elimination",
    title: "第 3 级提示：接近答案",
    message: candidates.length <= 1
      ? `这个格子现在只剩一个可能的数字了。请你想一想，1-${input.size} 里面去掉已经出现的数字，还剩哪个？`
      : `再比较这一行、这一列和小宫格，看看哪个候选数字最站得住脚。想放弃时可以点“显示答案并结束本题”。`,
    candidates: candidates.length > 1 ? candidates : undefined
  };
};
