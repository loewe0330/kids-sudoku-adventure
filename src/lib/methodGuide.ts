import type { GradeLevel } from "../types";

export type MethodId = "rules" | "observation" | "elimination" | "singleCandidate" | "rowUnique" | "boxUnique";

export interface SudokuMethod {
  id: MethodId;
  title: string;
  shortTitle: string;
  content: string[];
}

export const sudokuMethods: SudokuMethod[] = [
  {
    id: "rules",
    title: "数独怎么玩？",
    shortTitle: "规则",
    content: [
      "每一行不能有重复数字。",
      "每一列不能有重复数字。",
      "每一个小宫格不能有重复数字。",
      "4×4 用 1-4，6×6 用 1-6，9×9 用 1-9。"
    ]
  },
  {
    id: "observation",
    title: "先看已经出现的数字",
    shortTitle: "观察法",
    content: [
      "先看一行里缺哪些数字。",
      "再看一列里缺哪些数字。",
      "如果某个格子只可能填一个数字，就可以确定它。"
    ]
  },
  {
    id: "elimination",
    title: "把不可能的数字排除掉",
    shortTitle: "排除法",
    content: [
      "如果同行已经有 3，这个格子就不能填 3。",
      "如果同列已经有 5，这个格子就不能填 5。",
      "如果同宫格已经有 2，这个格子也不能填 2。",
      "剩下唯一可能的数字，就是答案。"
    ]
  },
  {
    id: "singleCandidate",
    title: "只剩一个可能",
    shortTitle: "唯一候选数",
    content: [
      "一个空格可能填的数字叫候选数。",
      "如果一个格子只剩一个候选数，就可以填进去。"
    ]
  },
  {
    id: "rowUnique",
    title: "这一行只有它能填",
    shortTitle: "行列唯一",
    content: [
      "有时候一个数字在某一行里只有一个位置能放。",
      "即使这个格子还有多个候选数，也可以确定这个数字。"
    ]
  },
  {
    id: "boxUnique",
    title: "这个宫格只有它能填",
    shortTitle: "宫格唯一",
    content: [
      "在一个小宫格里，如果某个数字只有一个位置能放，就可以填进去。"
    ]
  }
];

const byId = (ids: MethodId[]) => ids.map((id) => sudokuMethods.find((method) => method.id === id)!).filter(Boolean);

export const getGradeMethods = (gradeLevel: GradeLevel): SudokuMethod[] => {
  if (gradeLevel === "grade1" || gradeLevel === "grade2") return byId(["rules", "observation"]);
  if (gradeLevel === "grade3" || gradeLevel === "grade4") return byId(["rules", "observation", "elimination"]);
  if (gradeLevel === "grade5" || gradeLevel === "grade6") return byId(["elimination", "singleCandidate", "rowUnique", "boxUnique"]);
  return sudokuMethods;
};

export const getLevelMethods = (level: number): SudokuMethod[] => {
  if (level <= 3) return byId(["rules", "observation"]);
  if (level <= 6) return byId(["observation", "elimination"]);
  if (level <= 9) return byId(["elimination", "singleCandidate", "rowUnique"]);
  return byId(["boxUnique", "singleCandidate", "rowUnique"]);
};

export const getPracticeMethod = (level: number): SudokuMethod => getLevelMethods(level)[0];

export const getPrintMethodSuggestion = (gradeLevel: GradeLevel): string => {
  const methods = getGradeMethods(gradeLevel).map((method) => method.shortTitle).join("、");
  if (gradeLevel === "grade1" || gradeLevel === "grade2") {
    return `低年级练习建议：先记住数独规则，再用观察法看看每一行、每一列还缺哪些数字。`;
  }
  if (gradeLevel === "grade3" || gradeLevel === "grade4") {
    return `小学三四年级数独练习建议：先观察每一行缺哪些数字，再看每一列和小宫格，把不可能的数字排除掉。`;
  }
  return `本套练习建议重点使用：${methods}。遇到难题时，先写候选数，再一步一步排除。`;
};
