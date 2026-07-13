import type { SoundAdapter } from "../adapters/soundAdapter";
import type { ChildProfile } from "../../types";
import { playRewardSound } from "../../lib/sound";

const baseSettings = (): ChildProfile["settings"] => ({
  soundEnabled: true,
  immediateErrorFeedback: true,
  showTimer: true,
  practiceMode: "adventure",
  successAnimationEnabled: true,
  reducedMotion: false
});

export const createWebSoundAdapter = (): SoundAdapter => {
  let enabled = true;
  const settings = () => ({ ...baseSettings(), soundEnabled: enabled });

  return {
    playSuccess(): void {
      playRewardSound(settings(), "success");
    },
    playCelebration(): void {
      playRewardSound(settings(), "celebration");
    },
    playThreeStars(): void {
      playRewardSound(settings(), "threeStar");
    },
    playLevelUp(): void {
      playRewardSound(settings(), "levelUp");
    },
    setEnabled(nextEnabled: boolean): void {
      enabled = nextEnabled;
    }
  };
};

export const webSoundAdapter = createWebSoundAdapter();
