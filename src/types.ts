export type SudokuSize = 4 | 6 | 9;

export type GradeLevel =
  | "grade1"
  | "grade2"
  | "grade3"
  | "grade4"
  | "grade5"
  | "grade6"
  | "middle";

export type SudokuDifficulty = "starter" | "easy" | "normal" | "hard" | "challenge";
export type ParentAccountStatus = "enabled" | "disabled";
export type PracticeMode = "practice" | "adventure" | "challenge";
export type PracticeSource = "smart" | "review" | "challenge" | "custom" | "bank" | "stage";

export interface DifficultyLevelConfig {
  level: number;
  size: SudokuSize;
  boxRows: number;
  boxCols: number;
  difficulty: SudokuDifficulty;
  label: string;
  recommendedTimeSeconds: number;
  maxGoodErrors: number;
  maxGoodHints: number;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentAccount {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  status: ParentAccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  role: "admin" | "parent";
  parentId?: string;
  username: string;
  loggedInAt: string;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  gradeLevel: GradeLevel;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  smartDifficultyEnabled: boolean;
  currentLevel: number;
  abilityAssessmentStatus?: AbilityAssessmentStatus;
  settings: ChildSettings;
  adventureProgress: AdventureStageProgress[];
}

export type AbilityAssessmentStatus = "unassessed" | "provisional" | "established";

export interface ChildSettings {
  soundEnabled: boolean;
  immediateErrorFeedback: boolean;
  showTimer: boolean;
  practiceMode: PracticeMode;
  successAnimationEnabled: boolean;
  reducedMotion: boolean;
}

export interface ChildSettingsRecord extends ChildSettings {
  parentId: string;
  childId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeRecord {
  id: string;
  parentId: string;
  childId: string;
  puzzleId: string;
  gradeLevel: GradeLevel;
  level: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  startedAt: string;
  finishedAt?: string;
  durationSeconds: number;
  mistakeCount: number;
  hintCount: number;
  completed: boolean;
  gaveUp: boolean;
  stars: number;
  mode: PracticeMode;
  source?: PracticeSource;
  stageIndex?: number;
}

export interface SudokuPuzzleItem {
  id: string;
  parentId: string;
  childId: string;
  size: SudokuSize;
  boxRows: number;
  boxCols: number;
  gradeLevel: GradeLevel;
  difficulty: SudokuDifficulty;
  level: number;
  puzzle: number[][];
  solution: number[][];
  clues: number;
  emptyCount: number;
  createdAt: string;
  mode?: PracticeMode;
  source?: PracticeSource;
  stageIndex?: number;
}

export interface AppStorage {
  adminAccount: AdminAccount;
  parentAccounts: ParentAccount[];
  activeSession: AuthSession | null;
  activeChildId: string | null;
  children: ChildProfile[];
  practiceRecords: PracticeRecord[];
  puzzleBank: SudokuPuzzleItem[];
}

export interface ChildProfileInput {
  name: string;
  gradeLevel: GradeLevel;
  avatar?: string;
  smartDifficultyEnabled?: boolean;
}

export interface ParentAccountInput {
  username: string;
  displayName: string;
  password: string;
  enabled?: boolean;
}

export interface ParentAccountUpdate {
  displayName?: string;
  status?: ParentAccountStatus;
}

export interface AdaptiveDifficultyResult {
  nextLevel: number;
  action: "up" | "keep" | "down";
  reason: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt?: string;
}

export interface BadgeRecord extends Badge {
  parentId: string;
  childId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdventureStageProgress {
  parentId: string;
  childId: string;
  level: number;
  stageIndex: number;
  bestStars: number;
  completed: boolean;
  unlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdventureStage {
  level: number;
  stageIndex: number;
  title: string;
  levelName: string;
  levelTitle: string;
  requiredStarsToUnlock: number;
  bestStars: number;
  completed: boolean;
  unlocked: boolean;
  recommended: boolean;
}

export type ViewMode = "selector" | "home" | "adventure" | "practice" | "growth" | "play" | "print" | "settings";
