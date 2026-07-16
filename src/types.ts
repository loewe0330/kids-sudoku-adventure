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
  fastPass?: FastPassState;
  guidanceUsage?: GuidanceUsage;
  guidanceOperations?: GuidanceConsumptionOperation[];
  spentStars?: number;
  schemaVersion?: number;
  revision?: number;
  deletedAt?: string;
  syncFieldUpdatedAt?: Partial<Record<ChildSyncField, string>>;
}

export type ChildSyncField = "name" | "gradeLevel" | "avatar" | "smartDifficultyEnabled" | "settings";

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
  guidanceUsed?: boolean;
  guidanceSource?: GuidanceSource | null;
  guidanceOperationId?: string;
  submissionCount?: number;
  completed: boolean;
  gaveUp: boolean;
  viewedAnswer?: boolean;
  stars: number;
  mode: PracticeMode;
  source?: PracticeSource;
  stageIndex?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
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
  updatedAt?: string;
  deletedAt?: string;
}

export type SyncEntityType = "child" | "practiceRecord" | "puzzle";

export interface SyncTombstone {
  entityType: SyncEntityType;
  id: string;
  parentId: string;
  childId?: string;
  deletedAt: string;
}

export interface AppStorage {
  adminAccount: AdminAccount;
  parentAccounts: ParentAccount[];
  activeSession: AuthSession | null;
  activeChildId: string | null;
  children: ChildProfile[];
  practiceRecords: PracticeRecord[];
  puzzleBank: SudokuPuzzleItem[];
  schemaVersion?: number;
  revision?: number;
  syncTombstones?: SyncTombstone[];
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

export type GuidanceSource = "free" | "star";

export interface GuidanceUsage {
  date: string;
  freeUsed: number;
  paidUsed: number;
}

export interface GuidanceConsumptionOperation {
  id: string;
  puzzleId: string;
  source: GuidanceSource;
  businessDate: string;
  createdAt: string;
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
  fastPassValidated?: boolean;
}

export interface FastPassQuestionResult {
  questionIndex: number;
  level: number;
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  startedAt: string;
  finishedAt: string;
  errors: number;
  hintsUsed: number;
  elapsedSeconds: number;
  completed: boolean;
  gaveUp: boolean;
  viewedAnswer: boolean;
  passed: boolean;
}

export interface FastPassAttempt {
  id: string;
  targetLevel: number;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  results: FastPassQuestionResult[];
  passed: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface FastPassState {
  attempts: FastPassAttempt[];
  highestPassedLevel?: number;
  validatedSkipLevels?: number[];
  updatedAt?: string;
}

export type ViewMode = "selector" | "home" | "adventure" | "fast-pass" | "practice" | "growth" | "play" | "print" | "settings";
