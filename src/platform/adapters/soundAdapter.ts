export interface SoundAdapter {
  playSuccess(): void;
  playCelebration(): void;
  playThreeStars(): void;
  playLevelUp(): void;
  setEnabled(enabled: boolean): void;
}
