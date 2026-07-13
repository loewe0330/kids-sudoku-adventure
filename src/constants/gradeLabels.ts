import type { GradeLevel, SudokuDifficulty, SudokuSize } from "../types";

export const gradeLabels: Record<GradeLevel, string> = {
  grade1: "小学一年级",
  grade2: "小学二年级",
  grade3: "小学三年级",
  grade4: "小学四年级",
  grade5: "小学五年级",
  grade6: "小学六年级",
  middle: "初中"
};

export const difficultyLabels: Record<SudokuDifficulty, string> = {
  starter: "入门",
  easy: "简单",
  normal: "中等",
  hard: "困难",
  challenge: "挑战"
};

export const sizeLabels: Record<SudokuSize, string> = {
  4: "4×4",
  6: "6×6",
  9: "9×9"
};

export const gradeOptions: Array<{ value: GradeLevel; label: string }> = Object.entries(gradeLabels).map(
  ([value, label]) => ({ value: value as GradeLevel, label })
);
