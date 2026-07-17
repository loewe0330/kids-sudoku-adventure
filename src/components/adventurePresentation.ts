export interface AdventureChapterPresentation {
  level: number;
  name: string;
  subtitle: string;
  theme: string;
  focus: string;
  description: string;
  heroAsset: string;
  mapPosition: { top: number; left: number };
}

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/adventure/${name}`;

export interface AdventureResponsiveAssets {
  mobile: string;
  tablet: string;
  desktop: string;
}

const responsiveAsset = (name: string): AdventureResponsiveAssets => ({
  mobile: asset(`optimized/mobile/${name}`),
  tablet: asset(`optimized/tablet/${name}`),
  desktop: asset(`optimized/desktop/${name}`)
});

export const adventureMapAsset = asset("adventure-map.webp");
export const adventureMapAssets = responsiveAsset("adventure-map.webp");

export const getAdventureChapterAssets = (level: number): AdventureResponsiveAssets =>
  responsiveAsset(`chapter-${level}.webp`);

export const adventureChapterPresentation: AdventureChapterPresentation[] = [
  { level: 1, name: "数字小苗村", subtitle: "新手启程", theme: "苗村", focus: "规则", description: "从最明显的空格开始，认识数独的行、列和小宫格。", heroAsset: getAdventureChapterAssets(1).desktop, mapPosition: { top: 88, left: 28 } },
  { level: 2, name: "数学学堂", subtitle: "规则学习", theme: "学堂", focus: "观察", description: "看看每一行和每一列缺少什么数字，找到下一步线索。", heroAsset: getAdventureChapterAssets(2).desktop, mapPosition: { top: 80, left: 64 } },
  { level: 3, name: "数字乐园", subtitle: "认识数独", theme: "乐园", focus: "定位", description: "把数字、行列和宫格连起来观察，发现更多可能。", heroAsset: getAdventureChapterAssets(3).desktop, mapPosition: { top: 72, left: 30 } },
  { level: 4, name: "河边小屋", subtitle: "入门进阶", theme: "河畔", focus: "排除", description: "沿着河边的线索前进，排除不可能的位置。", heroAsset: getAdventureChapterAssets(4).desktop, mapPosition: { top: 64, left: 66 } },
  { level: 5, name: "草原小镇", subtitle: "当前挑战", theme: "小镇", focus: "排除", description: "在美丽的草原小镇中，学习更多数独技巧，挑战更有趣的谜题。", heroAsset: getAdventureChapterAssets(5).desktop, mapPosition: { top: 56, left: 30 } },
  { level: 6, name: "山谷探索", subtitle: "基础巩固", theme: "山谷", focus: "推理", description: "走进安静山谷，把观察和排除的方法组合起来。", heroAsset: getAdventureChapterAssets(6).desktop, mapPosition: { top: 48, left: 65 } },
  { level: 7, name: "森林深处", subtitle: "能力提升", theme: "森林", focus: "推理", description: "穿过森林小径，尝试在更多线索中保持清晰思路。", heroAsset: getAdventureChapterAssets(7).desktop, mapPosition: { top: 40, left: 30 } },
  { level: 8, name: "湖泊秘境", subtitle: "进阶突破", theme: "湖泊", focus: "宫格", description: "在湖边整理线索，让每一步推理更加稳定。", heroAsset: getAdventureChapterAssets(8).desktop, mapPosition: { top: 32, left: 64 } },
  { level: 9, name: "雪山之巅", subtitle: "高阶挑战", theme: "雪山", focus: "链条", description: "登上雪山之巅，用耐心和证据完成更复杂的挑战。", heroAsset: getAdventureChapterAssets(9).desktop, mapPosition: { top: 24, left: 31 } },
  { level: 10, name: "智慧城堡", subtitle: "高手进阶", theme: "城堡", focus: "逻辑", description: "来到智慧城堡，综合运用已经掌握的所有方法。", heroAsset: getAdventureChapterAssets(10).desktop, mapPosition: { top: 16, left: 64 } },
  { level: 11, name: "数独王国", subtitle: "终极挑战", theme: "王国", focus: "综合", description: "最后抵达数独王国，用完整的推理能力完成王者挑战。", heroAsset: getAdventureChapterAssets(11).desktop, mapPosition: { top: 8, left: 31 } }
];

export const getAdventurePresentation = (level: number): AdventureChapterPresentation =>
  adventureChapterPresentation.find((chapter) => chapter.level === level) ?? adventureChapterPresentation[0];

export const stageDisplayName = (chapter: AdventureChapterPresentation, stageIndex: number): string => {
  const labels = [
    `${chapter.theme}初探`,
    "数字观察站",
    "空格侦察站",
    `${chapter.focus}小专家`,
    `${chapter.theme}终点站`
  ];
  return labels[stageIndex - 1] ?? `${chapter.theme}挑战`;
};
