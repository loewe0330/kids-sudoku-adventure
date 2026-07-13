export const levelTitles: Record<number, string> = {
  1: "数字小苗",
  2: "观察小能手",
  3: "宫格探险家",
  4: "排除法新手",
  5: "数独小侦探",
  6: "逻辑小达人",
  7: "九宫格勇士",
  8: "推理训练师",
  9: "数独高手",
  10: "挑战大师",
  11: "终极数独王"
};

export const getLevelTitle = (level: number): string => levelTitles[level] ?? levelTitles[1];
