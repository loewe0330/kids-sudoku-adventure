const asset = (path: string) => `/assets/sudoku-adventure/${path}`;

export const sudokuAdventureAssets = {
  common: {
    explorerMascot: asset("common/explorer-mascot.webp"),
    childAvatarBoy: asset("common/child-avatar-boy.webp"),
    woodenSign: asset("common/wooden-sign.webp"),
    explorerBoyWaving: asset("common/explorer-boy-waving.webp"),
    foliageGround: asset("common/foliage-ground.webp"),
    foliageBushes: asset("common/foliage-bushes.webp")
  },
  home: {
    adventureMap: asset("home/adventure-map.webp"),
    goalClearing: asset("home/goal-clearing.webp"),
    sudokuBoard: asset("home/sudoku-board.webp"),
    growthTrophy: asset("home/growth-trophy.webp"),
    secretBookChest: asset("home/secret-book-chest.webp")
  },
  practice: {
    header: asset("practice/practice-header.webp"),
    recommendationMedal: asset("practice/recommendation-medal.webp"),
    recommendationCalendar: asset("practice/recommendation-calendar.webp"),
    customPractice: asset("practice/custom-practice.webp"),
    questionBank: asset("practice/question-bank.webp"),
    printer: asset("practice/printer.webp"),
    tipBanner: asset("practice/tip-banner.webp")
  },
  growth: {
    hero: asset("growth/growth-hero.webp"),
    currentTitleBadge: asset("growth/current-title-badge.webp"),
    starTrophy: asset("growth/star-trophy.webp"),
    completionTarget: asset("growth/completion-target.webp"),
    progressMap: asset("growth/progress-map.webp"),
    recentPerformanceSun: asset("growth/recent-performance-sun.webp"),
    methodLightbulb: asset("growth/method-lightbulb.webp"),
    practiceRecordNotebook: asset("growth/practice-record-notebook.webp")
  },
  settings: {
    titleSign: asset("settings/settings-title-sign.webp"),
    syncStatusPanel: asset("settings/sync-status-panel.webp"),
    music: asset("settings/music.webp"),
    eyeCare: asset("settings/eye-care.webp"),
    vibration: asset("settings/vibration.webp"),
    cloudSync: asset("settings/cloud-sync.webp"),
    reminder: asset("settings/reminder.webp"),
    difficulty: asset("settings/difficulty.webp"),
    rewards: asset("settings/rewards.webp"),
    about: asset("settings/about.webp")
  },
  backgrounds: {
    cardGreen: asset("backgrounds/card-green.webp"),
    cardCream: asset("backgrounds/card-cream.webp"),
    cardSky: asset("backgrounds/card-sky.webp"),
    forestClearing: asset("backgrounds/forest-clearing.webp"),
    softGreen: asset("backgrounds/soft-green.webp")
  }
} as const;
